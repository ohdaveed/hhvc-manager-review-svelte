# PLAN — Review workspace header band and side panels

Branch `feat/workspace-header`, cut from `origin/main` at `88ceac2`, in worktree
`../wt-workspace-header`. Approved by the user ("Build it", 2026-11-24) after a dashboard-layout
review of `/review/[slug]` rendered at 1440/1280/768/375. Independent of PR #205 (landing page).

## Findings this answers

1. Nothing in the workspace links back to `/`.
2. The queue header (83px), canvas toolbar (48px) and panel tab strip (48px, grey tint) are three
   unaligned tops.
3. Account (email, Sign out) and an "SFDS REBUILD" eyebrow sit above the queue.
4. The toolbar shows the slug, not the page; its only navigation is "First page".
5. Decision is the panel's default and main job but its tab is third; "Manager Review" repeats it.
6. The decision is invisible with the panel collapsed and on phones.

## Tasks

- [ ] **Header band.** Queue rail header is one 48px row: "All pages" link to `/` + collapse.
      Toolbar: previous/next page in queue order, the page title (slug in its tooltip), a status
      badge, then unsaved count, preview width ("Desktop · 54%", px in tooltip) and Karl. Panel tab
      strip on white. All three share one bottom border line.
- [ ] **Queue order helper.** `queueOrder(pages)` in `reviewState` (groups in
      `QUEUE_STATUS_ORDER`, store order within), corpus order when no review is loaded; unit-tested.
- [ ] **Account to footer.** Email + Sign out move to the queue footer beside Site map / Export;
      the eyebrow goes.
- [ ] **Panel.** Tabs ordered Decision, Fields, Rethink, Analysis; "Manager Review" heading removed.
- [ ] **Decision when hidden.** Collapsed panel strip shows a status dot with an accessible label;
      the phone Review button carries the status.
- [ ] **Tests and gates.** Replace `toolbarQueueStart.e2e.ts` with prev/next coverage; update
      specs that pin the old header; `verify`, ratchets, affected e2e green.
- [ ] **Rendered check.** 1440/1280/768/375, collapsed, signed out; keyboard order; axe.

## Decisions

- Toolbar badge uses the workspace vocabulary (`queueHeading`: "Needs review"), matching the
  queue groups beside it. Unifying with the landing page's "Undecided" is follow-up F1 in
  `src/lib/review/statusLabels.ts`, deliberately not done here.
