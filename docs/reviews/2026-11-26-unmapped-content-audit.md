# Unmapped mockup content: audit and decisions (2026-11-26)

The Karl transcript reported **71 unmapped items across 35 of 43 pages**: copy the
mockups render that no Karl panel on that page type accepts. Measured with
`buildTranscript(page, null, pagesByKey).unmapped`. Each item was given a Karl
destination or removed. **After: 0.** FLAG entries are unchanged apart from the
primary-agency note wording (see "Classifier fixes").

Test: is the copy meaningful to a reader, and does the page already say it
somewhere Karl keeps?

## Decisions

| Item                                                                            | Pages                                                                                                                                       | Decision                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `audience` that duplicates an on-page "Who this information is for" block       | stepPestReport, stepCorrectViolation, stepPrepUnit, ehOffice (Intro); appealNotice, payCitation (Things to know)                            | **Removed.** The block already carries it.                                                                                                                                                                                                                         |
| `audience` on report Transactions (Things to know already spends its 2 entries) | garbage, rodents, mosquito, mold, bed bugs, pigeon, sewage, animal waste, insects                                                           | **Folded** into the 311 step's first paragraph. The one actionable fact the list carried is "you can report for someone else, or a problem in a shared area / nearby / at work". The rest restated the page title.                                                 |
| `audience` on lookup and fee Transactions                                       | inspectorLookup, publicRecords, findHotelRecords, findRecords, payFee                                                                       | **Removed.** The lookups are open to anyone and each page's body says what it covers. payFee's "Who must pay" entry already says it.                                                                                                                               |
| "This page is for …" one-line `audience`                                        | article11Guide, aboutHhvcTeam, ownerHub, pestsTopic, healthyHousingTopic, mosquitoWorkshop, ipmEducation, languageGuides, inspectionsAnnual | **Removed.** Restates the title. Both workshops already have a "Who can request" section.                                                                                                                                                                          |
| `audience` on ratFreeBlocks                                                     | ratFreeBlocks                                                                                                                               | **Folded.** "Neighborhood or merchant associations" goes into "Start with your own block"; owners already have their own Spotlight.                                                                                                                                |
| `summary` on types with no Description panel                                    | article11Guide, inspectionsAnnual (Report); aboutHhvcTeam (About us); mosquitoWorkshop, ipmEducation (Campaign)                             | **Removed.** Each first block already says it. The About note records that the live About page shows no summary.                                                                                                                                                   |
| `summary` on ratFreeBlocks                                                      | ratFreeBlocks                                                                                                                               | **Moved** to the first paragraph of About this campaign. It was the only statement of what the campaign is.                                                                                                                                                        |
| "View Article 11" section button (U1)                                           | 8 report Transactions                                                                                                                       | **Moved** to an inline link, the last bullet of "What the Health Code requires". custom_section has no Button link block; the citation (Ch. 8.7.2) stays.                                                                                                          |
| Steps on an Information page (U3)                                               | afterReport "How a report moves through the City"                                                                                           | **Restructured** into one Title and text block: a numbered list with bold step lead-ins. The DBI sentence keeps its Unverified flag. "Agency Hand-off (If applicable)" became "Another agency may take it."                                                        |
| Related cards on Step by step (no Related panel)                                | stepPestReport, stepCorrectViolation, stepPrepUnit                                                                                          | **Moved** each link to the step it belongs with, then removed the section.                                                                                                                                                                                         |
| Related on a Topic (U5)                                                         | healthyHousingTopic                                                                                                                         | **Moved** the two workshop cards into the "Learn more" Resources block, beside the Rat-free blocks campaign.                                                                                                                                                       |
| Agency subsection intro paragraphs (U20)                                        | pestsTopic (4)                                                                                                                              | Three **removed** (the subsection title and links say it). "Lead safety, water service, noise, asbestos, and structural construction concerns may be handled by another City program." **moved** to the About field: it is a scope statement.                      |
| `contact` on Information (no Contact us panel)                                  | article11Compliance, ownerGuidance                                                                                                          | **Moved** to a "Contact Healthy Housing and Vector Control" Title and text section.                                                                                                                                                                                |
| Placeholder document bullets on a Resource Collection                           | languageGuides                                                                                                                              | **Reshaped** as Body → Documents cards (title plus "Languages not confirmed."). Still PLACEHOLDER.                                                                                                                                                                 |
| Campaign body section with no component                                         | ratFreeBlocks "Start with your own block"                                                                                                   | **Mapped** to Additional content → Accordion section, with the mockup-only `open` flag. Its note named a "Title and text block", which Additional content does not offer: its five block types are Image with text, Video, Accordion section, Embed and Resources. |

## Classifier fixes (content was fine; the inventory missed it)

- **Information `primary_agency`** now reads `primaryAgency`, as Transaction's does
  (`src/lib/legacy-core/karl-blocks.js`). tenantNoticeSteps names its agency and
  the field exists. Pages without the field still get the empty-panel entry.
- **"Maps to Related."** in the notes on whoToCall, appealNotice and payCitation
  now reads "Maps to the Related panel." The card-inheritance classifier keys on
  that phrase, so those sections were unclassified and reported as unmapped.

## Surfaced, then resolved: Related links Karl cannot hold

Classifying those three Related sections let the Related-target check reach
them. The Karl Help Center (Components › Related) says only Transaction,
Information, Campaign and Topic pages can be tagged as Related, so these three
broke the rule. Each moved into the body as a rich-text Internal link:

- whoToCall → "Health Code Article 11 in plain language" (Report) and "Report a
  pest problem, start to finish" (Step by step): into "What Healthy Housing
  handles", beside the report links.
- appealNotice → "Health Code Article 11 in plain language" (Report): into the
  "Tell them what you disagree with" step.

## Pre-existing Related links to Agency and Resource Collection pages

The same rule covered eight older Related cards, which pointed at the HHVC Agency
page or at "Property owner responsibilities" (a Resource Collection). Six moved
into the body:

| Page                | Link                               | Now                                                              |
| ------------------- | ---------------------------------- | ---------------------------------------------------------------- |
| findRecords         | Healthy Housing and Vector Control | "Open the lookup tool" step: "To report a new problem instead…"  |
| inspectorLookup     | Healthy Housing and Vector Control | "Open the lookup tool" step                                      |
| scopeInfo           | Healthy Housing and Vector Control | last bullet of "Choose where to report your problem"             |
| article11Compliance | Property owner responsibilities    | "Fees and full requirements"                                     |
| payFee              | Property owner responsibilities    | first What to do section                                         |
| ownerGuidance       | Property owner responsibilities    | dropped from Related; "1. Follow …" already links it in the body |

Two were left in place: the two workshop Campaigns' cards to the Agency page.
Campaign's Related is `related_links`, which the live admin shows as a Page
block taking an SF.gov page or an External URL; the mosquito workshop already
holds external links there. Whether the Related component's four-type rule
applies to it is **unconfirmed**, so they stay pinned in
`karlComponentChecks.test.ts` rather than being moved on a guess.

The Help Center contradicts itself on Resource Collections: its September 2022
release notes say they "can now be added in the related resource section on
information & transaction pages". Those notes describe the Drupal-era SF.gov,
and the current Components › Related page omits them, so the current page was
followed. Moving a link into the body is allowed under either reading.

## AI schema conflict (resolved by the follow-up below)

`src/lib/server/ai/vendor/schemas.js` required `audience` on a whole-page
draft, so Rethink would have brought the list back. The follow-up retiring the
field removed that requirement and marked it `DIVERGES FROM UPSTREAM`.

## Test coverage

The corpus no longer exercises the unplaced path. The tests that pinned it now
run against `src/lib/karl/gapFixtures.ts`: current pages with the pre-audit gap
put back. `walkthrough.test.ts` asserts the corpus has zero unmapped items. The
e2e outline and Blueprint tables now expect empty trays.

## Follow-up: the `audience` field retired (same day)

The special handling for the page-level `audience` field is gone. That was the
renderer, the transcript's bespoke reasons and its Information placement, the
placement numbering around it, the `audience.N` field ids, and the AI page
schema and plain-language items (marked `DIVERGES FROM UPSTREAM`). The 13
Information pages that still carried a list now open with an ordinary "Who this
information is for" section. The Karl output for those pages is unchanged: the
only snapshot difference is the dropped "this tool supplies the title" note. A
page that brings `audience` back is reported as an unknown unmapped field
(`src/lib/karl/audienceRetired.test.ts`).
