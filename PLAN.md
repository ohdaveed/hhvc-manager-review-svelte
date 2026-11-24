# PLAN — Karl outline rollout: About us (the last type)

Branch `feat/karl-about`, cut from `origin/main` at `88ceac2` (Location, PR #204, verified live).
The plan and vocabulary are in `docs/plans/2026-11-23-karl-field-mapping-layer.md` (§5, rollout
step 6) and `CONTEXT.md`.

One page: `aboutHhvcTeam` (`sf.gov/departments--healthy-housing-and-vector-control--about`).

## Measured before starting

"4 sections: 4 go into Karl. 2 things won't carry over to Karl." Three Information sections and a
Resources section place; Summary is Unplaced (U21: About has no Description); the audience list
is Unplaced; Primary agency is empty. No About rule is checked yet.

## Karl, read 2026-11-24

- How an About page works: "Create an About page and tag an **existing Agency**. A **button**
  linking to the About page will **automatically be added** from the About section of that Agency
  page." **Confirmed**, a page note: this page is reached from its Agency page.
- Information: mission statement, vision, goals, list of divisions; "About pages don't take
  images." **Confirmed**, a Good-to-know note on the Information panel.
- Resources: SF.gov pages, other websites, PDFs or other files.
- URL: `sf.gov/about-[department name]` (URLs) vs
  `sf.gov/departments/name-of-department/about` (About). **Unconfirmed.**

## Checklist

- [x] **1. Schema and placement.** About us in `schema.ts`: Title, the Agency-button page note,
      the no-images note, an unconfirmed URL, no Related. Unit tests pin the page.
- [x] **2. e2e.** The About us page joins both specs, with axe at 1280px and 375px; screenshots
      looked at.
- [ ] **3. Ship.** `verify` and the ratchets, then a PR. Ask before merging. Then mark the rollout
      complete in the plan doc.
