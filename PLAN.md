# PLAN — Karl outline rollout: Campaign

Branch `feat/karl-campaign`, cut from `origin/main` at `5609592` (Topic, PR #199, verified live).
The plan and vocabulary are in `docs/plans/2026-11-23-karl-field-mapping-layer.md` (§5, rollout
step 3) and `CONTEXT.md`.

Pages: `mosquitoWorkshop`, `ipmEducation`, `ratFreeBlocks`.

## Measured before starting

- Summary is Unplaced on all three: Campaign has no Description (U21). Correct.
- **Callouts show as Placed** (four, inside Spotlight 1 and Additional content 3), but Karl offers
  callouts only on Transaction, Information and Data story, and the existing in-mockup notice
  already says so. The outline contradicts it.
- **"See owner responsibilities" is 26 characters**, over the 25-character button limit; nothing
  checks spotlight buttons.
- `ratFreeBlocks` "Related pages" is Unplaced although its note says "Maps to Related links".
  Cause: the prose classifier's `TITLE_ONLY` matches "related field/panel" and `related_links`, not
  "Related links" (the U27 class).
- `ratFreeBlocks` "About this campaign" and its `partnerAgencies` reach no panel: the Campaign
  inventory reads "— unused" for `about_campaign` and `partner_agencies`, transcribed when no
  Campaign page used them.
- `ratFreeBlocks` "Start with your own block": its note claims "Additional content → Title and text
  block", but Campaign's Additional content offers Image with text, Video, Accordion section, Embed
  and Resources. **Stays Unplaced**; the note is wrong, not the outline.

## Karl, read 2026-11-24

- "How a Campaign page works" lists Title, Primary agency, Logo, Background header image, Color
  theme, Spotlight 1, Top facts, Additional content, Spotlight 2, About, Partner agencies and
  Related. **No Contact us**, though the live-form capture has a `contact` panel. Under the field
  map's precedence (O14, help center first), Campaign's Contact us is **Unconfirmed**. This
  settles the audit's "Contact us on Campaign" question as a real disagreement, not a repo error.
- Spotlight: "Agency and Campaign allow up to 2 spotlights." Button: a button is allowed "as part
  of a Spotlight on: Agency, Campaign, Report"; "Buttons can only be 25 characters long."
- Accordions on a Campaign page: "Ideally, you should have a maximum of 5 accordions." (advisory)
- URL: `sf.gov/[slug]` (URLs) and `sf.gov/title-of-campaign` (Campaign) agree. **Confirmed.**

## Checklist

- [x] **1. Inventory and data.** Reword `ratFreeBlocks`' Related note so it names the Related field,
      with a `classifySection` diff across the corpus before and after. Map Campaign
      `partner_agencies` to `partnerAgencies` and `about_campaign` to a `component: 'about'`
      section, tagging `ratFreeBlocks`' "About this campaign" (no render change), and update the
      field map rows. The snapshot diff is limited to `ratFreeBlocks`.
- [x] **2. Schema.** Campaign in `schema.ts`: Title, spotlight button ≤25, accordions aim ≤5
      (advisory), Contact us caveat, confirmed URL, Related targets. All cited.
- [x] **3. Placement.** A callout on a type Karl offers none on needs a fix (any type, as the
      in-mockup notice already says); spotlight button length; accordion advice; Contact us
      Unconfirmed. Unit tests pin all three pages.
- [x] **4. e2e.** `ratFreeBlocks` and `ipmEducation` join the outline spec, and `ratFreeBlocks`
      the Blueprint spec, with axe at 1280px and 375px; screenshots looked at.
- [ ] **5. Ship.** `verify` and the ratchets, PR, merge on green, and `verify:live`.
