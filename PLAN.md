# PLAN — Karl outline rollout: Report

Branch `feat/karl-report`, cut from `origin/main` at `d321366` (Campaign, PR #200, verified live).
The plan and vocabulary are in `docs/plans/2026-11-23-karl-field-mapping-layer.md` (§5, rollout
step 4) and `CONTEXT.md`.

Pages: `article11Guide` (9 Content sections, 7 tables, a page spotlight, a callout) and
`inspectionsAnnual` (6 sections, 3 tables, a Related list).

## Measured before starting

Already right from earlier rollouts: Summary is Unplaced (U21; Report has no Description), the
callout needs a fix (Report has no callout), the Related list is absorbed into Content and needs a
fix, and 18 PLACEHOLDER table cells are counted. Wrong: every section reads "Content N", and a
table cell is labelled just "Content N" because the sub-label does not know tables. No table is
wider than 3 columns today.

## Karl, read 2026-11-24

- "How a Report page works": Title, Primary Agency, Date, Spotlight, Content (Body, Table), Print
  version, Partner agencies. "Tables work best with 3 or fewer columns." (advisory)
- Tables: "Text in tables is not machine translated." A **confirmed** behaviour worth telling a
  manager, not a disagreement, so it needs wording other than "Karl's rule unconfirmed".
- Spotlight: Report allows 1; a button is allowed "as part of a Spotlight on: Agency, Campaign,
  Report", at 25 characters.
- URL: `sf.gov/[slug]` (URLs) vs `sf.gov/reports/month-year/title-of-report` (Report).
  **Unconfirmed.**

## Checklist

- [x] **1. Schema and placement.** Report in `schema.ts` (Title, spotlight button ≤25, tables aim
      for ≤3 columns, the translation note, unconfirmed URL, no Related). Sub-labels name Report's
      Content blocks (`Content 2 · Table`, `· Body`). Confirmed caveats become "Good to know" notes
      in the Blueprint, apart from the unconfirmed ones. Unit tests pin both pages.
- [x] **2. e2e.** `inspectionsAnnual` joins the outline spec and `article11Guide` the Blueprint
      spec, with axe at 1280px and 375px; screenshots looked at.
- [ ] **3. Ship.** `verify` and the ratchets, PR, merge on green, and `verify:live`.
