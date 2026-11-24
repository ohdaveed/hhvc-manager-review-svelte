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
- [ ] **5. Karl outline UI.** Karl menu replacing the walkthrough button, `EditTarget` and `Section`
      chips, the persisted switch, and `aria-describedby`. Off on draft routes.
- [ ] **6. Blueprint mode.** Slots in Karl order, dashed empty slots, the "Won't carry over" tray,
      and jump-to-element.
- [ ] **7. Verify.** `bun run verify`, the ratchets, new e2e specs with axe with the outline on and in
      Blueprint at 1280px and 375px, and 12 screenshots that I look at.
