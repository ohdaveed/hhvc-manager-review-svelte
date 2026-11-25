# PLAN — Act on the Transaction pages Karl review

Branch `docs/plan-transaction-review-fixes`, cut from `origin/main` at `4f4d0ea`.
Detail, evidence and the status of each finding: `docs/superpowers/plans/2026-11-24-transaction-review-fixes.md`.
Spec: `docs/reviews/2026-11-23-transaction-pages-karl-review.md` and `docs/reviews/2026-11-24-karl-review-all-tabs.md`. That file's **Decisions** tab overrides the other tabs: build only what it lists under Decided.

Already fixed before this plan: descriptions over 110 characters (#194) and "What to do: Pass on every page" (#208).
Production has 0 edits and 0 comments on any page (measured 2026-11-24). Re-count before any task that moves copy.

## Track A — Analysis panel (one PR)

- [x] **A1.** The Related target check runs on sections placed in Related, so the annual fee page's Resource Collection card reports an issue.
- [x] **A2.** A placed button whose URL is `#` needs a fix. PLACEHOLDER stays uppercase-only (decision 14 of the field-mapping plan); the inspector lookup's unplaced `#` button was already reported under `karl-unplaced`.
- [x] **A3.** A `karl-description-reuse` finding lists the title words repeated in the description (issue at 2 or more).
- [x] **A4.** `karl-url-pattern` flags `a`/`an`/`the` in a slug.
- [x] **A5.** A `karl-transaction-action` finding flags a Transaction with no button and no Contact us.
- [x] **A-ship.** verify all green; eslint, svelte-check and prettier ratchets at baseline; full e2e 101/101; Analysis panel screenshots of the fee and citation pages checked by eye; whole-branch review done. PR open; merge waits for approval.

## Track B — Decided copy changes

- [x] **B1.** Every page says "We never share your name or contact information." once, and the City Attorney line is gone.
- [x] **B2.** The garbage, rats and insects pages drop the review-time, contact, anonymous-visit, outcome and retaliation text (on *What happens after you report*, which each links) and the repeated "give your name" line. **Deferred:** moving the landlord notice and putting the 311 button last — the 72-hour wait is still open in the Decisions tab, and the 9-page regroup rewrites these steps anyway.

## Track C — Questions for manager review (not built here)

- [x] **C.** Ten questions (C1–C10 in the detail plan) sent for a ruling. Answers go into the Decisions tab. C1 answered Nov 24 (yes to all; both "get ready" pages become steps), C2 answered (rename to "What to do"), C3 answered (no, not Blocked), C4 answered (wait for the Topic merge), C5 answered (drop articles; appeal title becomes "Appeal a Notice of Violation"; amended Nov 25: an NOV cannot be appealed, so the page is "Question a Notice of Violation" at question-notice-of-violation), C6 answered (yes; amended Nov 25 to short verb-led sentences, see #211), C7 answered (leave the annual fee page for the Karl transfer), C8 answered (leak mold goes to DBI), C9 answered (keep grade 6–7), C10 answered (Contact us on the appeal page only). All ten answered Nov 24, 2026.

## Track D — Docs

- [x] **D1.** The two review files are in `docs/reviews/`, each with a dated status note.
- [x] **D2.** The review's stale Analysis-gap line is annotated with what #208 and A1–A5 fixed.
- [x] **D3.** `docs/karl-transaction-compliance.csv` is updated alongside B1–B2.
- [x] **D4.** CLAUDE.md needs no change: re-run after track A, the grep matches only the review files, the plans, and the field-mapping plan, whose line 572 (`karlComponentFindings` keeps the Related target type) still holds.

## Deliberately out of scope

The 9-page report regroup, removing the SRO page, the mosquito and pigeon pages, and the Topic fold. All are Decided but come later in the Decisions tab's build order, and several depend on open questions. Each gets its own plan.

The sewage routing fix is out of scope only because it sits on an Information page (*Learn what HHVC can inspect*). The Decisions tab marks it **Fix first**, and it is still pending.
