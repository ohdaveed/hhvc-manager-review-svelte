# Open decisions — 2026-11-26

Every product decision the remaining plans are blocked on, in one place. Sources:
`docs/superpowers/plans/2026-11-24-transaction-review-fixes.md` (Track C) and
`docs/plans/site-structure.md`. Measured against `main` at `f9f54b8` by running `analyzePage` over all
41 corpus modules; counts below are from that run, not from the plans.

Mark each **Decided: …** in place. Leg 2 builds only what is decided.

## Rulings, 2026-11-26

Approved as recommended: **C4, C8, SS-3c** (close), **C3** (not Blocked), **C6** (rewrite the
first two descriptions only), **C7a**, **SS-3a** (link, don't fold), **C9** (keep per-page targets),
**SS-1** (count prose links). **SS-3b** stays open until HHVC says whether the two workshops are one
program.

**Correction — C7b reopened.** The fee page still quotes the half-hour reinspection fees
("Additional half-hours cost $128 and $115"); the search that closed it missed the figure because it sits
in a separate sentence. It needs checking against the FY 2026-27 fee schedule.

**Not approved: SS-4, SS-D1, SS-D2.** They stay open; site-structure PR 4 does not start until SS-4
has a ruling.

## Already settled by later work — confirm and close

| #     | Question                                              | Why it's settled                                                                                                          | Recommendation |
| ----- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------- |
| C4    | Remove Related links to Resource Collection / Agency? | The Related-target check (A1) reports **0** issues on any page; the Topic fold (#216) retired _Look up building records_. | Close          |
| C8    | Which agency handles leak-caused mold?                | `report-mold.ts` already says the Department of Building Inspection handles leaks, HHVC humidity and condensation.        | Close          |
| C7b   | Reinspection fee $115 vs $117?                        | The fee page no longer quotes a reinspection amount.                                                                      | Close          |
| SS-3c | One canonical "what happens after you report" page?   | `afterReport` is that page; #210 moved the shared report text there and every report page links it.                       | Close          |

## Needs a decision

### Content

**C3 — Mark the citation and inspector lookup pages Blocked until the payment link and lookup tool are
confirmed?**
Recommend **no**. Both carry a stated placeholder (`buttonUrl: '#'` plus a note), and the real link
resolves at build time in Karl, so the page itself is reviewable now. Blocked would hold the review on
a fact the reviewer can't supply.

**C6 — Rewrite descriptions that reuse title words?** 5 pages are flagged:

| Page                                                           | Words repeated from the title                 |
| -------------------------------------------------------------- | --------------------------------------------- |
| Pay your annual Healthy Housing fee for apartment buildings    | pay, annual, healthy, housing, fee, apartment |
| Bed bugs: prevent them, find them, and get ready for treatment | bed, bugs, them, treatment                    |
| Report bed bugs                                                | report, bed, bugs                             |
| Reduce moisture and mold in your home                          | mold, home                                    |
| Keep rats and mice out of your home                            | rats, mice                                    |

Recommend **yes for the first two** (4+ words — the description mostly restates the title) and
**leave the last three**: on a two- or three-word title the subject word can't reasonably be avoided.

**C7a — Annual fee page.** The "Pay by the due date or contact us" heading sits over "Pay within 30
days of the invoice due date", and the "annual fee supports inspections" point is made twice (once in
the fees callout, once in its own callout).
Recommend: retitle to **"Pay your invoice or contact us"** and **cut the second callout**.

**SS-3a — Fold _What tenants need to do after a Notice of Violation_ into _Correct a violation and
close your case_?**
Recommend **no — link them instead**. They are different readers: the step-by-step is the owner's
process, the Information page is the tenant's. One Step by step page can't carry two audiences'
steps, and merging would leave one of them reading steps that aren't theirs.

**SS-3b — Merge the mosquito and IPM workshop campaigns?** Both are "Free … education workshop"
Campaign pages.
**Needs an HHVC fact:** one program with one sign-up → merge; two programs → keep both and make the
titles say which pest. No recommendation without it.

### Analysis and tooling

**C9 — Score reading level against Karl's grade 5 instead of each page's own target?**
Recommend **no**. 21 of 41 pages already miss their own declared target (6–8), so a grade-5 bar would
turn the whole corpus red and stop telling pages apart. Grade 5 is already cited beside each score as
Karl's guideline.

**SS-1 — Should `findOrphans` count `[text](pageKey)` links in body copy, not only cards?**
Recommend **yes**. Today it overstates orphans; every page is reachable once prose links count, so the
number it reports is wrong rather than strict. Small code change with a test.

### Structure and data

**SS-4 — Slug scheme.** The plan proposed `<type>/<name>` for non-transactions. The corpus today mixes
three forms: `sf.gov/information/x`, `sf.gov/information--x` and flat `sf.gov/x`.
Recommend **flat `sf.gov/[slug]` for every type**, with Karl's department forms for the Agency and
About pages. Flat is the only pattern Karl confirms for every content type (`karl-url-pattern` can't
check the typed forms, which is why 22 pages show "unavailable" today). The migration renames
`pages.path` rows, and merging it applies it to production.

**SS-D1 — Merged or renamed pages' review rows.** `edits` and `comments` cascade from `pages`.
Recommend: **re-count production edits and comments before each merge or rename PR**; while the count
is zero (it was on 2026-11-24), delete or rename the row outright rather than build a hide-from-queue
state nothing needs yet.

**SS-D2 — Approve hub and merge content per PR, or sign off card lists first?**
Recommend **draft, then approve per PR** — the way #252–#262 shipped.
