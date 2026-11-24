# PLAN — Karl outline rollout: Agency

Branch `feat/karl-agency`, cut from `origin/main` at `cac772a` (Report, PR #201, verified live).
The plan and vocabulary are in `docs/plans/2026-11-23-karl-field-mapping-layer.md` (§5, rollout
step 5) and `CONTEXT.md`.

One page: `pestsTopic` (`sf.gov/departments--healthy-housing-and-vector-control`). One Services
section and four Resources sections, each a heading, an intro paragraph (three of the four) and
link cards, plus an About section.

## Measured before starting

- **The walkthrough is wrong in two places, and the outline inherits both.**
  - It emits each Services and Resources intro paragraph into the Subsection as "Text". Karl's
    Subsection has only a Title and a links list ("Add a subsection Title … Add an SF.gov page or
    External link"; field map E1), which is what register entry **U20** records: "a direct mapping
    loses the paragraph". The outline therefore calls lost copy Placed.
  - It emits "Section title 2" (one required field) four times, once per Resources heading.
- Labels: Agency's form has two panels both called "Subsection", so the outline shows "Subsection"
  beside "Subsection 1–4".
- Audience is Unplaced; About is Placed. Public records is required and empty, but shows as
  optional, because Agency has no schema yet.

## Decision (user, 2026-11-24)

Each Services/Resources heading becomes **its own Subsection's Title**. Section title 1 and 2 keep
the values the form pre-fills ("Services", "Resources"). This replaces the field map's documented
mapping ("the resources sections' heading" → Section title 2), which cannot hold four headings in
one field. The field map rows change with it.

## Karl, read 2026-11-24

- Resources on an Agency page: "Add a subsection Title … Add an SF.gov page or External link …
  You can create more subsections."
- Resource tiles on Agency: the Resources component says "5 content types support resource
  tiles" and lists four, without Agency. The form offers a list of links here. **Unconfirmed.**
- Spotlight: Agency allows up to 2. None on this page.
- URL: `sf.gov/department-[slug]` (URLs) vs `sf.gov/departments/title-of-department` (Agency).
  **Unconfirmed.**

## Checklist

- [x] **1. Transcript.** On Agency, a Services/Resources section's heading is its Subsection's
      Title, and its intro paragraphs are not emitted (the sweep reports them as U20). Section title
      1 and 2 emit their pre-filled values once each. The field map rows are updated. The snapshot
      diff is `pestsTopic` only.
- [x] **2. Schema and placement.** Agency in `schema.ts` (Title, Description, ≤2 spotlights, the
      resource-tiles caveat, unconfirmed URL). Labels `Services · Subsection` and
      `Resources · Subsection N`. Unit tests pin the page.
- [x] **3. e2e.** The Agency page joins both specs, with axe at 1280px and 375px; screenshots
      looked at.
- [ ] **4. Ship.** `verify` and the ratchets, then a PR. Ask before merging.
