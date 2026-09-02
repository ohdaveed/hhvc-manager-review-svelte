---
name: hhvc-branch-verification
description: 'Post-merge branch lifecycle verification: categorizing branches by merge status, verifying code presence on main, handling multi-commit sequences, coordinating isolated worktrees, and safely cleaning up stale remotes. Use this skill when identifying which branches are safe to delete after a merge wave, verifying whether bot-proposed fixes actually landed (including via cherry-picks or squash merges), or coordinating multi-PR sequences without losing work or authorship.'
trigger: "'Use this skill when identifying which stale or closed branches are safe to delete, verifying whether bot-proposed fixes actually landed in main, or cleaning up branch clutter after a merge sequence.'"
author: arrizon.david
source_sessions:
  - arrizon.david_arrizon.david's Organization_default_d142db57-955c-422e-acb5-22f5e91586f9
  - arrizon.david_arrizon.david's Organization_default_5e5c87b5-b68c-4201-b4fd-aec6e80a7d75
  - arrizon.david_arrizon.david's Organization_default_acd2a71a-79ac-46df-9176-9d9b399e830a
  - arrizon.david_arrizon.david's Organization_default_6a758eaf-4166-4b4c-ac89-ed89426edc77
contributors:
  - arrizon.david
version: 2
created_by_agent: claude_code
created_at: 2026-08-27T01:45:56.679Z
updated_at: 2026-09-01T08:42:19.728Z
---

# HHVC Post-Merge Branch Cleanup and Multi-Commit Coordination

After a merge sequence (especially with review-bot branches or multi-commit PRs), stale branches accumulate and complex commit dependencies emerge. This skill provides a systematic way to verify whether fixes landed, coordinate multi-commit merges, preserve authorship, and clean up safely.

## When to Use This Skill

Use this skill when:

- You have multiple branch candidates for deletion after a merge wave
- A review-bot or peer proposed fixes in closed (unmerged) branches and you need to verify they landed
- A single branch carries multiple commits that landed via different routes (cherry-pick, squash, direct)
- You need to land one commit from a multi-commit branch while deferring others
- Managing post-merge cleanup when you have open decisions about what stays/goes
- Coordinating multiple PRs without moving branches out from under a peer's active checkout

## The Verification Process

### 0. Prune first, before counting anything

```sh
git fetch --prune
```

Measured 2026-08-28: a list of "13 stale branches" became 8 on the first prune. Every merged PR's branch had already been auto-deleted on the remote, so `git branch -r` was reporting stale tracking refs rather than repository branches. Categorizing before pruning means investigating branches that do not exist.

### 1. Categorize by merge status and commit count

For each branch, measure divergence from main:

```sh
git rev-list --left-right --count main...origin/<branch>
# Output: "2 5" = 2 commits in main not in branch, 5 in branch not in main
```

Also check PR status:

```sh
branch="<branch>"
gh pr list --head "$branch" --state all --json state,mergedAt,number
```

**Categories:**

- **Merged, 0 ahead:** PR merged, all content in main → **DELETE**. (Empty in squash-merge repos: the squash commit is not the branch's commit, so merged branches are always "ahead".)
- **Closed PR, commits ahead:** Intended cherry-pick lifecycle → **VERIFY step 2**
- **No PR, commits ahead:** Real unmerged work → **KEEP**

### 2. Verify code presence (squash-merge and cherry-pick cases)

Squash merges and cherry-picks erase commit identity. The fix may have landed in reworked form, been integrated via a different route, or targeted code never added.

**Start with the whole-branch question, not a per-file grep.** One number answers
"does this branch contain anything main lacks", without guessing which file or
which string carries the evidence:

```sh
git diff --numstat origin/main...<branch> | awk '{ins+=$1} END {print ins+0}'
# 0 = the branch adds nothing main lacks -> safe to delete
```

**Note the THREE dots.** Three-dot diffs from the merge base, answering "what has
this branch added since it diverged". Two dots compares the two tips, so every
line main changed _after_ the branch diverged counts as branch content. Measured
2026-09-01 on three refs fully contained in `origin/main`:

| ref       | contained | two-dot insertions | three-dot |
| --------- | --------- | ------------------ | --------- |
| `90a82e3` | yes       | 1576               | 0         |
| `b86a803` | yes       | 1477               | 0         |
| `fe3f224` | yes       | 1847               | 0         |

Two-dot says DO NOT DELETE for three branches that are provably safe. It reads
clean only when the branch is already current with main — which is not the case
this skill is for. A stale branch is exactly where it over-reports.

Read insertions only. Deletions mean the branch is _behind_ main, which is
expected and not a reason to keep it: a clean branch showed `172 deletions, 0
insertions` purely because its local ref predated an `update-branch`.

Then, only if the count is non-zero and you need to know _what_:

```sh
# What the branch proposes, and whether main carries it.
# `git show` EXITS NON-ZERO when the path is absent on that side -- a diff built
# on it reads the failure as a difference. Confirm the path exists on both sides
# before trusting a comparison built this way.
git show origin/<branch>:src/file.ts | grep -A5 "fix_code"
git show origin/main:src/file.ts | grep -c "evidence"

# If no direct match, search by behavior or functionality
git log origin/main -S "search_term" --oneline | head

# Check PR history for this branch
gh pr list --head "<branch>" --state all --json number,mergedAt,commits
# If merged, check which commit hashes landed via git log
```

**Authorship cannot tell you who wrote a branch here.** Every session commits as
the same git identity, so `git log --author` cannot distinguish them. Ask the
session, or read its transcript.

> **Three checks in one day returned a plausible number while measuring the
> wrong thing**: a table pipe-count that passed while the content moved, a
> `git show` against a path that did not exist on one side, and the two-dot diff
> above. Each was caught by someone re-measuring, never by the check failing. A
> verification whose failure mode is indistinguishable from its pass is worse
> than no verification, because it is trusted. Prove a new check fails when it
> should before relying on it.

**Outcomes:**

| Result                                              | Decision                      |
| --------------------------------------------------- | ----------------------------- |
| Fix present on main (possibly reworked or squashed) | **DELETE**                    |
| Targets code that doesn't exist                     | **DELETE**                    |
| Fix genuinely absent, problem open                  | **CHERRY-PICK or OPEN ISSUE** |
| Commit landed via different PR                      | **DELETE**                    |

### 3. Handle multi-commit branches with selective landing

When a branch carries multiple commits but only some are ready:

```sh
# Inspect each commit
git log --oneline origin/<branch> | head -10

# Check what each commit touches
for sha in $(git log --oneline origin/<branch> | awk '{print $1}'); do
  echo "$sha:"
  git show --stat "$sha" | head -8
done

# Cherry-pick only the ready commits, preserving authorship
git cherry-pick --allow-empty -x <sha1> <sha2>
# The -x flag adds a note: "(cherry picked from commit ...)" so the original is citable
```

When landing a cherry-pick from a peer's work:

```sh
# Use --author to preserve original authorship
git cherry-pick --author="Original Author <email>" <sha>

# Verify authorship before pushing
git log --format="%an <%ae>" -1
```

**Do not cherry-pick changes you haven't fully evaluated.** Read the commit diff, verify the ratchet or tests catch it, and test in isolation before opening a PR.

### 4. Coordinate multi-PR sequences with isolated worktrees

When multiple PRs depend on sequencing or a peer is actively working in the shared checkout:

```sh
# Create an isolated worktree for your work
git worktree add ../wt-<groupname> -b feat/<groupname>
cd ../wt-<groupname>
# Implement, test, commit, push, open PR
gh pr create --...

# When done, exit and remove
cd ..
git worktree remove ../wt-<groupname>
```

**Why isolated worktrees matter:** Moving a branch that's checked out in another worktree is invisible until they try to pull or push. Worktrees enforce the isolation — you cannot accidentally conflict.

**Before removing a worktree, verify what was left unmerged:**

```sh
git diff --name-only main...HEAD
```

If unmerged changes exist, decide before deleting: are they landing in this PR, deferred, or abandoned?

### 5. Decide what stays and what goes

Build your groups and categorize the rest:

**Group A — merged, clearly landed:**

```sh
git push origin --delete feat/sfds-v4-scoped chore/pr-ci fix/verify-exit-status
```

**Group B — closed PR, fix verified landed (check step 2):**

```sh
git push origin --delete fix/remediation-bot-1 fix/remediation-bot-3
git fetch --prune
```

**Group C — multi-commit with partial landing:**
Run step 3 first; only delete after landing the ready commits.

**Group D — genuine absences, peer's active work:**
Make explicit decision: cherry-pick, open new issue, or document why deferring. Never delete a branch someone is actively working in without talking to them first.

### 6. Clean up local refs after remote deletions

```sh
# Delete local tracking branches
git branch -d local1 local2 local3

# After remote pushes, clean stale tracking refs
git fetch --prune

# Verify the count
git branch -r | wc -l
```

## Gotchas

- **Squash merges erase commit identity** — bot's exact SHA won't appear on main. Search by code/logic instead.
- **Commit counts mislead on age** — a 4-week-old branch can have "0 ahead" if main moved past it. Trust `git rev-list` counts.
- **Bot branches have standard lifecycle** — closed (not merged) is normal for cherry-pick-intended work. Don't assume closure means abandoned.
- **Stale local tracking refs persist** — run `git fetch --prune` after remote deletions.
- **`git rev-list --left-right` output:** left side = main's unique commits, right side = branch's unique commits.
- **The branch you're deleting might be checked out in another worktree.** Use `git worktree list` first, and move work to isolated worktrees rather than deleting branches someone is using.
- **Authorship matters.** A cherry-pick loses authorship by default; use `--author` or `--allow-empty -x` to preserve it or note the original.
- **Multi-commit branches landing selectively is normal.** One commit via cherry-pick, another deferred — don't treat this as incomplete; decide which commits go and which stay.
