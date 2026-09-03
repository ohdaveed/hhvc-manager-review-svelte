---
name: hhvc-ship-workflow
description: "Systematically ship feature work from branch through PR review, merge, post-merge environment synchronization, and deployment verification. Use this skill when 'Use this skill when shipping a feature branch to production: opening a PR, coordinating review feedback with fixes, merging to main, verifying the live deployment, and identifying follow-up work.'"
trigger: "'Use this skill when shipping a feature branch to production: opening a PR, coordinating review feedback with fixes, merging to main, verifying the live deployment, and identifying follow-up work.'"
author: arrizon.david
source_sessions:
  - arrizon.david_arrizon.david's Organization_default_37db7d7e-7886-454d-b6f7-5b1262b7494d
  - arrizon.david_arrizon.david's Organization_default_acd2a71a-79ac-46df-9176-9d9b399e830a
  - arrizon.david_arrizon.david's Organization_default_8e274d7b-ecd5-4de4-aed9-a8bee5db8352
  - arrizon.david_arrizon.david's Organization_default_591e2ce2-18b8-4b5b-a127-384f48139998
  - arrizon.david_arrizon.david's Organization_default_e7a876c8-b35b-4593-ad3e-860f65882f7a
  - arrizon.david_arrizon.david's Organization_default_25b29e61-75cd-4d31-af6e-26a6fe717f3e
contributors:
  - arrizon.david
version: 3
created_by_agent: claude_code
created_at: 2026-08-25T15:00:20.634Z
updated_at: 2026-08-30T06:56:35.104Z
---

# HHVC Ship Workflow

Ship feature work systematically from feature branch through PR review, feedback coordination, merge, post-merge environment sync, and live deployment verification.

## When to Use This Skill

Use this skill when:

- You have a feature branch ready to merge to `main`
- Managing a PR through review feedback and multiple fix cycles
- Merging to `main` and verifying the live deployment
- Coordinating design decisions with review bot feedback
- Your merge is blocked or another session has edited your branch
- Synchronizing staging databases and environment variables after merge

## The Ship Sequence

### 1. Pre-Merge: Local Verification

```sh
bun run verify
```

Confirms:

- Unit tests pass (count renders as a concrete number, not `(? passed)`)
- Production build succeeds
- No regressions in local gates

Failures here block PR creation.

### 2. Open the PR and Monitor CI

```sh
gh pr create
```

Monitor:

- **Required status checks** (`test & build`, `e2e`) per repo ruleset
- **Netlify deploy preview** (https://deploy-preview-<n>--hhvc-manager-review.netlify.app)
- **Review bot findings** (CodeRabbit, Qodo) that post automatically

Do not proceed until CI is green. If merge is blocked, see Troubleshooting below.

### 3. Address Review Feedback: Fix or Decline

For each review thread, decide: **Fix or Decline**.

**Fix:** Apply the suggested change, re-run `bun run verify` locally, push to the same branch. CI re-runs automatically.

**Decline:** Explain why you're not taking it. Cite evidence: corpus measurement, schema constraints, sequencing gates, or backend compatibility. Leave the thread active for the owner to overrule.

Key principle: Show reasoning, not deference. Not all feedback fits the design.

### 4. Merge and Deploy

When CI is green and all findings are fixed or explicitly declined:

```sh
gh pr merge <n> --squash
```

This squash-merges the branch into `main` (one commit) and triggers the Netlify deploy automatically.

### 5. Post-Merge: Synchronize Environments

The merge auto-applies Supabase migrations to **production only**. Staging must be synced manually or deploy previews fall out of sync with the live schema. Environment variables with multiple contexts also require separate updates.

#### 5a. Sync Staging Database (if migrations were included)

Because the Supabase link is checkout-wide mutable state, perform this entire
operation in a **dedicated worktree** that no other session uses. Do not run it
in a shared checkout: a separate worktree makes the link metadata (including
project-specific connection and service metadata) isolated and prevents a
concurrent relink from redirecting the push.

```sh
project_ref="aplbsgacqnxhzjuquvft"   # staging
supabase link --project-ref "$project_ref"
ref_file="supabase/.temp/project-ref"
test "$(cat "$ref_file")" = "$project_ref" || { echo "Not linked to staging; refusing to push" >&2; exit 1; }
supabase db push
supabase migration list
```

The `test` is not ceremony: a `db push` against the wrong ref is a production
schema change nobody ran a command for. Dispose of the dedicated worktree when
finished rather than restoring link metadata in a checkout that may be shared.

**Why:** The Supabase GitHub App integration applies migrations to production (`kiynekyzqxneepjipqhg`) on merge. Staging (`aplbsgacqnxhzjuquvft`) is not covered, so deploy previews render against stale schema. This breaks when pages are renamed, views are added, or table columns change.

Verify with **both** checks — they catch different failures:

```sh
supabase db remote diff     # schema drift: staging's shape vs the migrations
supabase migration list     # history alignment: which versions each side records
```

`migration list` is the one that catches a hand-applied migration. Measured
2026-09-03: staging carried the re-key change under an auto-generated version
`20260831000316` while the repo names it `20260830120000`. The schema was
correct and `remote diff` was clean, but `db push` refused with
`LegacyDbPushMissingLocalError` and staging could receive **no** further
migration. Repair records the repo's version as applied and drops the
duplicate, without re-running any SQL:

```sh
supabase migration repair --status applied  <repo-version>
supabase migration repair --status reverted <stray-version>
```

Read `schema_migrations.statements` for an unknown remote version before
repairing it. Marking a change you have not identified as reverted is how you
lose track of one.

#### 5b. Sync Multi-Context Environment Variables (if credentials changed)

Netlify variables with multiple contexts (`production`, `deploy-preview`, `branch-deploy`) do not sync automatically. `RAILWAY_API_TOKEN` has three separate contexts; updating production does not update previews.

`--secret` is **not sticky across a set**: omitting it silently downgrades a
secret variable to readable, and `netlify env:get` returns a mask either way so
the downgrade is invisible afterwards.

```sh
netlify env:set RAILWAY_API_TOKEN <new-value> --secret --context production
netlify env:set RAILWAY_API_TOKEN <new-value> --secret --context deploy-preview
netlify env:set RAILWAY_API_TOKEN <new-value> --secret --context branch-deploy
```

**Why:** The Netlify UI shows one context at a time. Secret variables do not expose `updated_at` timestamps, so you cannot verify whether the old value persists without hitting the backend service.

Verify secret updates by calling the service that uses it (e.g., hit `/api/ai/generate` and check for 401 vs 200/400 response — 401 means old token, 400 on a valid request means new token accepted).

### 6. Verify the Live Deployment

Verify **at the live artifact**, not the build logs:

```sh
curl -I https://hhvc-manager-review.netlify.app/
# HTTP 200 expected

curl -I https://hhvc-manager-review.netlify.app/api/ai/generate
# HTTP 401 expected (unauthenticated proxy call)
```

Also check:

- **Deployed commit**: Verify `/_app/version.json` contains the merged commit SHA
- **Console**: No new errors (pre-existing ones don't count as regression)
- **Smoke test**: Run through at least one critical user flow
- **Staging**: If this merge included a schema change, confirm staging sync actually applied before relying on deploy previews

### 7. Local/Remote Sync

After merge, sync local `main` to remote:

```sh
git fetch origin
git reset --hard origin/main
```

### 8. Retrospective: Follow-Up Work

After a successful deploy, assess and document:

1. **Critical paths** — blocking work for dependent features
2. **Loose threads** — pre-existing gaps this PR exposed
3. **Cheap wins** — low-effort, high-impact cleanups (lint red, unused deps, dead code)
4. **Deferred findings** — review feedback you declined with visible reasoning

## Troubleshooting: Merge Blockers and Concurrent Edits

### Merge Blocked by Ruleset Gate

Merges can be blocked by GitHub ruleset requirements, not just CI failures.

```console
mergeStateStatus: BLOCKED     mergeable: MERGEABLE
```

Check what's required:

```bash
gh pr checks <n>
```

On this project, `main: require CI` (ruleset `21203092`) requires `test & build` and `e2e` to pass. Both must run. If they show `action_required` with zero jobs, see "Bot-Pushed Workflows Require Approval" below.

### Bot-Pushed Workflows Require Approval

When a bot (Copilot, automation, etc.) pushes to a branch, GitHub gates the workflow behind manual approval:

```console
triggering_actor: Copilot
status: action_required
```

**Unblock**: Click **"Approve and run workflows"** on the PR's checks tab. Alternatively, push a commit under your own account to re-trigger with a human actor.

### Handling Concurrent Session Commits

If another session edited your branch:

1. **Check the new commits**: `git log origin/main..HEAD --oneline`
2. **Review their content**: `git show <sha>` for each new commit
3. **Verify they're yours or compatible**: Concurrent sessions may have committed unrelated fixes or changes
4. **After sync**: Run `bun run verify` to confirm no breakage
5. **If conflicts**: Ask the other session or use `git revert` (requires a new commit, then push again)

Example from this project: two concurrent sessions edited `fix/karl-button-cap`, one committed the button cap fix, the other deleted tooling files — both landed in the same PR and needed unified verification before merge.

### Staging Falls Behind After Merge

If deploy previews are broken or missing after a merge, check if staging is in sync:

```sh
supabase link --project-ref aplbsgacqnxhzjuquvft
supabase db remote diff
```

If output shows pending migrations, run step 5a before re-deploying previews.

### Verifying Real Artifact State

CI passing does not guarantee the deployed version works. Always verify beyond the logs:

```bash
curl -I https://deploy-preview-<n>--hhvc-manager-review.netlify.app/
# HTTP 200 expected

git show origin/<branch>:src/file.ts | grep "expected_string"
```

## Gotchas

- **Branch protection**: Direct push to `main` is refused. The PR → CI → merge workflow is required.
- **Netlify auto-deploys on merge to `main`** — confirm your fix is production-ready before merging.
- **Local `main` can drift** if other sessions move the ref. Always `git reset --hard origin/main` after merge.
- **Squash merge loses granular history** — check reflog if you need per-commit recovery.
- **`bun run verify` is trustworthy only from `819d914` onward** — earlier versions reported green even on test failure.
- **Review feedback doesn't require acceptance** — explain non-obvious decisions with evidence so the owner can review the reasoning.
- **Commit messages may be mislabeled by concurrent sessions** — verify author and message intent before merge.
- **Workflow approval gates are GitHub security, not a build failure** — bot-pushed branches require manual approval even if CI would pass.
- **Supabase migrations apply to production only** — staging needs manual sync or deploy previews break silently.
- **Netlify env var contexts don't sync automatically** — multi-context variables (like `RAILWAY_API_TOKEN`) require separate updates per context, and old values persist invisibly.
- **Secret value updates cannot be verified by reading the env var** — test by calling the backend service, not by checking Netlify's API.

## Example: Multi-Cycle Review with Post-Merge Schema Changes

If a PR requires multiple fix cycles and includes database migrations:

1. Receive feedback → fix → `bun run verify` → push → CI re-runs
2. Workflow approval if needed: click "Approve and run workflows"
3. Verify deploy preview renders correctly
4. Merge when all feedback is fixed or declined with reasoning
5. Sync staging: `supabase link --project-ref aplbsgacqnxhzjuquvft && supabase db push`
6. Confirm staging: `supabase db remote diff` AND `supabase migration list` both clean
7. Verify live deployment: curl the endpoint, check console, run a user flow
8. If env vars changed, update all Netlify contexts and verify by calling the backend

Each cycle re-verifies locally before push. Never merge with red CI or unresolved findings.
