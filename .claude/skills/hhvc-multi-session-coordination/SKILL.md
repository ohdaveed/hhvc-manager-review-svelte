---
name: hhvc-multi-session-coordination
description: "Safely operate in a shared git checkout with concurrent sessions by detecting activity, choosing non-disruptive operations, and coordinating branch moves. Use this skill when multiple sessions share a git checkout, you need to move branches or HEAD, you detect unexpected ref changes, or you're about to run a destructive operation while peers may be active."
trigger: "Use this skill when multiple sessions share a git checkout, you need to move branches or HEAD, you detect unexpected ref changes, or you're about to run a destructive operation while peers may be active."
author: arrizon.david
source_sessions:
  - arrizon.david_arrizon.david's Organization_default_5e5c87b5-b68c-4201-b4fd-aec6e80a7d75
  - arrizon.david_arrizon.david's Organization_default_c4abe091-761a-45a0-93f8-0e6295766e4a
contributors:
  - arrizon.david
version: 1
created_by_agent: claude_code
created_at: 2026-09-03T04:12:02.919Z
updated_at: 2026-09-03T04:12:02.919Z
---

# Multi-Session Git Coordination

When multiple Claude sessions share a single git checkout, operations that move branches, HEAD, or working trees can collide silently with peer work. This skill provides a workflow for detecting concurrent activity, choosing safe git operations, and coordinating before destructive moves.

## When to Use This Skill

Use this skill when:

- Multiple sessions are active in the same checkout
- You need to move a branch ref or HEAD and other sessions may be working
- A branch or HEAD position changed unexpectedly
- You're about to run `git reset`, `git checkout`, `git clean`, or `git push --force` in a shared tree
- You need to isolate work from concurrent activity
- You want to understand what another session did

## The Workflow

### 1. Check who else is active

```bash
git worktree list
# Shows each session's working tree and branch

git status --short
# Untracked files may belong to peers — don't clean them
```

### 2. Detect unexpected movements

When a branch or HEAD changes unexpectedly, use reflog to trace it:

```bash
git reflog -10 --all
# Read bottom-to-top: oldest to newest
# Look for: "checkout: moving from X to Y", "merge origin/main", "commit: ..."
```

### 3. Identify which session moved a ref

Reflog shows WHAT happened but not WHO. Correlate with:

```bash
git log -1 --format=%ai <branch>     # When was it last touched?
git log --oneline <branch> | head    # By whom, and for what?
git worktree list                    # Which session is on that branch now?
```

Then message other sessions (if in a multi-session environment) to confirm intent before acting.

### 4. Choose safe operations

**UNSAFE: `git checkout main` in a shared tree**
Moves HEAD AND the working tree. If another session is on a different branch, this yanks the tree out from under them.

**SAFE: `git branch -f main origin/main`**
Moves the ref only, not HEAD or working tree. Other sessions on different branches are unaffected.

**Example: Moving a ref safely**

```bash
git branch -f main origin/main  # Updates ref without touching tree/HEAD
# vs.
git checkout main              # DANGEROUS: moves HEAD + working tree
```

### 5. Wait before destructive operations

Before `git reset --hard`, `git clean -f`, `git branch -D`, or `git push --force`:

1. Show evidence: commits at risk, current state, who might be affected
2. Message other sessions with the plan
3. Wait for confirmation
4. Act only after confirmation or certainty

### 6. Use isolated worktrees for concurrent work

When multiple sessions need simultaneous work:

```bash
git worktree add ../wt-feature -b feat/feature origin/main
cd ../wt-feature
# Work independently — no branch conflicts

git worktree remove ../wt-feature  # Clean up when done
```

Each session gets its own branch and working tree. No collisions.

### 7. Protect peer work

Untracked files and directories likely belong to other sessions:

```bash
git status --short
# ??: files/dirs with ?? are untracked

# Don't commit, delete, or clean them unless they're yours
```

## Gotchas

- **`git checkout` is unsafe in shared trees** — it moves both HEAD and the working tree, potentially yanking files out from under peer work
- **Reflog is per-ref** — `git reflog main` shows main's history only; use `git reflog --all` to see activity across all refs
- **Working tree checkout is locked** — if another session is on branch X, you cannot check out X in the shared tree
- **Untracked files survive git operations** — cleaning them requires `git clean`, which is destructive; never do it without confirming they're yours
- **Branch deletions are immediate** — `git push origin --delete` is synchronous; the ref vanishes and local tracking refs go stale
- **Worktree state persists** — deleting a worktree directory without `git worktree remove` leaves a stale `.git/worktrees/` entry that blocks future work on that branch
- **Messages between sessions can fail or arrive out of order** — don't rely on a single message; use reflog to verify state yourself

## Example: Detecting and Coordinating a Branch Move

1. **Detect unexpected state**: Local `main` shows 1 ahead / 2 behind `origin/main` (expected: 0/0).

2. **Use reflog to find what happened**:

   ```console
   3b93a60 HEAD@{14:45:34}: merge origin/main
   13fcd97 HEAD@{14:45:13}: checkout: moving from main to docs/karl-transaction-compliance
   ```

   A session checked out `docs/karl-transaction-compliance` and merged `origin/main` into it.

3. **Message other sessions**: Confirm the move was intentional and which session did it.

4. **Act safely**: Use `git branch -f main origin/main` instead of `git checkout main` — moves the ref without disturbing the working tree or other sessions.
