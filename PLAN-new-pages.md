# PLAN — ten proposed HHVC pages, for a supervisor review

Source: `design/HHVC Page Ideas.dc.html`, a content plan proposing 35 pages
against the same rules as the 29 drafted (sentence case, titles under 65
characters, descriptions under 110, verb-first where the page asks for an
action).

**Scope: 10 of the 35, chosen for range rather than completeness.** The brief is
"options she wouldn't normally think of", so the set is ranked by how
non-obvious each page is and covers all seven Karl types the team can create
without Digital Services. The four post-inspection Transactions the plan lists
separately (ask for more time, tell us it's fixed) fold into the Step by step as
its steps, which is how Karl documents that type working — an overview linking
out to Transaction detail.

`PLAN.md` is a different, still-open plan; this is deliberately a second file
rather than an overwrite.

## The pages

| #   | Type                | Title                                       | Why it is non-obvious                                                             |
| --- | ------------------- | ------------------------------------------- | --------------------------------------------------------------------------------- |
| 1   | Step by step        | Report a pest problem, start to finish      | Unused Karl type, built for a process that unfolds over weeks                     |
| 2   | Step by step        | Correct a violation and close your case     | Sequence currently scattered across four Transaction pages                        |
| 3   | Step by step        | Prepare your unit for pest treatment        | Tenants are told to do this with no page to send them to                          |
| 4   | Location            | Environmental Health office                 | The ninth Karl type, unused — a team taking walk-ins and mail has no address page |
| 5   | Information         | Who to call about a housing problem         | Cross-department routing nobody owns today                                        |
| 6   | Transaction         | Appeal a Notice of Violation                | Routes to a Director's Hearing, which is a _Meeting_ type                         |
| 7   | Transaction         | Pay a Healthy Housing citation              | Post-inspection path with no page at all                                          |
| 8   | Resource collection | Guides in other languages                   | Organised by artifact rather than audience                                        |
| 9   | Campaign            | Rat-free blocks                             | Campaign as a push; both existing ones are booking forms                          |
| 10  | Report              | Healthy Housing inspections: annual summary | Only type supporting tables plus a publication date                               |

## Facts that must not be invented

The source plan flags four placeholders, and three land in this set. Per the
standing brief — do not invent legal requirements, timelines, or amounts — these
are written with the fact marked in `editorNote` as needing confirmation, not
filled with a plausible number:

- [ ] **Citation amount** (page 7) — left unstated.
- [ ] **Languages offered** (page 8) — the plan names five; treated as proposed, not confirmed.
- [ ] **Office address, hours, phone** (page 4) — left as placeholders.

## Tasks

- [x] Write the ten modules in `src/lib/data/`, matching the existing shape:
      `slug`, `type`, `title`, `summary`, `audience[]`, `reading`, `editorNote`,
      `editorStatus`, `whatToKnow`, `sections[]` (each with a `karl` note),
      `partnerAgencies[]`, `seoTitle`, `metaDescription`.
- [x] Put the audience in `whatToKnow.thingsToKnow` as a "Who this information
      is for" entry **on the two Transaction pages**. Corrected mid-build: only
      Transaction has that panel. Step by step and Location put it in `intro`
      instead, and the other four types have neither, so their audience stays in
      `audience` and the transcript reports it as a gap — which is now accurate
      per type. Original wording assumed one destination for all ten. Per the
      corrected mapping — the live pattern on
      `sf.gov/manage-covid-19-schools-childcare-and-youth-programs`. New pages
      can adopt it directly; the existing 29 still need the per-page budget
      decision.
- [x] Export each from `src/lib/data/index.ts` (import + `pagesByKey`).
- [x] `bun run corpus:lock` — blocking in CI via `corpus:check`.
- [x] `bun run verify` and the e2e suite.
- [ ] Publish the design canvas for the supervisor.

## The database step, which is easy to miss

`pages` rows are written by the **seed only** — `corpus:import` writes
`corpus_versions` and `page_versions` and never touches `public.pages`, and
`loadReview()` builds the review queue from those rows rather than from the
compiled corpus. So a new module renders at its route but is **absent from the
review queue** until a row exists.

- [x] Add the ten paths to `supabase/seed.sql` and `supabase/seed.hosted.sql`.
- [ ] Migration inserting the ten rows against the existing review, for
      production and staging both. Merging to `main` applies migrations to
      production only; staging needs a manual `supabase db push`.

## Not in scope

- The remaining 25 proposed pages. The source plan itself warns that all 35
  would push the section past 60 and argues for the subset above.
- Splitting mold onto its own page. Partly addressed already by naming mold in
  the consolidated report's title; the rest is an IA decision that belongs with
  the report-page species question in `REVIEW-structure-pass.md`.
