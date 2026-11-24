# HHVC transaction pages: Karl review

Nov 23, 2026 · @David Arrizon

> **Status, 2026-11-24:** this review was written against the app on Nov 23. Some findings were fixed before work on it started: descriptions over 110 characters (#194) and "What to do: Pass on every page" (#208). The original findings below are left as written. `docs/superpowers/plans/2026-11-24-transaction-review-fixes.md` tracks what is fixed, what is decided and what is still open, finding by finding.

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
|                                                     |                                                                 |                                                                       |

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
