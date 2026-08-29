---
name: hhvc-ship-workflow
description: "Systematically ship feature work from branch through PR review, feedback coordination, merge blockers resolution, and live deployment verification. Use this skill when 'Use this skill when shipping a feature branch to production: opening a PR, coordinating review feedback with fixes, merging to main, verifying the live deployment, and identifying follow-up work.'"
trigger: "'Use this skill when shipping a feature branch to production: opening a PR, coordinating review feedback with fixes, merging to main, verifying the live deployment, and identifying follow-up work.'"
author: arrizon.david
source_sessions:
  - arrizon.david_arrizon.david's Organization_default_37db7d7e-7886-454d-b6f7-5b1262b7494d
  - arrizon.david_arrizon.david's Organization_default_acd2a71a-79ac-46df-9176-9d9b399e830a
  - arrizon.david_arrizon.david's Organization_default_8e274d7b-ecd5-4de4-aed9-a8bee5db8352
  - arrizon.david_arrizon.david's Organization_default_591e2ce2-18b8-4b5b-a127-384f48139998
contributors:
  - arrizon.david
version: 2
created_by_agent: claude_code
created_at: 2026-08-25T15:00:20.634Z
updated_at: 2026-08-29T23:41:18.556Z
---

# HHVC Ship Workflow

Ship feature work systematically from feature branch through PR review, feedback coordination, merge, and live deployment verification.

## When to Use This Skill

Use this skill when:

- You have a feature branch ready to merge to `main`
- Managing a PR through review feedback and multiple fix cycles
- Merging to `main` and verifying the live deployment
- Coordinating design decisions with review bot feedback
- Your merge is blocked or another session has edited your branch

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

### 5. Verify the Live Deployment

Verify **at the live artifact**, not the build logs:

```sh
# Status code
curl -I https://hhvc-manager-review.netlify.app/
# HTTP 200 expected

# Proxy endpoint (protected — should 401 without token)
curl -I https://hhvc-manager-review.netlify.app/api/ai/generate
# HTTP 401 expected
```

Also check:

- **Deployed commit**: Verify the bundle contains a string or behavior unique to the merged commit
- **Console**: No new errors (pre-existing ones don't count as regression)
- **Smoke test**: Run through at least one critical user flow

### 6. Local/Remote Sync

After merge, sync local `main` to remote:

```sh
git fetch origin
git reset --hard origin/main
```

### 7. Retrospective: Follow-Up Work

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

### Verifying Real Artifact State

CI passing does not guarantee the deployed version works. Always verify beyond the logs:

```bash
# Check the deploy preview loads
curl -I https://deploy-preview-<n>--hhvc-manager-review.netlify.app/
# HTTP 200 expected

# Verify code presence for renames or deletions
git show origin/<branch>:src/file.ts | grep "expected_string"

# Smoke test: run one critical user flow on the preview
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

## Example: Multi-Cycle Review with Blockers

If a PR requires multiple fix cycles and encounters a merge blocker:

1. Receive feedback → fix → `bun run verify` → push → CI re-runs
2. Workflow approval needed: click "Approve and run workflows"
3. Verify deploy preview renders correctly
4. Another session added commits: `git log HEAD` to review, run `bun run verify`, merge if compatible
5. All fixed or declined with reasoning → merge → verify live deployment

Each cycle re-verifies locally before push. Never merge with red CI or unresolved findings.
