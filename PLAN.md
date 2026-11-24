# PLAN — Act on the Transaction pages Karl review

Branch `docs/plan-transaction-review-fixes`, cut from `origin/main` at `4f4d0ea`.
Detail, evidence and the status of each finding: `docs/superpowers/plans/2026-11-24-transaction-review-fixes.md`.
Spec: `Transaction pages.md` and `hhvc-karl-review-all-tabs.md`. That file's **Decisions** tab overrides the other tabs: build only what it lists under Decided.

Already fixed before this plan: descriptions over 110 characters (#194) and "What to do: Pass on every page" (#208).
Production has 0 edits and 0 comments on any page (measured 2026-11-24). Re-count before any task that moves copy.

## Track A — Analysis panel (one PR)

- [ ] **A1.** The Related target check runs on sections placed in Related, so the annual fee page's Resource Collection card reports an issue.
- [ ] **A2.** `karl-needs-fix` catches "placeholder" in any case in page copy, but not in `karl` notes, and catches `#` button links.
- [ ] **A3.** A `description-title-reuse` finding lists the title words repeated in the description.
- [ ] **A4.** `karl-url-pattern` flags `a`/`an`/`the` in a slug.
- [ ] **A5.** A `karl-transaction-action` finding flags a Transaction with no button and no Contact us.
- [ ] **A-ship.** Gates and ratchets green, signed-in axe e2e green, screenshot of the panel looked at, PR open. Ask before merging.

## Track B — Decided copy changes

- [ ] **B1.** Every page says "We never share your name or contact information." once, and the City Attorney line is gone.
- [ ] **B2.** The garbage, rats and insects pages move their shared text to *What happens after you report* and *Tenant rights*, order the steps landlord → details → 311 button, and drop the audience lines.

## Track C — Questions for manager review (not built here)

- [ ] **C.** Ten questions (C1–C10 in the detail plan) sent for a ruling. Answers go into the Decisions tab.

## Track D — Docs

- [ ] **D1.** The two review files are in `docs/reviews/`, each with a dated status note.
- [ ] **D2.** The review's stale Analysis-gap line is annotated with what #208 and A1–A5 fixed.
- [ ] **D3.** `docs/karl-transaction-compliance.csv` is updated alongside B1–B2.
- [ ] **D4.** CLAUDE.md is confirmed to need no change (grep re-run after A).

## Deliberately out of scope

The 9-page report regroup, removing the SRO page, the mosquito and pigeon pages, the Topic fold and the sewage "Fix first" item. All are Decided but come later in the Decisions tab's build order, and several depend on open questions. Each gets its own plan.
