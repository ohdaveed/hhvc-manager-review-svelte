# PLAN — Karl outline + Blueprint, first slice

Branch `feat/karl-outline`, cut from `origin/main` at `572b9b6`. The full plan and the 18 settled
decisions are in `docs/plans/2026-11-23-karl-field-mapping-layer.md`, and the vocabulary is in
`CONTEXT.md` (Karl panel, Placement, Unplaced, Karl outline, Placed / Needs a fix / Unconfirmed).

Pilot pages: `report-rats-mice-four-legged-problems` (Transaction),
`information-what-happens-after-you-report-housing-pest-problem` (Information) and
`look-up-building-records` (Resource Collection).

- [x] **1. Claims in the transcript.** `buildTranscript` records which panel claimed each path
      (`transcript.claims`). `renderTranscriptMarkdown` output must be byte-identical for all 39
      pages, checked against a snapshot taken before the change.
- [x] **2. Primary agency source.** `primary_agency` reads `primaryAgency` as a CHOOSE on Transaction,
      the only type that carries it (U6, narrowed). The snapshot diff shows only those 16 steps changing.
- [x] **3. `src/lib/karl/schema.ts`** for Transaction, Information and Resource Collection, with
      cited rules. A test checks that every key exists in `KARL_PANELS`, that the order matches, and
      that every rule has a citation.
- [x] **4. `src/lib/karl/placement.ts`** `placementsFor(page, record)` returns a status and label per
      field id. Unit tests pin the pilot statuses, including a pinned `fieldKey` section.
- [x] **5. Karl outline UI.** Karl menu replacing the walkthrough button, `EditTarget` and `Section`
      chips, the persisted switch, and `aria-describedby`. Off on draft routes.
- [x] **6. Blueprint mode.** Slots in Karl order, dashed empty slots, the "Won't carry over" tray,
      and jump-to-element.
- [x] **7. Verify.** `bun run verify`, the ratchets, new e2e specs with axe with the outline on and in
      Blueprint at 1280px and 375px, and 12 screenshots that I look at.

## Result

All seven boxes done on `feat/karl-outline`. Gates at `28f93e9`: `bun run verify` all PASS (974 unit
tests, production build, bundle leak scan, config invariants); `check:ratchet` 0/0; `lint:ratchet`
3 (lowered from 4 by waiving `karl-transcript.js`'s `@ts-nocheck`, as `karl-blocks.js` was);
`format:ratchet` 46, at baseline; full Playwright suite 73 passed, including 13 new Karl specs with
axe at 1280px and 375px.

Corrections the built code forced on the plan (recorded in the plan doc):

- The Primary agency fix is **Transaction-only**: only Transaction pages carry `primaryAgency`
  (U6, narrowed).
- The rats page's two Custom Sections are **Unconfirmed**, not Placed: `custom_section` reaches a
  plain body section through an inferred mapping.

Found and fixed while building: placements built from `pageStore` pages reported their routable
`id` as unplaced copy; two render defects seen only in screenshots (a red-buried unplaced
section, and Blueprint slots with a status but no reason); a WCAG 2.5.3 label-in-name defect on
"Show on page".

Found and **not** fixed (out of scope): the walkthrough is built from the same `pageStore` page, so
its gap list very likely reports `id` as unmapped today.

Next: the rollout in the plan doc's §5 (Step by step, Topic, Campaign, Report, Agency, About us,
Location), and moving the Analysis checks onto `schema.ts`.
