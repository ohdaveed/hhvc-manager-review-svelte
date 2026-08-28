---
name: hhvc-branch-verification
description: 'Post-merge branch lifecycle verification: categorizing branches by merge status, verifying code presence on main, making deletion decisions, and safely cleaning up stale remotes. Use this skill when identifying which stale or closed branches are safe to delete, verifying whether bot-proposed fixes actually landed in main, or cleaning up branch clutter after a merge sequence.'
trigger: 'Use this skill when identifying which stale or closed branches are safe to delete, verifying whether bot-proposed fixes actually landed in main, or cleaning up branch clutter after a merge sequence.'
author: arrizon.david
source_sessions:
  - arrizon.david_arrizon.david's Organization_default_d142db57-955c-422e-acb5-22f5e91586f9
contributors:
  - arrizon.david
version: 1
created_by_agent: claude_code
created_at: 2026-08-27T01:45:56.679Z
updated_at: 2026-08-27T01:45:56.679Z
---

# HHVC Post-Merge Branch Cleanup

After a merge sequence (especially with review-bot branches), stale branches accumulate. This skill provides a systematic way to verify whether fixes actually landed in main, categorize branches by safety-to-delete, and coordinate cleanup across local and remote refs.

## When to Use This Skill

Use this skill when:

- You have multiple branch candidates for deletion after a merge wave
- A review-bot proposed fixes in closed (unmerged) branches and you need to verify they landed
- Deciding whether a branch can be safely deleted based on merge status and code presence
- Managing post-merge cleanup when you have open decisions about what stays/goes

## The Verification Process

### 1. Categorize by merge status and commit count

For each branch, measure divergence from main:

```sh
git rev-list --left-right --count main...origin/<branch>
# Output: "2 5" = 2 commits in main not in branch, 5 in branch not in main
```

Also check PR status by querying pull requests whose head branch matches the branch. The branch value is quoted so names containing `/` (or other shell-special characters) are passed as one argument:

```sh
branch="<branch>"
gh pr list --head "$branch" --state all --json state,mergedAt,number
# [] = no PR; inspect state and mergedAt for each returned PR
# MERGED (or a non-null mergedAt) = merged PR; CLOSED with null mergedAt = closed PR
```

Use the relevant returned PR (or PRs) to apply the categories below; do not use the branch endpoint for PR status, since it does not expose linked pull requests.

**Categories:**

- **Merged, 0 ahead:** PR merged, all content in main → **DELETE**
- **Closed PR, commits ahead:** Intended cherry-pick lifecycle → **VERIFY step 2**
- **No PR, commits ahead:** Real unmerged work → **KEEP**

### 2. Verify code presence (for closed branches)

The fix may have landed in reworked form, been integrated later, or targeted code never added.

```sh
# See what the branch proposes
git show origin/<branch>:src/file.ts | grep -A5 "fix_code"

# See what's on main
git show origin/main:src/file.ts | grep -c "evidence"

# If no direct match, search by behavior
git log origin/main -S "search_term" --oneline | head
```

**Outcomes:**

| Result                                  | Decision                      |
| --------------------------------------- | ----------------------------- |
| Fix present on main (possibly reworked) | **DELETE**                    |
| Targets code that doesn't exist         | **DELETE**                    |
| Fix genuinely absent, problem open      | **CHERRY-PICK or OPEN ISSUE** |

### 3. Categorize and delete

Build your groups and execute:

**Group A — merged, 0 ahead:**

```sh
git push origin --delete feat/sfds-v4-scoped chore/pr-ci fix/verify-exit-status
```

**Group B — closed PR, fix verified landed:**

```sh
# After confirming step 2, delete
git push origin --delete fix/remediation-bot-1 fix/remediation-bot-3
git fetch --prune
```

**Group C — genuine absences:**
Make explicit decision: cherry-pick, open new issue, or document why not needed.

### 4. Clean up local refs

```sh
# Delete local tracking branches
git branch -d local1 local2 local3

# After remote pushes, clean stale tracking refs
git fetch --prune
```

## Gotchas

- **Squash merges erase commit identity** — bot's exact SHA won't appear on main. Search by code/logic instead.
- **Commit counts mislead on age** — a 4-week-old branch can have "0 ahead" if main moved past it. Trust `git rev-list` counts.
- **Bot branches have standard lifecycle** — closed (not merged) is normal for cherry-pick-intended work. Don't assume closure means abandoned.
- **Stale local tracking refs persist** — run `git fetch --prune` after remote deletions.
- **`git rev-list --left-right` output:** left side = main's unique commits, right side = branch's unique commits.

## Example: Multi-Branch Cleanup

From the hhvc-manager-review-svelte cleanup (6 exchanges):

```sh
# Step 1: Measure divergence
for b in feat/sfds-v4-scoped fix/remediation-bot-1 docs/section-rethink-design; do
  counts=$(git rev-list --left-right --count main...origin/$b 2>/dev/null)
  echo "$b: $counts"
done

# Step 2: For each closed PR with commits ahead, verify code presence
git show origin/fix/remediation-bot-1:scripts/verify.sh | grep "ls-remote"
git show origin/main:scripts/verify.sh | grep -c "ls-remote"
# If present on main: DELETE

# Step 3: Delete in batches
git push origin --delete feat/sfds-v4-scoped chore/pr-ci docs/branch-ruleset
git fetch --prune

# Step 4: Verify
git branch -r | wc -l  # Confirm reduction
```

Result: 20 remote branches → 11, 11 local → 2, with explicit decisions on 9 bot branches.
