# Plan — site structure and organization

Follow-up to a structure review of the 39-page mockup corpus (`src/lib/data/`).
Kept separate from `PLAN.md`, which still carries open items of its own.

Links counted for this plan are both `cards[].target` / `buttonTarget` and
markdown `[text](pageKey)` links in body copy — counting only the first kind
overstates how many pages are unreachable.

Every PR: `bun run corpus:lock`, `bun run verify`, Playwright screenshots of the
changed pages, CI green. Merging publishes production on Netlify — ask first.

## PR 1 — Reach the three unreachable pages (content only)

- [x] `languageGuides` linked from the Agency page (`pestsTopic`) and `verminResources`
- [x] `ratFreeBlocks` linked from `rodentsReport` and `verminResources`
- [x] `inspectionsAnnual` linked from `recordsHub`
- [x] Reachability guard: reused the existing `findOrphans` pin in `src/lib/karl/sitemap.test.ts` (15 → 10) rather than adding a second definition
- [x] Also linked the six pages that were only reachable from each other: Agency → About; "Fix your violation" → correct / question / pay
- [ ] Follow-up decision: `findOrphans` follows cards only, not `[text](pageKey)` links in copy, so its 10 overstates — every page is reachable once prose links count

## PR 2 — One role per hub

- [x] Agency page: already grouped by audience (report / rent / own / records / other services / about) — no change needed
- [x] Topic page: dropped the annual-fee and fix-a-violation cards and the four lookup cards; added the Agency page and the records collection in their place (18 → 14 outbound). Kept the two-Services-group shape copied from the live topic page
- [x] ~~`verminResources` / `ownerHub`: documents and guides only~~ — **skipped, deliberately.** Their task cards are audience-scoped entry points (owner obligations on the owner page; "report first" on the pest page), and both pages' notes record that as a design choice. Removing them would undo a decision, not remove duplication
- [x] Retitle About page "About Healthy Housing and Vector Control"

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
