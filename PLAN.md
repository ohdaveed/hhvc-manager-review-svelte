# PLAN — UI copy review: badly formatted text and text that adds nothing

Branch `docs/ui-copy-review-plan`, cut from `origin/main` (`f9f54b8`), in worktree `../wt-ui-copy-review`
(the main checkout is shared). This plan is the review; fixes land later, in their own branches.

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

**Overlap:** `fix/workspace-review-findings` (`../wt-workspace-review`, unmerged) already rewrites
toolbar, queue, walkthrough and analysis copy. Review against `main` _after_ it merges, or the findings
will describe text that is already gone.

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

- [ ] **1. Baseline.** `fix/workspace-review-findings` merged (or explicitly included); note the SHA
      reviewed here.
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
