---
name: hhvc-shared-checkout-coordination
description: "Safely coordinate work across multiple concurrent sessions in a shared git checkout; diagnose collision causes, communicate intent, and avoid silent HEAD moves. Use this skill when multiple sessions are working in the same checkout, you need to diagnose an unexpected HEAD movement, or you're about to perform a destructive operation (reset, checkout, branch deletion) on shared state."
trigger: "Use this skill when multiple sessions are working in the same checkout, you need to diagnose an unexpected HEAD movement, or you're about to perform a destructive operation (reset, checkout, branch deletion) on shared state."
author: arrizon.david
source_sessions:
  - arrizon.david_arrizon.david's Organization_default_c4abe091-761a-45a0-93f8-0e6295766e4a
  - arrizon.david_arrizon.david's Organization_default_acd2a71a-79ac-46df-9176-9d9b399e830a
  - arrizon.david_arrizon.david's Organization_default_6a758eaf-4166-4b4c-ac89-ed89426edc77
  - arrizon.david_arrizon.david's Organization_default_5e5c87b5-b68c-4201-b4fd-aec6e80a7d75
  - arrizon.david_arrizon.david's Organization_default_e7a876c8-b35b-4593-ad3e-860f65882f7a
contributors:
  - arrizon.david
version: 1
created_by_agent: claude_code
created_at: 2026-08-30T23:48:51.265Z
updated_at: 2026-08-30T23:48:51.265Z
---

## Multi-Session Coordination in a Shared Checkout

When multiple agents or developers work in the same checkout, silent collisions are the default. This skill provides a framework to diagnose what happened, communicate intent, and avoid moving another session's HEAD.

### When to Use This Skill

Use this skill when:

- Multiple sessions are active in the same git checkout
- You see an unexpected HEAD movement or branch state change
- You need to perform a destructive git operation (checkout, reset, branch -D, branch -f)
- You're about to run `gh pr merge --delete-branch` in a shared tree
- You want to know which worktrees are live and which session owns them

### 1. Diagnose with reflog, not git status

When HEAD moved unexpectedly:

```bash
git reflog -n 20  # Show the last 20 moves
```

Read reverse-chronologically. Each line shows _what moved the ref and why_:

```console
14:28:34  checkout: docs/branch → ci/fix
14:35:15  checkout: ci/fix → main
14:45:13  checkout: main → docs/branch
```

The reflog names the exact move and time, while `git status --short` looks clean. Reflog is authoritative.

### 2. Measure divergence before deciding

```bash
git rev-list --left-right --count main...origin/main
# Output: "1 2" = 1 commit in main not in origin/main, 2 the other way
```

Both numbers matter: if local is 0 ahead / 2 behind, its commits are reachable from origin and safe to discard if that's the intent.

### 3. Message every active session before destructive operations

If multiple sessions might be in the tree, state your intent:

```
I'm about to reset local main to origin/main.
Local main is 13fcd97 (the Transaction CMS audit).
That commit is also on docs/karl-transaction-compliance and on GitHub,
so nothing is at risk.
Does anyone have uncommitted work in the shared checkout?
```

Wait for replies. A session that doesn't answer counts as a "no" only after reasonable time.

### 4. Use `git branch -f` instead of `git checkout` to move refs

Both move a branch, but one leaves another session's tree undisturbed:

```bash
# Moves the ref only — working tree stays put
git branch -f main origin/main

# Moves the working tree — yanks it out from under another session
git checkout main
```

In a shared checkout, prefer `-f`.

### 5. Understand `gh pr merge --delete-branch` as a two-step

```bash
gh pr merge                # Merges the PR, then:
                           #   git checkout main
                           #   git branch -D feat/fix
```

The `checkout main` happens automatically. If you don't expect it, you'll find yourself on `main` instead of your next branch.

### 6. Coordinate around worktrees

Worktrees are isolated — no collision possible. Before deleting or moving one:

```bash
git worktree list
# /home/user/repo       (main)
# /home/user/wt-feature (feat/feature) ← live and in use
```

Ask the owner before touching it. A process can outlive its directory (orphaned but still running), so it won't error; it's just worth knowing.

### 7. Record your intent: "I own this branch"

When a session takes a branch, state it:

```
Taking the shared checkout to docs/karl-field-map-refresh.
feat/prototype-to-real is live in ../wt-prototype and I'm still working in it.
Please leave that worktree and branch ref alone.
```

### Gotchas

- **`gh pr merge --delete-branch` parks you on main silently** — expect it, don't be surprised.
- **Reflog is per-repo, shared by all sessions and worktrees** — both the shared checkout and worktrees see the same reflog. Each has its own index and working tree, so collisions don't happen across worktrees.
- **A process can outlive its directory** — if a vite dev server runs in a worktree and the directory is deleted, the process keeps running with its cwd unlinked. `git worktree prune` cleans it up when the process exits.
- **Stale local refs persist after remote deletions** — run `git fetch --prune` after a peer deletes a remote branch.
- **Squash merges never have "0 ahead" after the merge** — the squash commit is not the branch's commit. Don't read commit counts as evidence of unmerged work; use PR status or code lookup instead.

### Example: Diagnosing the Unexpected Move (from HHVC)

```console
Observation:  HEAD moved from main to docs/karl-transaction-compliance
              while I was measuring divergence.

Step 1: reflog
$ git reflog -n 10
3b93a60 HEAD@{14:45:34}: merge origin/main
13fcd97 HEAD@{14:45:13}: checkout: moving from main to docs/karl-transaction-compliance
8fd1fdf HEAD@{14:35:15}: checkout: ci/fix-feature to main

Diagnosis: At 14:45:13, someone checked out docs/karl-transaction-compliance.
           At 14:45:34, they merged origin/main into it.

Step 2: Measure
$ git rev-list --left-right --count main...origin/main
1  2

Conclusion: Branch was intentionally updated. Message that session to confirm.
```

After confirmation:

```bash
git branch -f main origin/main
git fetch --prune
```
