---
name: hhvc-ship-workflow
description: 'Systematically ship feature work from branch through PR review, feedback coordination, merge, and live deployment verification. Use when you have a feature branch ready to merge and need to manage the complete production ship cycle. Use this skill when shipping a feature branch to production: opening a PR, coordinating review feedback with fixes, merging to main, verifying the live deployment, and identifying follow-up work.'
trigger: 'Use this skill when shipping a feature branch to production: opening a PR, coordinating review feedback with fixes, merging to main, verifying the live deployment, and identifying follow-up work.'
author: arrizon.david
source_sessions:
  - arrizon.david_arrizon.david's Organization_default_37db7d7e-7886-454d-b6f7-5b1262b7494d
contributors:
  - arrizon.david
version: 1
created_by_agent: claude_code
created_at: 2026-08-25T15:00:20.634Z
updated_at: 2026-08-25T15:00:20.634Z
---

# HHVC Ship Workflow

Ship feature work systematically from feature branch through PR review, feedback coordination, merge, and live deployment verification.

## When to Use This Skill

Use this skill when:

- You have a feature branch ready to merge to `main`
- Managing a PR through review feedback and multiple fix cycles
- Merging to `main` and verifying the live deployment
- Coordinating design decisions with review bot feedback

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

Do not proceed until CI is green.

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

## Gotchas

- **Branch protection**: Direct push to `main` is refused. The PR → CI → merge workflow is required.
- **Netlify auto-deploys on merge to `main`** — confirm your fix is production-ready before merging.
- **Local `main` can drift** if other sessions move the ref. Always `git reset --hard origin/main` after merge.
- **Squash merge loses granular history** — check reflog if you need per-commit recovery.
- **`bun run verify` is trustworthy only from `819d914` onward** — earlier versions reported green even on test failure.
- **Review feedback doesn't require acceptance** — explain non-obvious decisions with evidence so the owner can review the reasoning.

## Example: Multi-Cycle Review

If a PR requires multiple fix cycles:

1. Receive feedback → fix → `bun run verify` → push → CI green
2. Receive additional feedback → fix → `bun run verify` → push → CI green
3. All fixed or declined with reasoning → merge

Each cycle re-verifies locally before push. Never merge with red CI or unresolved findings.
