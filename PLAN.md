# PLAN — Karl outline rollout: Location

Branch `feat/karl-location`, cut from `origin/main` at `0046900` (Agency, PR #202, verified live).
The plan and vocabulary are in `docs/plans/2026-11-23-karl-field-mapping-layer.md` (§5, rollout
step 6) and `CONTEXT.md`.

One page: `ehOffice` (`sf.gov/location/environmental-health-office`), a proposed page with
placeholder address and hours.

## Measured before starting

"5 sections: 1 needs a fix, 4 unconfirmed." Every mapping is inferred, because the live form was
captured only to panel names (field map E2, register **U26**): `title`, `primary_agency`,
`description`, `alert`, `image`, `body`, `intro`, `services`, `about_location`, `partner_agencies`,
`at_this_location`, `people`, `related_locations`, `contact`. Labels read "Body 1–3" and "Intro" with
no hint of where they sit on the page.

## Karl, read 2026-11-24

"How a Location page works" lists 21 sections: Title, Description, Primary Agency, Alert, **Essential
information** (Image, Body), **Getting here** (Intro, Parking, Accessibility, Public
transportation, Accordions), Services, About, Partner agencies, **Additional location info**, At this
location, People, Related locations, Contact us.

- These are not 21 fields. "Essential information" ("includes an Image and a Body section for
  text") and "Getting here" ("Basic information about transportation … The 'Getting here'
  subheading cannot be changed") are **groups** over the captured `image`/`body` and `intro`.
- **Parking, Accessibility, Public transportation, Accordions and Additional location info have no
  field in the capture.** They probably sit inside fields nobody expanded (U26). They are not
  invented here; they are shown as one Unconfirmed note.
- A Location "is based on an Address", and the Address snippet carries Line 1, City, State and Zip
  (all required) plus **Hours and days open**. The page's own note already says its address and hours
  "belong with the page's address fields". This is a **confirmed** Good-to-know note.
- Related locations takes other **Location** pages only; At this location takes Agency or Location
  pages; Contact us is listed, so it is **confirmed** (unlike Campaign).
- Alert: title ≤30 and description ≤120 characters (Alert component).
- URL: `sf.gov/[slug]` (URLs) vs `sf.gov/location/name-of-location` (Location). **Unconfirmed.**

## Checklist

- [x] **1. Schema and placement.** Location in `schema.ts`: Title, Description, alert limits, the
      Address-snippet note, the uncaptured-sections caveat (U26), Related locations (Location pages
      only), and an unconfirmed URL. Labels carry the help center's groups (`Essential information ·
      Body`, `Getting here · Intro`). The intro gets a reason: Karl describes Getting here as
      transport information, which an audience line may not be. The absorbed Related list's reason
      names Related locations. Unit tests pin the page.
- [ ] **2. Field map.** U26 gains the help-center reading. The inventory keeps its 14 captured fields.
- [ ] **3. e2e.** The Location page joins both specs, with axe at 1280px and 375px; screenshots
      looked at.
- [ ] **4. Ship.** `verify` and the ratchets, then a PR. Ask before merging.
