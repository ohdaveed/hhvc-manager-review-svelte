# HHVC SF.gov mockup: Karl review (all tabs)

Exported from the Claude Doc "HHVC transaction pages: Karl review" on Nov 24, 2026. One section per tab, in tab order. The Decisions tab overrides all others.

> **Status, 2026-11-24:** this review was written against the app on Nov 23. Some findings were fixed before work on it started: descriptions over 110 characters (#194) and "What to do: Pass on every page" (#208). The original findings below are left as written. `docs/superpowers/plans/2026-11-24-transaction-review-fixes.md` tracks what is fixed, what is decided and what is still open, finding by finding.

Tabs:

1. Decisions
2. Transaction pages
3. Information pages
4. Resource Collection pages
5. Step by step pages
6. Topic page
7. Campaign pages
8. Report pages
9. Agency and About pages
10. Location page

---

# Decisions

Nov 24, 2026 · @David Arrizon

This tab overrides the other tabs. Build only what's under **Decided**. Everything under **Still open**, and every recommendation in the other tabs not listed here, waits for manager review.

## Fix first

- **Sewage routing is wrong.** HHVC handles active sewage leaks. _Learn what HHVC can inspect_ says: "For lead, pesticides, water quality, sewage, food sanitation, or business hygiene concerns, use the Citywide health nuisance and hazards reporting service." Remove "sewage" from that list and route sewage reports to HHVC (writing audit, row 97).

## Decided

### Report pages: regroup by condition (9 pages)

| Group      | Page                                         | Covers                                                                                                                                    |
| ---------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Pests      | Report rats or mice                          | Rats and mice, droppings, burrows, and the mites that come with them. The owner hires a private wildlife company to remove live raccoons. |
| Pests      | Report bed bugs                              | Bed bugs in a unit or building, including owner duties, unit prep and adjacent units                                                      |
| Pests      | Report cockroaches or other insects          | Cockroaches, fleas, flies, wasps and mites. Flies also point to the garbage and animal waste pages, with drain and fruit fly tips.        |
| Pests      | Report mosquitoes or standing water          | Biting mosquitoes and breeding water on private property (with access), in public spaces, and in nearby catch basins                      |
| Pests      | Report pigeon droppings, nesting, or feeding | Roosting, nesting, droppings, feathers, and people who feed pigeons                                                                       |
| Sanitation | Report a sewage leak or backup               | Active sewage from a drain, toilet, cleanout or pipe, inside or outside a building                                                        |
| Sanitation | Report animal waste on a property            | Dog and cat waste and raccoon droppings, on private property only                                                                         |
| Sanitation | Report mold                                  | Visible mold, the 10 sq ft threshold, the moisture source, and a referral for leaks                                                       |
| Sanitation | Report garbage, clutter, or overgrown plants | Garbage, excessive materials, overgrown vegetation, with links to Adult Protective Services and the Fire Marshal                          |

- **SRO:** remove the separate SRO report page. Add a 1-line "Live in an SRO or residential hotel?" note to each report page instead. Confirmed: all complaints go to one clerk, who assigns SRO cases to senior inspectors, so there's no separate intake.
- **Shared content:** text repeated on every report page (anonymity, the landlord notice, how reports are processed) moves to _What happens after you report_ and _Tenant rights_. Report pages keep only what's specific to their condition.
- **Raccoon droppings:** HHVC cites them under animal waste because of the roundworm egg risk. Tell people to report them, not clean them up, and link the CDC raccoon roundworm guidance. Don't write cleanup steps on the page.
- **Animal waste is prominent.** It's one of HHVC's largest complaint areas.
  - List it high in the report group on the Topic and Agency pages.
  - Use the words people search for in the description, for example "Dog poop, cat waste, or raccoon droppings in a yard, building, or shared area."
  - Cross-link it from the rats page, _Rat-free blocks_ and the IPM pages with "Pick up pet waste daily. It feeds rats."
- **Mosquitoes:** HHVC finds water sources and treats them, so the page needs its own Transaction.
  - The dead-bird West Nile referral moves here from the insects page.
  - The _Mosquito Control Program_ page links to this Transaction instead of holding a "Report mosquitoes" task section.
  - Move the page up in the Topic and Agency lists during mosquito season.
- **Confidentiality:** HHVC never shares the identity of the person who reports.
  - Use one sentence, the same on every page: "We never share your name or contact information."
  - Say it once per page.
  - Remove "Reporter identities are only shared with the City Attorney's Office" from the garbage page and _What happens after you report_.
- **Pigeons get their own report page.** HHVC cites roosting, nesting, feces, feathers, and people who feed pigeons.
  - Title: "Report pigeon droppings, nesting, or feeding" (44 characters).
  - The description names roosting and feathers, so those searches land here too.
  - Pigeon droppings move off the animal waste page; that page links here.
  - The feeding case means the reported person may be a neighbor, not the owner. Say what HHVC does in that case.
- **Insects page scope.** Keep "Report cockroaches or other insects," with each insect routed by how HHVC handles it:
  - **Flies:** cited, but usually a garbage or feces problem. Keep them on the insects page, and point to the garbage and animal waste pages. Add short education tips for drain flies and fruit flies.
  - **Mites:** cited, but usually a rat violation. Keep them on the insects page. Also name them on the rats and pigeon pages, since they often come with those.
  - **Wasps:** HHVC confirms the nest. If it's on public property, HHVC refers it to DPW. Replace "until it's treated" with what happens next.
  - Open: what HHVC does with a nest on private property.
- **Animal waste: private property only.** HHVC doesn't respond to dog waste on public property, such as sidewalks and streets.
  - Say this at the top of the animal waste page.
  - Send public-property reports to the right 311 service. Confirm the agency, likely Public Works street cleaning.
- **Mosquito page, Things to know.** HHVC looks for water sources on private property, if the owner or resident grants access, and in public spaces. It also checks public catch basins near the report for larvae.
  - Item 1: what HHVC checks (private property with access, public spaces, nearby catch basins).
  - Item 2: access. Tell people an inspector may ask to enter a yard or property, so including a contact helps.
- **Topic page: use the existing one.** _Healthy housing conditions_ is an existing Topic page. Fold _Healthy housing and pest resources_ and _Look up building records_ into it, then retire those 2 Resource Collections. Use the structure in the Topic page tab, with the report pages grouped as Pests and Sanitation.
- **Clutter page referrals.** The garbage and clutter page links to:
  - **Adult Protective Services:** when an older or dependent adult living with excessive materials may need help
  - **The Fire Marshal:** when stored materials block exits or create a fire risk
  - Link the SF.gov pages for both. Phrase them as offers of help, not threats of enforcement.

### Pages that aren't transactions (C1, decided Nov 24, 2026)

All 6 change type or merge. Each one changes the page's URL and its `pages.path` row.

- **Fix your HHVC violation:** merge into the step-by-step _Correct a violation and close your case_.
- **Get ready for a follow-up inspection:** folds into _Correct a violation and close your case_, not an Information page. "Document your work" goes into step 5 (_Keep proof of the work_) and "What to expect at the follow-up visit" into step 6 (_Pass the re-inspection_). The page is removed.
- **Get ready for a housing inspection after you report:** folds into step 3 (_Get ready for the inspection_) of _Report a pest problem, start to finish_. That inspection comes before any violation, so it doesn't belong in the violation step-by-step. The page is removed.
- **What tenants need to do after a Notice of Violation:** Information page.
- **Find complaints and inspection records** and **Look up residential health code violations:** combine into one Transaction.

### Custom headings become "What to do" (C2, decided Nov 24, 2026)

Rename the custom heading to "What to do" on the Transaction pages that keep their type: public records, inspector lookup, complaints records (the combined lookup from C1) and hotel records. The other 3 of the 7 leave the Transaction type under C1: the 2 "get ready" pages become steps and tenant steps becomes an Information page, so their headings don't need renaming.

### Placeholder pages are not Blocked (C3, decided Nov 24, 2026)

The citation and inspector lookup pages stay as they are. This is a mockup: the payment link and the lookup tool get filled in when the editor builds the live Karl page, so the mockup doesn't wait on them.

### Disallowed Related links wait for the Topic merge (C4, decided Nov 24, 2026)

Leave the Related links to _Look up building records_ in place for now. The Topic page merge retires that Resource Collection, and its links go with it. Not covered by the merge: the inspector lookup page's link to the HHVC Agency page.

### Drop articles from URLs (C5, decided Nov 24, 2026)

The 3 Transaction URLs that keep their page lose the "a". The 2 "get ready" pages are removed under C1, so they aren't renamed.

| Now                                                  | New                                                |
| ---------------------------------------------------- | -------------------------------------------------- |
| `pay-a-healthy-housing-citation`                     | `pay-healthy-housing-citation`                     |
| `appeal-a-notice-of-violation`                       | `appeal-notice-of-violation`                       |
| `make-a-public-records-request-environmental-health` | `make-public-records-request-environmental-health` |

- **The appeal page's title changes to match its URL:** "Question a Notice of Violation" becomes "Appeal a Notice of Violation". The URL keeps "appeal" rather than changing to "question".
- Each rename changes the page's `pages.path` row too.

### Descriptions don't repeat the title (C6, decided Nov 24, 2026)

Rewrite each description that reuses title words, using the Analysis panel's list for that page. Less is more: cut the repeated words rather than replace them with new ones, and keep the description short.

### Annual fee page: no changes in the mockup (C7, decided Nov 24, 2026)

Leave the page as it is: the due-date wording, the $115 vs. $117 half-hour reinspection fee and the "What the annual fee supports" callout. They get fixed when the page moves to Karl.

### Sewage page

"Report a sewage leak or backup" covers sewage from a drain, toilet, cleanout or pipe, inside or outside a building, including yards and shared areas. HHVC responds within 48 hours of the complaint. The owner hires a plumber, and HHVC confirms the sewage is removed and the area sanitized. A leaking pipe with no sewage goes to another agency.

| Question                                                                           | What it decides                                                                                                                         |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| How fast does HHVC respond to sewage?                                              | Whether the page says to call 311 right away. Answered: HHVC responds within 48 hours of receiving the complaint, so yes.               |
| Who repairs the plumbing once HHVC confirms a leak: the owner, with DBI enforcing? | The "what happens next" line. Answered: the owner must hire a plumber. HHVC only confirms the sewage is removed and the area sanitized. |
| A leaking pipe with no sewage goes to another agency?                              | The plumbing vs. sewage line. Answered: yes, a leaking pipe with no sewage goes to another agency (DBI, per the draft pages).           |
| Sewage from the building's sewer line vs. the public sewer (likely SFPUC)?         | Routing for sewage outside, at the property line                                                                                        |

### Review app

- Add a `karlField` key to every copy field, plus one schema per content type. The schemas come from Karl's field lists.
- Display modes: **1. Karl overlay** (default) and **2. Blueprint view** with an orphan tray. See the Claude Code planning prompt.
- Build order: field mapping and display modes first, then fixes within existing pages, then page-type changes and merges, then the report reorganization above.

## Still open

- **Raccoon droppings and latrines:** does HHVC cite the property owner in every case? Article 11 §596 also allows a manager, or whoever created the condition.
- **Wasp nest on private property:** what HHVC does after confirming it
- **A neighbor feeding pigeons:** what HHVC does
- **Sewage at the property line:** the building's sewer line vs. the public sewer (likely SFPUC)
- **Agencies to confirm:** Public Works for dog waste on public property, DBI for a leaking pipe with no sewage, and SF311 for no separate SRO category
- **From the drafts:** the bed bug 2-working-day rule, the 72-hour wait (§V.2) and one program name. See the To confirm table.

## Questions and answers

| Question                                                                                           | What it decides                                                                                                                                          | Who answers       | Answer                                                                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pigeons: does HHVC cite droppings only, or also roosting, nesting or feeding?                      | Droppings only: add "or pigeon droppings" to the animal waste title. Roosting, nesting or feeding: a separate "Report pigeon droppings or nesting" page. | HHVC              | Answered: HHVC cites roosting, nesting, feces, feathers, and people who feed pigeons. Moved to Decided.                                                                                                                                                              |
| Which of wasps, mites and flies does HHVC inspect and cite?                                        | Whether the insects page becomes "Report cockroaches" with referrals. Also whether "until it's treated" (wasp nests) stays.                              | HHVC              | Answered: flies are cited, usually as a garbage or feces issue, with education on drain and fruit flies. Mites are cited, usually as a rat violation. Wasps: HHVC confirms the nest and refers it to DPW if on public property. Moved to Decided.                    |
| Live raccoons: does HHVC refer them to Animal Care and Control?                                    | Whether a referral line goes on the rats and animal waste pages                                                                                          | HHVC              | Partly answered: the owner hires a private wildlife company to remove live raccoons. Droppings and latrines: to confirm. Article 11 puts the duty on the property owner, and a Notice of Violation can also go to a manager or whoever created the condition (§596). |
| Dog waste on public sidewalks: Public Works street cleaning or HHVC?                               | The "private property vs. sidewalk" routing on the animal waste page                                                                                     | SF311             | Answered: HHVC doesn't respond to dog waste on public property. Moved to Decided.                                                                                                                                                                                    |
| Do SRO complaints use a separate team or 311 category?                                             | Whether the SRO report page stays                                                                                                                        | SF311             | Answered: all complaints go to one clerk, who assigns SRO cases to senior inspectors. No separate intake, so no separate SRO page. Confirm with SF311 that there's no separate 311 category.                                                                         |
| Mosquito coverage: private property, shared areas, public catch basins?                            | The mosquito page's Things to know                                                                                                                       | HHVC              | Answered: HHVC looks for water sources on private property (if access is granted) and in public spaces, and inspects nearby public catch basins for larvae. Moved to Decided.                                                                                        |
| Is _Healthy housing conditions_ a real or approved Topic? Only Digital Services can create Topics. | The Topic page merges and the retirement of the 2 hub Resource Collections                                                                               | Digital Services  | Answered: Healthy housing conditions is an existing Topic page. Moved to Decided.                                                                                                                                                                                    |
| Clutter and hoarding: which support resources to name?                                             | The tone and referrals on the garbage and clutter page                                                                                                   | Supervisor or DPH | Answered: link to Adult Protective Services and the Fire Marshal. Moved to Decided.                                                                                                                                                                                  |

### To confirm: answers found in the draft pages

The writing audit (findings.csv) quotes draft text that answers some Open questions. Confirm each one before moving it to Decided.

| Open question         | What the drafts say                                                                                                                                                      | Row      | If confirmed                                                                                                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wasps, mites, flies   | Article 11 §581(b)(8): "cockroaches, bed bugs, fleas, flies, wasps, and mosquitoes." Mites aren't listed.                                                                | 292      | Wasps, flies and **fleas** stay on the insects page (fleas are missing now). Confirmed: wasps, mites and flies all stay on the insects page. Insects and mites that come with rats or pigeons are also named on those pages. |
| Pigeons               | _Learn what HHVC can inspect_ lists "pigeon droppings or roosting"; Article 11 page: don't let animals "nest, roost, or live" on a property in ways that create a hazard | 100, 281 | Confirmed. Pigeons get their own page: "Report pigeon droppings, nesting, or feeding" (see Decided)                                                                                                                          |
| Sewage timing         | "Sewage Backups (48 to 72 hours): Raw sewage backups require immediate correction"                                                                                       | 124      | 48–72 hours is the owner's correction deadline, not HHVC's response time. HHVC itself responds within 48 hours of receiving the complaint (confirmed).                                                                       |
| Bed bugs              | "A property owner or manager must initiate professional treatment within 2 working days of confirmation"                                                                 | 132      | Goes on the bed bug page's Things to know                                                                                                                                                                                    |
| 72-hour landlord wait | Owners must "investigate any tenant reports of pest activity within 72 hours (Director's Rules §V.2)"                                                                    | 54, 83   | Confirms the 72-hour step on report pages; cite §V.2                                                                                                                                                                         |
| One program name      | "You may see any of these names used across this site — they refer to the same program."                                                                                 | 105      | Pick 1 public name, with inspector vs. investigator and reinspection vs. re-inspection                                                                                                                                       |

## Replaced

- **Transaction pages tab:** findings for _Report cockroaches, mosquitoes, and other insects_, _Report garbage, mold, and overgrown vegetation_ and _Report a problem in an SRO or hotel_ now apply to the 9 new pages above. Specific findings that still hold for the new pages: step order, the confidentiality wording, the mold leak referral and the audience lines.
- **Information pages tab:** "Mosquito Control Program: 'Report mosquitoes or standing water' is a task" is resolved by the new mosquito Transaction.
- **Campaign pages tab:** the 2 workshops become Transactions, not Events. That tab already says so; an earlier suggestion in chat said Events.
- **Resource Collection pages tab:** decision 1 now says to fold the hub pages into the existing Topic. Only Digital Services can create Topics, so new ones aren't an option.
- **Transaction pages tab, blocker 4:** the confidentiality conflict is resolved. Use the Confidentiality decision above. This also resolves finding #25 in the page-structure audit sheet.

---

# HHVC transaction pages: Karl review

Nov 23, 2026 · @David Arrizon

## Summary

The copy is solid, but about a third of the 16 Transaction pages aren't really transactions, and several use sections or links Karl's Transaction editor doesn't offer. The app's Analysis panel passes all of these problems.

Scope: the 16 pages the [HHVC mockup review app](https://sfhealthyhousing.netlify.app) labels "Service" (Karl's Transaction type). Pages were classified by the app's label; 4 of the 23 non-transaction pages were spot-checked.

## What Karl requires

| Rule           | Karl's requirement                                                                                                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One action     | A single interaction or exchange you can do with the City. Everything must move the user forward; "info about something" goes on its own Information page.                                                                |
| Fixed fields   | Title, Description, Primary agency, What to know (Cost, Things to know), What to do, Supporting information (accordion or custom section), Why it's good for the community, Related, Contact us, Partner agencies, Topics |
| What to do     | The heading is hard-coded: it can't be renamed or removed.                                                                                                                                                                |
| Things to know | Helps people decide whether to use the service. No more than 2 items recommended.                                                                                                                                         |
| Related        | Only Transaction, Information, Campaign or Topic pages                                                                                                                                                                    |
| Title          | Under 65 characters, starts with a verb                                                                                                                                                                                   |
| Description    | 110 characters or fewer, key words first, don't reuse words from the title                                                                                                                                                |
| URL            | sf.gov/ plus the service name including the verb, articles dropped (`apply-for-cannabis-equity-permit`)                                                                                                                   |

## Blockers

### 1. Six pages aren't transactions

| Page                                                | Problem                                                         | Fix                                                                   |
| --------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------- |
| Fix your HHVC violation                             | 5 steps over time, several links, no button, no Related         | Merge into the step-by-step _Correct a violation and close your case_ |
| Get ready for a follow-up inspection                | Preparation guidance, no City action                            | Information page or a step in the step-by-step                        |
| Get ready for a housing inspection after you report | Preparation guidance, no City action                            | Information page or a step in the step-by-step                        |
| What tenants need to do after a Notice of Violation | Title doesn't start with a verb; rights and preparation content | Information page                                                      |
| Find complaints and inspection records              | Same tool as the violations lookup                              | Combine into one transaction                                          |
| Look up residential health code violations          | Same tool as the complaints lookup (the page says so)           | Combine into one transaction                                          |

### 2. Seven pages render headings in place of "What to do"

Follow-up, housing inspection, tenant steps, public records, inspector lookup, complaints records and hotel records use headings such as "Document your work", "Before the inspector arrives", "Open the lookup tool" and "Submit your request". Karl can't build these. The SRO page also puts a "What this covers" H2 above What to do, where Karl has no field.

### 3. Placeholders and internal notes in public copy

- **Citation page:** "PLACEHOLDER" in Cost and in step 2, and no pay button. A payment transaction without a payment link doesn't work.
- **Inspector lookup:** "The exact lookup tool and destination have not been confirmed yet" sits in What to know, and "This button is a placeholder" is in the body.

Both pages should be Blocked.

### 4. Confidentiality wording contradicts itself

The garbage page's step 1 callout says "The City will never share your name or contact information," but its step 4 callout says "Reporter identities are only shared with the City Attorney's Office." The rats and insects pages repeat "never." Get one sentence confirmed and use it everywhere; it's a legal claim.

### 5. Related links to types Karl doesn't allow

| Page                   | Disallowed links                                                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Pay your annual fee    | Look up building records, Property owner responsibilities, Healthy housing and pest resources (all Resource Collection) |
| Public records request | Look up building records                                                                                                |
| Inspector lookup       | Look up building records; Healthy Housing and Vector Control (Agency)                                                   |
| Complaints records     | Look up building records; also links the Agency page in "If you need to report a new problem"                           |
| Violations lookup      | Look up building records                                                                                                |
| Hotel records          | Look up building records                                                                                                |

## Revise

### Report pages (garbage, rats, insects)

- **Step order is wrong.** Step 1 is the 311 button, step 2 is "Notify your landlord _before_ reporting", and step 3 is what to tell us. Put the landlord step first, then what to include, then the button last.
- **Things to know is overloaded.** Each page has Cost, 2 labeled items and 4 unlabeled audience lines ("A tenant affected by…"). Transactions have no audience field. Cut the audience lines.
- **Content is repeated.** Anonymity appears 3–4 times per page. The 72-hour rule appears twice, as "72 hours" and "3 days." The 10 sq ft mold rule appears 3 times on the garbage page. The dead-bird off-ramp appears 4 times on the insects page.
- **Too much "info about" content.** "How your report is processed" copies _What happens after you report_; replace it with a Related link. Move the "While you wait" tips and the UC IPM, CDC and NEHA cards to an integrated pest management (IPM) Information page. Check that the card component exists on Transactions; external sites can't go in Related.
- **Mold from leaks has no referral.** The garbage page tells people to look for plumbing leaks but doesn't say who handles leak-caused mold. HHVC doesn't handle plumbing, so add a line pointing to the agency that does.

### Other pages

- **No Contact us block on any page.** On _Question a NOV_ and _Fix violation_, contacting the investigator is the main action. On the annual fee page, the email and phone number are buried in a bullet.
- **Annual fee page:** the step 5 heading says "Pay by the due date," but the body says "Pay within 30 days of the invoice due date." The reinspection half-hour fees look inconsistent: $256/hr gives $128 for a half hour, but $234/hr gives $117, not $115. Check against the fee schedule. Cut the "What the annual fee supports" callout; it isn't actionable.
- **SRO page:** "or hotel" is ambiguous, since the hotel records page says tourist hotels use the general lookup. It also has no landlord step and no confidentiality callout, unlike the other report pages. Check whether that's intentional.

### Titles, descriptions and URLs

All titles are under 65 characters. 4 descriptions are over Karl's 110-character limit: insects (123), fix your violation (118), garbage (117) and rats (112). An earlier version of this review said none were; that count came from page summaries, not the live text.

- **Word reuse:** almost every description starts by repeating the title. Worst: annual fee (6 reused words), rats (5), garbage, insects and SRO (4 each). Complaints records is the model, with 1.
- **Articles in slugs:** `pay-a-…`, `appeal-a-…`, `get-ready-for-a-…` (×2) and `make-a-…` should drop the "a."
- **Slugs that don't match titles:** `appeal-a-notice-of-violation` vs. "Question…", and `lookup-…` vs. "Look up…".

### Reading level

10 of the 16 are above the target the app sets for them. Worst: complaints records and violations lookup (grade 10); fix violation, follow-up, public records, inspector lookup and hotel records (grade 9). Only the citation and NOV pages reach grade 5. The app sets per-page targets of grade 6–7, but Karl's guideline is grade 5; score against 5.

### Mostly fine

_Make a public records request_ (remove the duplicated "check the lookup tools first"), _Question a NOV_, and _Find residential hotel and shelter records_ apart from its Related link.

## Gaps in the Analysis panel

> **Status, 2026-11-24:** "What to do section: Pass on every page" was fixed by #208, which reads the placement instead of note prose. The rest are closed on branch `docs/plan-transaction-review-fixes`: Related link types now checked on sections placed in Related (A1), title words in the description (A3), articles in slugs (A4), and a Transaction with no button and no Contact us (A5). More than 2 Things to know was already checked. "PLACEHOLDER" stays uppercase-only by an earlier decision; a placed button linking to `#` is now flagged (A2), and the inspector lookup's `#` button already shows under "Copy that won't carry over".

These checks would have caught most of the above:

- **"What to do section: Pass"** shows on every page, including the seven without that heading. It's likely reading a data field, not the rendered page.
- **Missing checks:**
  - "PLACEHOLDER" strings
  - Title words reused in the description
  - Content type of Related links
  - More than 2 Things to know items
  - Articles in slugs
  - A Transaction with no button and no Contact us

## Sources

- [Transaction](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/building-a-page-by-content-type/transaction)
- [How a Transaction page works](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/building-a-page-by-content-type/transaction/how-a-transaction-page-works)
- [What to know before you start](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/building-a-page-by-content-type/transaction/what-to-know-before-you-start-section-cost-and-things-to-know)
- [What to do section](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/building-a-page-by-content-type/transaction/what-to-do-section-on-a-transaction-page)
- [Choosing a content type](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/choosing-a-content-type)
- [Description](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/components/description)
- [Title](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/components/title)
- [URLs](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/components/urls)
- [HHVC mockup review](https://sfhealthyhousing.netlify.app)

---

# Information pages: Karl review

All 7 Information pages are above Karl's grade-5 reading level. Most also carry actionable sections or components that Karl doesn't offer on this type. Two pairs overlap enough to merge, and the Analysis panel catches some of these problems but misses others.

Scope: the 7 pages the app labels "Info Page". _Health Code Article 11 in plain language_ is a Report, and the two workshops are Campaigns, so they're excluded.

## What Karl requires

| Rule        | Karl's requirement                                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose     | Reference information "when there is nothing directly actionable to be done." If the content asks the user to do something, move it to a Transaction.         |
| Fields      | Title, Description, Primary agency, Part of (Transaction pages only), Information section (Title and text, Image, Callout), Partner agencies, Topics, Related |
| Not offered | Contact us, resource tiles (Karl supports those on About, Campaign, Resource collection and Topic pages only), audience lines, numbered steps                 |
| Related     | Only Transaction, Information, Campaign or Topic pages                                                                                                        |
| URL         | sf.gov/information/title-of-page                                                                                                                              |
| Style       | Sentence case, grade 5 or below, numerals for all numbers                                                                                                     |

## Page by page

| Page                                                        | Grade | Main problems                                                                                                                                                                                                                                       |
| ----------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Integrated pest management for property owners and managers | 11    | 1,042 words. Numbered headings 1–5 read as steps, plus resource tiles, a Contact us section and a Resource Collection in Related (all flagged by the app).                                                                                          |
| What happens after you report a housing or pest problem     | 10    | A 5-step process list (flagged). "How to follow up on your report" is a task. "Agency Hand-off" isn't sentence case.                                                                                                                                |
| Learn what Healthy Housing and Vector Control can inspect   | 10    | "Have this ready when you report" and "How to choose the right page" are tasks. Related includes the HHVC Agency page. Partner agencies lists the State West Nile virus program, which isn't an SF Agency page. Slug uses the acronym `hhvc`.       |
| Article 11 compliance for property owners                   | 10    | "What Article 11 requires" and "What you're required to do" restate each other. Fees say "from $103 to $808 or more," but the fee transaction caps at $808 for more than 30 units. Contact us section and Resource Collection in Related (flagged). |
| Mosquito Control Program                                    | 9     | "Report mosquitoes or standing water" is a task. "More mosquito resources" uses resource tiles. No Related. A program name as title points to a Campaign per Karl ("Program is about…").                                                            |
| Tenant rights when reporting housing conditions             | 8     | "What you can do" and the notify-owner → 72 hours → 311 sequence are tasks. "Where to get tenant help" uses resource tiles. The 72-hour callout runs 4 sentences.                                                                                   |
| Who to call about a housing problem                         | 7     | 3 unlabeled audience bullets. Related links a Step by step (_Report a pest problem, start to finish_) and a Resource Collection (_Healthy housing and pest resources_), both disallowed. Retaliation section duplicates _Tenant rights_.            |

## Fixes across pages

1. **Merge 2 pairs.** _Learn what HHVC can inspect_ and _Who to call_ both route problems to offices and list what HHVC handles; make one page. _Article 11 compliance_ overlaps _Property owner responsibilities_, the IPM page's section 1, the fee transaction and the Article 11 Report; keep one owner-duties source and link the rest.
2. **Move tasks out.** Turn "have this ready," "follow up," "what you can do" and "report mosquitoes" sections into links to the matching Transaction, or rewrite them as description.
3. **Remove unsupported components.** Resource tiles (IPM, Tenant rights, Mosquito), Contact us (IPM, Article 11) and audience lines (all 7) become body text or come out.
4. **Fix URLs.** Article 11 renders `sf.gov/information--article-11-compliance-for-property-owners` (double dash, no slash), and Mosquito renders `sf.gov/mosquito-control-program` (no `/information/`).
5. **Fix Related.** Remove the Agency, Step by step and Resource Collection links listed above; link them from body copy instead.
6. **Cut one shared message per topic.** Retaliation appears on 3 pages and the DBI referral on 3. Keep each on its home page and link to it.

## Titles and descriptions

All titles are under 65 characters. The Article 11 compliance description is 169 characters, over Karl's 110 limit, and includes an internal note: "modeled on the SF.gov minimum wage ordinance page." Remove the note. Word reuse is low except _Article 11 compliance_, whose description repeats "Article 11," "property" and "owners." _Learn what HHVC can inspect_ starts with a task verb, which Karl associates with Transactions.

## Gaps in the Analysis panel

- **Resource tiles** are flagged on the IPM page but passed on _Tenant rights_ and _Mosquito_.
- **Related** catches Resource Collections but passes the Agency link (_Learn what_) and the Step by step and Resource Collection links (_Who to call_).
- **"Information stays non-actionable"** catches numbered lists only, so it passes task sections written as bullets or prose.
- **Missing checks:** URL format (`/information/` prefix), audience lines, Partner agencies that aren't SF Agency pages, and sentence-case headings.
- **Targets:** the app scores against grades 6–7; Karl's guideline is 5.

## Sources

- [Information](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/building-a-page-by-content-type/information)
- [How an Information page works](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/building-a-page-by-content-type/information/how-an-information-page-works)
- [Related](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/components/related)
- [Resources](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/components/resources)
- [Choosing a content type](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/choosing-a-content-type)
- [Build a sample Information page](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/sf.gov-and-karl-foundations/get-your-sf.gov-login/what-to-do/build-a-sample-information-page)
- [HHVC mockup review](https://sfhealthyhousing.netlify.app)

---

# Resource Collection pages: Karl review

Three of the 4 Resource Collection pages are hubs of links to SF.gov services rather than collections of documents. Karl's Topic type fits that job better. The fourth, _Guides in other languages_, is all placeholders. None of the 4 URLs follows Karl's format, and 3 pages use a Related section that Karl's Resource Collection type doesn't have.

Scope: the 4 pages the app labels "Resource Collection".

## What Karl requires

| Rule        | Karl's requirement                                                                                                                                                                              |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose     | "A list of various documents": PDFs, links to Data Story pages, and links to pages on SF.gov or other sites                                                                                     |
| Audience    | "People who want to do more research on a topic, and people who need a series of PDFs to print out"                                                                                             |
| Fields      | Title, Description, Primary agency, Data dashboard, Introductory text, Body, Documents, Resources, Data stories, Custom section (an optional paragraph at the bottom), Topics, Partner agencies |
| Not offered | Related, audience lines, Contact us                                                                                                                                                             |
| Linking     | Resource Collections must be linked manually from other SF.gov pages                                                                                                                            |
| URL         | sf.gov/resource/year/title-of-resource                                                                                                                                                          |

## Page by page

| Page                               | Grade | Rendered URL                                              | Main problems                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------- | ----- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Property owner responsibilities    | 17    | `sf.gov/property-owner-responsibilities-hhvc`             | The intro averages 21 words per sentence. "Owner obligations" lists 4 links, 3 of them transactions, not obligations. Overlaps the _Article 11 compliance_ Information page. Has a Related section.                                                                                                                                                                  |
| Look up building records           | 12    | `sf.gov/look-up-building-records`                         | The verb-first title reads like a Transaction. All 6 links are SF.gov services. Has a Related section.                                                                                                                                                                                                                                                               |
| Healthy housing and pest resources | 8     | `sf.gov/resource--healthy-housing-and-vermin-information` | The slug says "vermin"; the title says "pest". There are 20 links across 6 sections, mostly SF.gov pages, including an Agency page, a Campaign and another Resource Collection. "Prepare your unit for bed bug treatment" doesn't match the step-by-step title _Prepare your unit for pest treatment_. The fee schedule is filed under "More trusted pest guidance." |
| Guides in other languages          | 7     | `sf.gov/resource/guides-in-other-languages`               | All 5 guides are placeholders with unconfirmed languages. There are 3 unlabeled audience lines and a Related section. Confirm "Ask for an interpreter before an inspection, not on the day" is program policy.                                                                                                                                                       |

No URL includes the year Karl requires, and the healthy housing page renders a double dash with no slash.

## Decisions

1. **Fold the service hubs into the existing Topic.** _Look up building records_ and _Healthy housing and pest resources_ mostly list Transactions, which the _Healthy housing conditions_ Topic already lists or can list automatically by tagging. Only Digital Services can create Topics, so use the existing one rather than new ones. See the Topic page tab.
2. **Merge owner duties.** Fold _Property owner responsibilities_ and _Article 11 compliance_ into one page. Keep the fee schedule PDF as a Document, either on that page or in a true Resource Collection.
3. **Block Guides in other languages** until the guides and their languages are confirmed. It's the one page here that fits Karl's purpose for Resource Collections: a set of printable documents.

If 1 and 2 happen, most of the Related links flagged on the Transaction and Information tabs become valid, because Topic and Information pages are allowed in Related.

## Fixes on every Resource Collection page

- Fix URLs to `sf.gov/resource/<year>/<title>`.
- Remove the Related sections. Use Body links or the Custom section instead.
- Cut audience lines.
- Put PDFs under Documents so they show publish dates. Put links under Resources.

## Titles and descriptions

All titles are under 65 characters and all descriptions are 110 or fewer. _Guides in other languages_ reuses "guides" and "languages" in its description. _Look up building records_ reuses "records."

## Gaps in the Analysis panel

- These pages get only 3 generic checks: link text, bare URLs and paragraph length. None of the checks is specific to Resource Collections.
- **Missing checks:**
  - Related section present (not a Resource Collection field)
  - URL format with year
  - "Placeholder" text in items
  - Item type: Document, Resource or Data story
  - Share of links that point to SF.gov Transactions, a sign the page should be a Topic
- The panel showed _Property owner responsibilities_ at grade 17 with no extra warning; any page this far over target should be flagged.

## Sources

- [Resource Collection](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/building-a-page-by-content-type/resource-collection)
- [How a Resource Collection page works](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/building-a-page-by-content-type/resource-collection/how-a-resource-collection-page-works)
- [Custom section on a Resource Collection page](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/building-a-page-by-content-type/resource-collection/custom-section-on-a-resource-collection-page)
- [Resources](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/components/resources)
- [Related](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/components/related)
- [HHVC mockup review](https://sfhealthyhousing.netlify.app)

---

# Step by step pages: Karl review

The 3 Step by step pages read well (grades 5–6) and use the right URL format. They break Karl's linking rules, though, and none can absorb the pages the Transaction tab suggested merging until that's fixed. _Prepare your unit for pest treatment_ is a one-visit checklist, not a multi-step process, and fits Information better.

## What Karl requires

| Rule        | Karl's requirement                                                                                                                                         |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose     | An overview of a process with many steps, "usually over a long period of time." Details go on Transaction or Information pages.                            |
| Fields      | Title, Description, Primary agency, Intro, Steps, Topics, Partner agencies                                                                                 |
| Not offered | Related, audience lines, a "What to do" heading                                                                                                            |
| Steps       | Up to 15, aim for no more than 5. Each has a title, optional cost and time, a description, and an Optional checkbox. Step types are Number, "and" or "or". |
| Links       | Each step links to one Transaction or none. Information pages and other Step by steps can't be step links.                                                 |
| Intro       | A few sentences that help people decide whether this process applies, including eligibility or requirements                                                |
| Title       | Starts with a verb, no program name                                                                                                                        |
| URL         | sf.gov/step-by-step/title                                                                                                                                  |

## Page by page

| Page                                    | Grade | Steps | Main problems                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------- | ----- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Report a pest problem, start to finish  | 5     | 6     | Step 1 lists 4 report pages, but a step takes 1 link; make them 4 "or" steps. Steps 2 and 4 link Information pages, and step 5 links 2 pages. Step 2, checking what HHVC inspects, belongs before reporting. Steps 4–6 repeat _Correct a violation_; collapse them into 1 step that names it in the description. Step 3 as rendered asks for 72 hours' notice before entry, which conflicts with the 72-hour landlord-response rule on the report pages; check the wording. |
| Correct a violation and close your case | 6     | 7     | Steps 2 (owners) and 3 (tenants) happen in parallel; use the "and" type. Make step 4 (ask for more time) Optional. Step 7 ("If it is not corrected") is an outcome, not a step; move it into the Intro. That leaves 5 numbered steps.                                                                                                                                                                                                                                       |
| Prepare your unit for pest treatment    | 5     | 6     | No step links a Transaction. All 6 steps are tasks for a single visit, not a process over time. Karl's own Information example, "What to do with an Eviction Notice," fits this pattern. Step 6's "Report cockroaches…" bullet renders with no link.                                                                                                                                                                                                                        |

All 3 pages also have no Description, which Karl offers and recommends for search. They also have a Related section and audience lines; Karl offers neither on Step by steps. _Report a pest problem_ and _Prepare your unit_ render a "What to do" heading, and _Prepare your unit_ adds a "Who this information is for" H2.

## How this changes the earlier merges

1. **Fix your HHVC violation → Correct a violation.** This still works. Its 5 steps map onto the 5 numbered steps above. Move its owner and tenant bullets into the step descriptions.
2. **The "Get ready" pages.** The Transaction tab suggested turning both into Information pages. A step can't link an Information page, so put their few lines into the step descriptions of _Report a pest problem_ (step 3) and _Correct a violation_ (re-inspection step) instead of keeping separate pages.
3. **Prepare your unit.** Make it an Information page and mention it in the tenant step's description. The tenant step can't link to it.

## Gaps in the Analysis panel

The "Number of steps" check works. **Missing checks:**

- Missing Description
- Related section present (not a Step by step field)
- More than 1 link per step, or a step link that isn't a Transaction
- Audience lines and extra H2s
- Steps that are outcomes or conditions ("If…") rather than actions

## Sources

- [Step by step](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/building-a-page-by-content-type/step-by-step)
- [How a Step by step page works](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/building-a-page-by-content-type/step-by-step/how-a-step-by-step-page-works)
- [Steps](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/building-a-page-by-content-type/step-by-step/steps)
- [Intro on a Step by step page](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/building-a-page-by-content-type/step-by-step/intro-on-a-step-by-step-page)
- [Title and description on a Step by step page](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/building-a-page-by-content-type/step-by-step/title-and-description-on-a-step-by-step-page)
- [Information](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/building-a-page-by-content-type/information)
- [HHVC mockup review](https://sfhealthyhousing.netlify.app)

---

# Topic page: Karl review

_Healthy housing conditions_ already does what the _Healthy housing and pest resources_ Resource Collection does: 6 of its 7 "Guidance and resources" links appear there too. Fold the Resource Collection into this Topic instead of creating new Topics. Only Digital Services can create Topics, so confirm with them that this Topic exists or will be approved.

## What Karl requires

| Rule           | Karl's requirement                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose        | "A single entry-point to a variety of content related to a category," grouped by theme rather than department                                           |
| Who makes them | Only Digital Services. Topic governance groups with staff from several departments decide what goes on topic pages.                                     |
| Services       | Transactions tagged to the Topic appear automatically under "More services." Pages added by hand appear under "Services" and drop out of More services. |
| Organization   | Services and resources can be grouped by subheading. Child topics create a hierarchy.                                                                   |
| URL            | sf.gov/topics/name-of-topic                                                                                                                             |

Karl's docs disagree on whether tagged Step by steps appear automatically: the Topic page says yes, and the Step by step page says no. Confirm with Digital Services.

## Findings

| Area                   | Finding                                                                                                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| URL                    | Renders `sf.gov/topics--healthy-housing-conditions`; should be `sf.gov/topics/healthy-housing-conditions`.                                                                                                                      |
| Intro                  | "We help keep San Francisco housing healthy by protecting residents from vermin and other hazards" scores grade 14 because the 62 words are spread over only 4 sentences. It uses "vermin" where every other page says "pests." |
| Description            | None. Add one under 110 characters.                                                                                                                                                                                             |
| Audience line          | "This page is for tenants, property owners and managers…" isn't a Topic field. Cut it.                                                                                                                                          |
| General housing issues | Lists 3 report Transactions plus the HHVC Agency page, which isn't a service. _Report a problem in an SRO or hotel_ is missing.                                                                                                 |
| Look up records        | Holds 1 item, the _Look up building records_ Resource Collection. List the lookup Transactions here directly; once the Transaction tab's merge is done, that's 3.                                                               |
| Guidance and resources | 7 items, including the _Healthy housing and pest resources_ Resource Collection, which duplicates this list.                                                                                                                    |
| Missing services       | None of the owner Transactions (annual fee, citation, Question a NOV) and none of the 3 Step by steps. Tagging them to the Topic would list them automatically.                                                                 |
| Related                | The 2 workshops. Allowed as Campaigns, but they may be Event pages (not yet reviewed).                                                                                                                                          |
| Spotlight button       | "Start a report" doesn't say where it goes (311). Karl doesn't say whether Topic pages offer spotlight buttons; the app flags this too.                                                                                         |

## Suggested structure

1. **Report a problem:** the 4 report Transactions, then the Step by step _Report a pest problem, start to finish_
2. **If you got a notice:** Correct a violation (Step by step), Question a NOV, Pay a citation
3. **For property owners:** Pay the annual fee, the merged owner-duties page, IPM for owners
4. **Look up records:** the lookup Transactions and the public records request
5. **Learn more:** the merged _what HHVC inspects / who to call_ page, Tenant rights, What happens after you report, Article 11 in plain language, Mosquito Control Program

Tag every Transaction to the Topic so new services appear automatically, and retire the 2 hub Resource Collections.

## Gaps in the Analysis panel

- It passes "Resource tiles" and "Related" but has no check for Agency pages or Resource Collections listed as services.
- **Missing checks:** URL format (`/topics/`), missing Description, audience lines, and Transactions in the corpus that aren't listed or tagged.

## Sources

- [Topic](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/building-a-page-by-content-type/topic)
- [Topics component](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/components/topics)
- [How a Step by step page works](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/building-a-page-by-content-type/step-by-step/how-a-step-by-step-page-works)
- [Related](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/components/related)
- [HHVC mockup review](https://sfhealthyhousing.netlify.app)

---

# Campaign pages: Karl review

Only _Rat-free blocks_ is really a Campaign. The 2 workshops have no dates, so they aren't Events either; each is a request people make to the City, which makes it a Transaction. That corrects my earlier guess that they were Events.

Scope: the 3 pages the app labels "Campaign".

## What Karl requires

| Rule          | Karl's requirement                                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Purpose       | "An ongoing informational or marketing campaign" with "message-focused content that is ephemeral or less City service-oriented"                              |
| Fields        | Title, Primary agency, Logo, Background header image, Color theme, Spotlight 1, Top facts, Additional content, Spotlight 2, About, Partner agencies, Related |
| Not offered   | Description, callouts, Contact us                                                                                                                            |
| Spotlights    | Up to 2; spotlight buttons up to 25 characters (the app's limit)                                                                                             |
| Announcing    | "May need to be paired with a News item when announcing a campaign"                                                                                          |
| Event instead | An Event needs a date, time and location (`sf.gov/events/month-00-2000/title`).                                                                              |
| URL           | sf.gov/title-of-campaign                                                                                                                                     |

## Page by page

| Page                             | Grade | Verdict                                                 | Main problems                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------- | ----- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Rat-free blocks                  | 7     | Keep as Campaign                                        | The "About this campaign" section is a placeholder. The spotlight button "See owner responsibilities" is 26 characters (flagged) and points to a Resource Collection the earlier tabs suggest retiring. British spellings ("Neighbours," "organise," "Agree a week") break SF.gov's US style. "A rat fits through a gap the size of a quarter" differs from the rats page's "gap bigger than a pencil"; pick one. Related links the _Healthy housing and pest resources_ Resource Collection, which isn't allowed. |
| Free mosquito education workshop | 11    | Make a Transaction ("Request a free mosquito workshop") | An internal note is in public copy: "Verify the final standards crosswalk before publication." It has 2 callouts (flagged). Related links 2 external sites (CDC, State dead-bird reporting) and the HHVC Agency page, none allowed. Partner agencies lists the Mosquito Control Program and "City and County of San Francisco," which aren't Agency pages.                                                                                                                                                         |
| Free IPM education workshop      | 10    | Make a Transaction ("Request a free IPM workshop")      | It has 2 callouts (flagged) and the HHVC Agency page in Related (flagged). A Contact us section passes the app's check, but Campaigns have no Contact us field.                                                                                                                                                                                                                                                                                                                                                    |

As Transactions, the workshops' existing parts map onto Karl fields directly. Eligibility, group size and lead time go in Things to know. The request form (mosquito) or 311 (IPM) becomes the What to do button. Contact us becomes a real field.

## Gaps in the Analysis panel

- **Related:** flags the Agency link on the IPM workshop but passes the same link, plus 2 external links, on the mosquito workshop. It also passes the Resource Collection on _Rat-free blocks_.
- **Contact us:** passes on a Campaign, which doesn't offer that field.
- **Missing checks:** a Campaign with no dates that asks users to request something (a sign it should be a Transaction), internal notes like "Verify…before publication," US spelling, and Partner agencies that aren't Agency pages.

## Sources

- [Campaign](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/building-a-page-by-content-type/campaign)
- [How a Campaign page works](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/building-a-page-by-content-type/campaign/how-a-campaign-page-works)
- [Event](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/building-a-page-by-content-type/event)
- [Spotlight](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/components/spotlight)
- [Callout](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/components/callout)
- [Choosing a content type](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/choosing-a-content-type)
- [HHVC mockup review](https://sfhealthyhousing.netlify.app)

---

# Report pages: Karl review

Both Report pages render the wrong URL and add fields Karl's Report type doesn't have. The annual summary is all placeholders and should be Blocked. _Article 11 in plain language_ can stay a Report because it relies on tables, which only Reports support.

Scope: the 2 pages the app labels "Report".

## What Karl requires

| Rule        | Karl's requirement                                                                                                               |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Purpose     | "Long, text-heavy content that is generally not updated after publishing," usually content that would have been a PDF            |
| Audience    | People with a special interest: activists, people in the field, others interested in public policy                               |
| Fields      | Title, Primary agency, Date, Spotlight (1), Body (a table of contents is built from H2s), Table, Print version, Partner agencies |
| Not offered | Description, Related, callouts                                                                                                   |
| Tables      | Reports are the only type that supports tables; 3 or fewer columns work best                                                     |
| URL         | sf.gov/reports/month-year/title-of-report                                                                                        |

## Page by page

| Page                                        | Grade | Verdict                    | Main problems                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------- | ----- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Health Code Article 11 in plain language    | 8     | Keep as Report; add a Date | Renders `sf.gov/report/health-code-article-11-plain-language`, with singular "report" and no month-year. Has a callout (flagged) and a Description. It's a reference that must follow code changes, which strains Karl's "not updated after publishing." A Date tells readers which code version it reflects.                                              |
| Healthy Housing inspections: annual summary | 13    | Block until the data is in | Every figure in all 4 tables is PLACEHOLDER, as are the reporting period and pull date. No Date. Has a Related section and a Description. Renders `sf.gov/report/healthy-housing-inspections-annual-summary`. Publish one Report per year, for example `sf.gov/reports/july-2027/healthy-housing-inspections-fy-2026-27`, and link it from the About page. |

If the summary is meant to be updated over the year, a Data story built with DataSF fits better than a Report.

## Overlap with earlier tabs

_Article 11 in plain language_ covers the same owner duties and the Section 609 fee as _Article 11 compliance_ and _Property owner responsibilities_. When those merge, keep the legal summary here, keep the how-to on the merged owner page, and link between them.

## Gaps in the Analysis panel

- The annual summary passes every check while every number is a placeholder.
- **Missing checks:** URL format (`/reports/month-year/`), missing Date, Related or Description present, and PLACEHOLDER in table cells.

## Sources

- [Report](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/building-a-page-by-content-type/report)
- [How a Report page works](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/building-a-page-by-content-type/report/how-a-report-page-works)
- [Callout](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/components/callout)
- [HHVC mockup review](https://sfhealthyhousing.netlify.app)

---

# Agency and About pages: Karl review

The Agency page puts services first, as Karl wants, but it mixes services with reference pages and has no contact block. The About page is missing what Karl's About type is for: mission, leadership and annual reports. Both need Digital Services, which creates Agency pages, to set the right parent-child URLs.

Scope: the Agency page _Healthy Housing and Vector Control_ and its About page.

## What Karl requires

| Rule          | Agency                                                                                                                                                                                                                                                 | About                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Purpose       | Landing page for a department or body, "more department-centric than topic pages"; services near the top                                                                                                                                               | Detailed agency information that is "not service-related, less public-facing, less frequently needed" |
| Audience      | Residents seeking a service or department, partners, activists and journalists                                                                                                                                                                         | Potential partners or job hires, City staff                                                           |
| Fields        | Title, Description, Logo, Main image, Alert, Highlights, Quick links, Services (heading editable), 2 Spotlights, Resources (heading editable), About, Call to action, Divisions, Partner agencies, People, Public records, Archive, Contact us, Topics | Mission, divisions, annual reports, gift disclosures and similar                                      |
| Who builds it | Only Digital Services can create Agency pages. A division qualifies for its own if it has multiple public services and staff to keep it current.                                                                                                       | Department editors; tagging the Agency adds a "Learn more about us" button automatically              |
| URL           | sf.gov/departments/parent/child                                                                                                                                                                                                                        | sf.gov/departments/name/about                                                                         |

## Agency page: Healthy Housing and Vector Control

| Area                                              | Finding                                                                                                                                                                                                  |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| URL                                               | Renders `sf.gov/departments--healthy-housing-and-vector-control`. HHVC is a program in DPH's Environmental Health branch, so ask Digital Services to nest it under that parent.                          |
| Description                                       | None. Add one.                                                                                                                                                                                           |
| Services ("Get help with pests, mold, or trash")  | 8 items, but only 4 are Transactions plus a 311 link. It also holds a Resource Collection, an Information page and _Guides in other languages_. Move those 3 to Resources.                               |
| "If you rent" / "If you own or manage a building" | Mostly Information pages and Resource Collections listed as services. Under the earlier merges these become 1 Information page each, and the fee and Correct a violation step by step go under Services. |
| "Look up records and rules"                       | Includes Health Code Articles 1 (Animals) and 2 (Communicable diseases), which aren't HHVC's Article 11 scope; confirm they belong. The public records request should go in Karl's Public records field. |
| "Need another City housing service?"              | Links the _Healthy housing conditions_ Topic, which is HHVC's own Topic, not another service. Link DBI and the Rent Board here instead.                                                                  |
| About section                                     | Has a manual "About Healthy Housing and Vector Control" link. Tagging the About page adds a "Learn more about us" button automatically.                                                                  |
| Contact us                                        | Missing. A department landing page needs the phone number (415-252-3800), healthyhousing@sf.gov and 311.                                                                                                 |
| Readability                                       | Grade 9                                                                                                                                                                                                  |

## About page

| Area                | Finding                                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| URL                 | Renders `sf.gov/departments--healthy-housing-and-vector-control--about`; should be `.../healthy-housing-and-vector-control/about`                      |
| Content             | "Who we are," "What we do" and "How the team is organized" fit. There's no mission statement, no leadership, and no link to the annual summary Report. |
| "What we do"        | Lists services (investigating reports, inspections, NOV follow-up). That is the Agency page's job; keep 1 sentence and link.                           |
| Program information | 4 resource tiles to public-facing service and reference pages. For About's audience, link the Article 11 Report and annual summary instead.            |
| Readability         | Grade 13 over 15 sentences. Shorten sentences and drop "we" framing where it lengthens them.                                                           |

## Gaps in the Analysis panel

- The Agency page gets 3 generic checks, plus a "Resource tiles" check that it marks unconfirmed. Karl's own field list for Agency pages includes Resources.
- **Missing checks:** URL nesting, missing Description, missing Contact us, Information pages or Resource Collections under Services, and a manual About link that duplicates the automatic button.

## Sources

- [Agency](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/building-a-page-by-content-type/agency)
- [How an Agency page works](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/building-a-page-by-content-type/agency/how-an-agency-page-works)
- [Child agency groups](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/building-a-page-by-content-type/agency/about-on-an-agency-page/child-agency-groups)
- [About on an Agency page](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/building-a-page-by-content-type/agency/about-on-an-agency-page)
- [About](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/building-a-page-by-content-type/about)
- [Services are top priority](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/sf.gov-and-karl-foundations/sf.gov-concepts-and-structure/concepts/services-first/services-are-top-priority)
- [HHVC mockup review](https://sfhealthyhousing.netlify.app)

---

# Location page: Karl review

Block _Environmental Health office_. The address, hours, accessibility and transit details are all placeholders. Of its 3 listed services, 1 is online, 1 is paid in person at City Hall Room 140 (per the fee page), and 1 is an unconfirmed tool. First confirm HHVC has a public counter. If it doesn't, Karl's Location type doesn't fit and the page should go.

Scope: the 1 page the app labels "Location". The URL `sf.gov/location/environmental-health-office` matches Karl's format.

## What Karl requires

| Rule        | Karl's requirement                                                                                                                                                                                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Purpose     | "Places that are open to the public, that are needed when getting a service"; info must be kept current                                                                                                                                                                              |
| Fields      | Title, Description, Primary agency, Alert, Essential information, Image, Body, Getting here (Intro, Parking, Accessibility, Public transportation), Accordions, Services, About, Partner agencies, Additional location info, At this location, People, Related locations, Contact us |
| Not offered | Related pages (only Related locations, which link other Location pages), audience lines                                                                                                                                                                                              |
| Address     | A reusable Address snippet with hours; needs an exact address with ZIP for the map                                                                                                                                                                                                   |
| URL         | sf.gov/location/name-of-location                                                                                                                                                                                                                                                     |

## Findings

| Area                          | Finding                                                                                                                                                                                                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Placeholders                  | 4: street address and floor; counter hours and whether an appointment is needed; mailing address; accessible entrance and nearest transit                                                                                                                   |
| Services                      | _Make a public records request_ runs online through NextRequest. _Pay your annual fee_ says in-person payment is at City Hall, Room 140, 1 Dr. Carlton B. Goodlett Place. _Find your inspector_ is a placeholder tool. None clearly happens at this office. |
| Related                       | Links the About page and _Learn what HHVC can inspect_. Location pages only offer Related locations.                                                                                                                                                        |
| "Who this information is for" | Not a Location field; cut it.                                                                                                                                                                                                                               |
| Description                   | None. Add one.                                                                                                                                                                                                                                              |
| Contact us                    | Present and allowed. Phone 415-252-3800 and healthyhousing@sf.gov match the other pages.                                                                                                                                                                    |
| Readability                   | Grade 7                                                                                                                                                                                                                                                     |

If the office does serve the public, fill Getting here and the Address snippet from a confirmed source, and list only services people complete there. If payment only happens at City Hall, link City Hall's Location page under Related locations instead.

## Gaps in the Analysis panel

All 4 checks pass on a page with 4 placeholders. **Missing checks:** PLACEHOLDER text, missing Address snippet or hours, Related pages on a Location, and Services that point online.

## Sources

- [Location](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/building-a-page-by-content-type/location)
- [How a Location page works](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/building-a-page-by-content-type/location/how-a-location-page-works)
- [Address](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/components/address)
- [Services on a Location page](https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/building-a-page-by-content-type/location/services-on-a-location-page)
- [HHVC mockup review](https://sfhealthyhousing.netlify.app)
