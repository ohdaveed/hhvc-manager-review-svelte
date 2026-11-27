# PLAN — Leg 1: land what's waiting, decide what's blocked, start the UI copy review

Branch `docs/ui-copy-review-plan`, cut from `origin/main` (`f9f54b8`), in worktree `../wt-ui-copy-review`
(the main checkout is shared).

What is still open, measured 2026-11-26 against `main`:

- `docs/superpowers/plans/2026-11-24-transaction-review-fixes.md` — built (#210, #212); only Track C
  questions C3, C4, C6–C9 remain.
- `docs/plans/site-structure.md` — PR 1 follow-up, PR 3 (minus the records merge), PR 4, PR 5.
- PR #247 (`fix/workspace-review-findings`) — done, open, unmerged.
- The UI copy review below.

Leg 1 is the work that needs no product decision, plus one list that gets the decisions made. Leg 2
builds whatever that list settles.

- [x] **L1. Land #247.** Nothing to land: #251 (`9789a0a`) had carried all eight of its commits, and
      merging `origin/main` into it gave a tree identical to `main`. Closed as superseded 2026-11-26;
      branch and worktree deleted.
- [ ] **L2. Site structure PR 5: flag proposed pages in data.** `proposed: true` on the proposed modules,
      replacing the comment in `index.ts`. That comment says ten; 9 modules carry "PROPOSED PAGE" today —
      find the tenth (merged or retired?) before writing the count down; a corpus test pins that the
      flag and the note agree; the review queue can filter on it. Test first; `corpus:lock`, `verify`,
      screenshot of the queue filter. Its own branch and PR.
- [ ] **L3. One decision list.** A single doc for the manager / user, each item with the options and a
      recommendation: Track C C3, C4, C6–C9; site-structure open decisions 1–2; PR 3's merges (fold
      `tenantNoticeSteps` into `stepCorrectViolation`, the workshop pages, the canonical after-report
      page); PR 1's `findOrphans` follow-up; PR 4's slug scheme. Done when it is published and linked here.
- [ ] **L4. UI copy review, tasks 1–3 below** (baseline, inventory, rendered walk). Read-only, so it can
      run beside L2. Starts after L1.

Not in leg 1: PR 4's `pages.path` migration (a merge applies it to production, so it waits on L3's
slug decision), and every copy fix (waits on the review report).

---

## UI copy review: badly formatted text and text that adds nothing

This part of the plan is the review; fixes land later, in their own branches.

## Scope

**In:** every string the review tool itself shows a reviewer — `src/routes/**`, and
`src/lib/components/{workspace,landing,review}/**`, `KarlChip`, `KarlOrphanNotice`, `DraftBanner`,
`EditTarget`. That covers headings, body copy, button labels, `placeholder`, `title`, `aria-label`,
empty / loading / error states, toasts and live-region announcements, and server error messages that
reach the UI (`src/routes/api/**`, `$lib/ai/generate`).

**Out:**

- The mockup corpus (`src/lib/data/**`) — it is the material under review, and editor notes drive the
  card classifier (a reword can silently reclassify a section).
- `src/lib/components/{sfgov,blocks}/**` — they reproduce SF.gov chrome; their fixed strings ("On this
  page", footer) should match SF.gov, not be improved. Flag a mismatch with SF.gov, nothing else.
- `src/lib/server/ai/vendor/**` — kept diffable against upstream.
- `src/routes/demo/**`, `src/routes/sfgov-components` — developer pages.

**Overlap:** none left. `fix/workspace-review-findings` (#247) turned out to be in `main` already via
#251, so `main` is the baseline.

## What counts as a finding

| Category         | Examples                                                                                                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Format**       | raw markdown or `**` leaking; bad wrap / clipping / overflow; `1 pages`; `(0)` counts; mixed title/sentence case; mixed `…`/`...`, `→`/`->`; stray punctuation or double spaces |
| **Redundant**    | text that repeats a heading, a button label or a count shown beside it; intro paragraphs that restate the UI; a tooltip identical to its label                                   |
| **Internal**     | schema / field ids, slugs, `draft:<uuid>`, model names, HTTP codes or "Supabase" shown to a reviewer who cannot act on them                                                      |
| **Dead end**     | an empty or error state that says what happened but not what to do next                                                                                                          |
| **Inconsistent** | the same thing named two ways ("page" / "mockup", "decision" / "status", "Karl" / "CMS")                                                                                         |

Not findings: `sr-only` text and `aria-live` announcements that exist for screen readers (judge them by
ear, not by eye); the walkthrough's CHOOSE / FLAG instructions (kept deliberately, see the Karl sidebar
PLAN in git history).

## Tasks

- [ ] **1. Baseline.** Note the `main` SHA reviewed here.
- [ ] **2. String inventory.** A script (scratchpad, not committed) extracts every in-scope text node and
      `placeholder` / `title` / `aria-label` / message literal with `file:line` into a CSV. Done when the
      row count is recorded here and every in-scope file appears at least once.
- [ ] **3. Rendered walk.** Playwright on a dev server on a free port (not :5173), at 1440 px and 390 px,
      local Supabase: signed-out `/`, `/login`, signed-in `/`, a corpus `/review/<slug>` with each panel
      (Fields, Rethink, Analysis, Review, queue, site map, blueprint), the Karl walkthrough, a draft in
      each state (drafting / ready / failed / stale), `/review/<bad-slug>` (404), an empty queue, an AI
      error (501 with no key; 400 over-length). Screenshot each; done when every state has a shot.
- [ ] **4. Classify.** One row per finding: surface, `file:line`, current text, category, severity
      (blocks understanding / noise / polish), proposed action (delete, rewrite to X, move to tooltip or
      `sr-only`). Wrapping and clipping come from task 3 only — the CSV cannot see them.
- [ ] **5. Guard check.** For each proposed change, grep `tests/**` and `**/*.e2e.ts` for the string
      (`getByText`, `getByRole({ name })`); note which tests must change with it.
- [ ] **6. Report.** Findings in `docs/reviews/<date>-ui-copy-review.md`, grouped by surface, highest
      severity first; screenshots referenced, not committed. Reviewed with the user before any fix.
- [ ] **7. Fixes (after approval).** One branch / PR per surface (landing, review workspace, walkthrough,
      drafts, errors). Each PR: unit + e2e green, `check:ratchet`, `lint:ratchet`, `format:ratchet`,
      and before/after screenshots of the changed states.

## Decisions

- Review first, fix later: deleting copy is a product call, so nothing is removed on the strength of
  the inventory alone.
