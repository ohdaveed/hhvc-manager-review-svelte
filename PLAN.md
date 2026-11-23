# PLAN — queue navigation (UX review findings 2 and 4)

Branch `feat/queue-navigation`, cut from `origin/main` at `ac3ea78`.

**Problem, measured 2026-11-22 at 1440px against the local stack:** `/` redirected to
`pageStore.pages[0]` (corpus order), which is row 38 of 39 in the queue (status
order). The current row was below the fold, so the sidebar never showed where you
were. Once a decision was recorded nothing moved you on: the toolbar only offers
"First page", so all 39 pages meant a trip back to the sidebar each time.

- [x] `nextUndecidedPath(pages, current)` in `reviewState.ts`: the next
      `needs-review` page after `current` in store order, wrapping, never `current`;
      `undefined` when nothing is left. Unit tests in `tests/reviewQueue.test.ts`.
- [ ] Decision panel shows a "Next undecided page →" link under the notes, or
      "Every page has a decision" when none are left.
- [ ] The queue scrolls the `aria-current` row into view (`block: 'nearest'`)
      whenever the slug changes.
- [ ] `/` redirects to the queue's first row (`firstQueuePath`), falling back to
      corpus order when no review loads (signed out). It runs `loadReview()` and
      disposes the realtime channel right away, so no subscription leaks.
- [ ] Gates: `test:unit --run`, `check:ratchet`, `build`. Browser check at 1440:
      landing row visible, Next link moves to the right page.

Deliberately skipped: `j`/`k` keyboard shortcuts and jumping to the next page
automatically after a decision. Add them if reviewers want them.
