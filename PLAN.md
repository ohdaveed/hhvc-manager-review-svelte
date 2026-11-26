# PLAN — Report page structure (bed bug page review)

Branch `feat/report-pages-structure`, cut from `origin/main` at `9789a0a`. Source: a reviewer's five-point
critique of `report-bed-bugs`. Scope chosen by the user (2026-11-26): structural fixes on all nine
condition report pages, option B for the step order (keep three steps, details before the 311 button).

Checked before editing:

- Live SF.gov `report-health-nuisance-or-hazards` and `report-residential-building-concern` have no Cost
  block and list the details before the 311 button. Phone wording on both: "415-701-2311 if you are
  outside of San Francisco", "TDD/TTY 711". Neither says "24/7" or "free interpretation" — not added.
- Karl: `cost` is optional (field map E3); Things to know is capped at 2 (confirmed); a Section's
  specifics can hold a `Phone number` block.
- Production holds no edits or comments on the bed bug page, so re-keyed step field ids orphan nothing.

Decisions forced by constraints:

- Every condition page already has 2 Things to know items (Karl's cap). The privacy sentence moves into
  What to know only on bed bugs, where both items move out. On the other eight it stays in the details
  step's callout, which the reorder now puts above the 311 button.
- Sewage keeps "Report it right away" first: that order is Decided (48-hour response, urgent).

- [ ] **1. All nine pages.** `cost: 'Free'` removed; the details step (renamed "Gather your details")
      moved above the 311 button step (sewage excepted); the 311 phone/TTY lines added to the button step,
      Karl note naming a Phone number block. Karl notes updated to match.
- [ ] **2. Bed bug copy.** Action-first subtitle; Nearby units folded into Step 1 as its second bullet;
      prep link and privacy sentence placed per the review; While you wait cut to two tips plus the prep
      link, with UC IPM and EPA moved onto `bed-bugs-prevent-and-prepare`; Step 1→2 bridge says you can
      report without waiting.
- [ ] **3. Gates.** Unit tests green (transcript snapshot updated after reading its diff), build green,
      page checked in the browser.
- [ ] **4. PR opened, CI green.**
- [ ] **5. Separate PR: "Unconfirmed in Karl" pill** beside the section's Rethink control (review item 5).
