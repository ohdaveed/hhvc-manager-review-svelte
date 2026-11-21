# Plan — site structure and organization

Follow-up to a structure review of the 39-page mockup corpus (`src/lib/data/`).
Kept separate from `PLAN.md`, which still carries open items of its own.

Links counted for this plan are both `cards[].target` / `buttonTarget` and
markdown `[text](pageKey)` links in body copy — counting only the first kind
overstates how many pages are unreachable.

Every PR: `bun run corpus:lock`, `bun run verify`, Playwright screenshots of the
changed pages, CI green. Merging publishes production on Netlify — ask first.

## PR 1 — Reach the three unreachable pages (content only)

- [ ] `languageGuides` linked from the Agency page (`pestsTopic`) and `verminResources`
- [ ] `ratFreeBlocks` linked from `rodentsReport` and `verminResources`
- [ ] `inspectionsAnnual` linked from `recordsHub`
- [ ] Test: every page is reachable from the Agency or Topic page

## PR 2 — One role per hub

- [ ] Agency page: HHVC's own tasks, grouped by audience
- [ ] Topic page: city-wide housing issues; HHVC tasks collapse to a link to the Agency page
- [ ] `verminResources` / `ownerHub`: documents and guides only
- [ ] Retitle About page "About Healthy Housing and Vector Control"

## PR 3 — Collapse overlapping pages

- [ ] Notice of Violation: `stepCorrectViolation` is the spine; fold in `tenantNoticeSteps`
- [ ] Records: merge `findViolations` into `findRecords`; `recordsHub` routes by building type
- [ ] One canonical "what happens after you report" page (`afterReport`)
- [ ] Merge the two workshop campaigns

## PR 4 — Consistent slugs and keys (touches the database)

- [ ] Slugs: `<type>/<name>` for non-transactions, `<name>` for transactions
- [ ] Rename misleading keys/files (`pestsTopic`, `respond-to-notice-of-violation.ts`)
- [ ] `pages.path` migration, shaped like `20260829120000_rename_agency_page_paths.sql`
- [ ] Merge applies the migration to production; push staging by hand after

## PR 5 — Proposed pages flagged in data

- [ ] `proposed: true` instead of the comment in `index.ts`; queue can filter on it

## Open decisions

1. Merging pages cascades their comments and edits away (`ON DELETE CASCADE`).
   Proposed: keep merged pages' rows and hide them from the queue.
2. Hub and merge choices (PR 2–3) are content decisions: draft-then-approve per
   PR, or sign off on card lists first?
