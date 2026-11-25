# Transaction review fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Act on the Nov 23 Karl review of the 16 Transaction pages: close the Analysis panel's blind spots, make the content changes the Decisions tab has settled, and send everything else back for a ruling instead of building it.

**Architecture:** Four tracks. A is review-app code, test-first, and ships alone. B is copy changes the Decisions tab settled. C is decisions for the manager or HHVC, written as questions; no task builds them. D records what is already fixed and keeps the review docs current.

**Tech Stack:** SvelteKit 2 / Svelte 5, TypeScript, Vitest (`bun run test:unit -- --run`), Playwright e2e.

**Spec:** `docs/reviews/2026-11-23-transaction-pages-karl-review.md` (the Transaction tab, Nov 23) and `docs/reviews/2026-11-24-karl-review-all-tabs.md` (all tabs, exported Nov 24). **The Decisions tab at the top of the second file overrides every other tab**: "Build only what's under **Decided**." Its build order is field mapping and display modes (done, #197–#208), then fixes within existing pages, then page-type changes and merges, then the report reorganization.

## Status of the review's findings, measured 2026-11-24 on `4f4d0ea`

Measured by running `analyzePage` over the 16 `type: 'Transaction'` modules, plus `git show 3b6ac94^` for the earlier summaries.

| Finding                                        | Status today                                           | Evidence                                                                                                                                                                                           |
| ---------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4 descriptions over 110 characters             | **Fixed by #194**                                      | Before #194: insects 123, fix violation 118, garbage 117, rats 112. Now all ≤ 110 (two are exactly 110)                                                                                            |
| "What to do: Pass" on every page               | **Fixed by #208**                                      | `karl-transaction-what-to-do` now reports an issue on 8 pages: follow-up, housing inspection, inspector lookup, public records, hotel records, tenant steps, violations lookup, complaints records |
| More than 2 Things to know                     | **Check exists** (`placement.ts:626`, `maxItems` rule) | No Transaction page has more than 2 (the inspector lookup has 1). The 4 audience lines the review counted come from the `audience` field, not from `thingsToKnow`                                  |
| Confidentiality wording conflicts (blocker 4)  | **Decided**                                            | Decisions tab: "We never share your name or contact information.", once per page → B1                                                                                                              |
| `PLACEHOLDER` text                             | **Partly caught**                                      | `HAS_PLACEHOLDER = /PLACEHOLDER/` (`placement.ts:240`) is case-sensitive, so it catches the citation page but not the inspector lookup's "This button is a placeholder" → A2                       |
| Related links to types Karl doesn't allow      | **Not caught**                                         | `karlComponentFindings` reads only sections tagged `component: 'related'`. No Transaction page tags its Related section, so the check runs on none of the 16 → A1                                  |
| Title words reused in the description          | **Not caught**                                         | → A3                                                                                                                                                                                               |
| Articles in slugs                              | **Not caught**                                         | `karl-url-pattern` passes all 16 → A4                                                                                                                                                              |
| A Transaction with no button and no Contact us | **Not caught**                                         | → A5                                                                                                                                                                                               |
| Reading level scored against grade 5           | Out of scope for this plan                             | `SFGOV_READING_GUIDELINE = 5` already exists in `analysis/index.ts`. Per-page targets are a content ruling → C                                                                                     |

**Saved review data:** production (`kiynekyzqxneepjipqhg`) has **0 edits and 0 comments on any page**, so reordering fields or moving sections orphans nothing today. Field ids are positional (`whatToKnow.thingsToKnow.<n>.label`), so every task that reorders or deletes copy starts by counting again (see Global Constraints).

## Global Constraints

- The Decisions tab overrides the other tabs. Build only what it lists under **Decided**. Everything else goes in track C as a question.
- Never write an unconfirmed fact into page copy: fee amounts, payment channels, which agency handles a referral, or legal claims. Put the question in the verified-facts/open-questions file `eb112cb` added instead.
- **Before any task that reorders, deletes or moves copy on a page**, count saved edits and comments for that page's path on production and staging (read-only `select count(*)` over `edits` and `comments` joined to `pages` by `page_id`). If either count is above 0, stop and remap or get sign-off.
- Before rewording any `karl` note, diff `classifySection` output before and after; note prose drives the card classifier (memory: karl-note-text-drives-card-classifier).
- Slugs are routable ids (`sf.gov/x` becomes `x`) and the key of `pages.path`. Renaming one is a track C decision, never part of a copy fix.
- Gates per PR: `bun run verify`, `bun run lint:ratchet`, `bun run check:ratchet`, `bun run format:ratchet`. Analysis-panel changes also run `tests/accessibilitySignedIn.e2e.ts`.
- Finding copy follows the existing findings' voice: plain sentences, Karl's own terms, curly quotes (`’`).

## Review Focus

1. **A section `karl` note that mentions "placeholder".** Notes are review material, not page copy. A2's case-insensitive match must not fire on them. A2 test: a page whose only "placeholder" is in a section's `karl` note passes.
2. **A Related card whose target is not in the corpus** (`typeOf` returns `''`). This is skipped on purpose; the site map reports it. A1 test: a card pointing at an unknown key produces no finding.
3. **Stop words in the title-reuse check.** "a", "your", "to" and "the" would make every page fail. A3 test: "Pay your annual fee" against "Pay the fee by the due date" counts 2 (`pay`, `fee`), not 4.
4. **Slugs where an article is part of a name.** Check whole dash-separated tokens (`-a-`, `-an-`, `-the-`) only. A4 test: `sf.gov/report-a-pest-problem` is an issue, and `sf.gov/data-analytics` passes.
5. **A Transaction whose only action is a Contact us block.** That counts as an action. A5 test: Contact us with no button passes.

---

## Track A — Analysis panel (code, test-first, one PR)

### Task A1: Related target check sees Related sections by placement

**Files:**

- Modify: `src/lib/analysis/karlComponentChecks.ts` (`usesOn`, ~lines 52–77)
- Test: `src/lib/analysis/karlComponentChecks.test.ts`

**Interfaces:**

- Consumes: `placementsFor(page)` from `$lib/karl/placement` (its `sections: Map<string, SectionPlacement>`, with `rawName`), and `schemaFor(type).relatedTargets` from `$lib/karl/schema`
- Produces: `karlComponentFindings(page)` keeps its signature and returns Related findings for any section that placements put in `related` / `related_links`

- [ ] **Step 1: Write the failing tests**
  - `flags the annual fee page's Related card to Property owner responsibilities`: the `pay-healthy-housing-fee` page yields a finding with `component: 'related'` and `status: 'issue'`, and the detail names `Resource Collection`.
  - `still flags a section tagged component: 'related'`: the existing coverage over `article-11-compliance-for-property-owners` stays green.
  - `skips a card whose target is not in the corpus` (Review Focus 2).
  - Corpus sweep: assert the set of Transaction pages with an issue as measured after the fix, and check it against the review's blocker 5 table (fee, public records, inspector lookup, complaints records, violations lookup, hotel records). Explain any difference in the PR; #195 changed copy after the review.
- [ ] **Step 2: Run** `bun run test:unit -- --run src/lib/analysis/karlComponentChecks.test.ts`. Expected: the new tests FAIL with no finding.
- [ ] **Step 3: Implement.** In `usesOn`, treat a section as Related when `section.component === 'related'` **or** its placement's `rawName` is in `{'related', 'related_links'}`. Judge the allowed types from the host page's `schemaFor(page.type).relatedTargets` when that is non-null. Otherwise use `RELATED_PERMITTED_TYPES`, which is today's behavior.
- [ ] **Step 4: Run the file again, then the whole unit suite.** Expected: PASS.
- [ ] **Step 5: Commit** `fix(analysis): check Related targets on sections placed in Related, not only tagged ones`

### Task A2: Placeholder text in any case, in page copy only

**Files:**

- Modify: `src/lib/karl/placement.ts:240` (`HAS_PLACEHOLDER`) and the `fail(...)` at `:590`
- Test: `src/lib/analysis/karlPlacementChecks.test.ts`

- [ ] **Step 1: Write the failing tests**
  - `flags the inspector lookup's "This button is a placeholder"`: `karl-needs-fix` is `issue` on `find-inspector-by-neighborhood`.
  - `flags a button whose URL is '#'`: same page, with the reason text `Button link goes nowhere ('#').`
  - `ignores "placeholder" inside a karl note` (Review Focus 1).
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.** `HAS_PLACEHOLDER = /\bplaceholder\b/i`, tested only against the rendered field text that `placementsFor` already reads, never `karl` or `editorNote`. Add a `buttonUrl === '#'` reason beside it.
- [ ] **Step 4: Run** the unit suite. Expected: PASS. Then check that the corpus-wide `karl-needs-fix` count rose only on pages with real placeholders.
- [ ] **Step 5: Commit** `fix(karl): catch placeholder text in any case, and dead '#' button links`

### Task A3: Title words reused in the description

**Files:**

- Modify: `src/lib/analysis/textChecks.ts` (new export), `src/lib/analysis/index.ts` (wire it into `findings`)
- Test: `src/lib/analysis/textChecks.test.ts`

**Interfaces:**

- Produces: `titleWordsInDescription(title: string, description: string): string[]`. It returns the reused content words, lowercased, in title order. Finding id `description-title-reuse`: pass at 0–1 words, issue at 2 or more, and the items list the words.

- [ ] **Step 1: Write the failing tests**
  - Review Focus 3.
  - Complaints records (the review's model page) passes.
  - Annual fee reports an issue. Assert the actual words the function finds on today's copy; the review counted 6.
- [ ] **Step 2: Run them.** Expected: FAIL (not defined).
- [ ] **Step 3: Implement.** Tokenize on non-letters. Drop a small stop list (`a an the to for of and or your you in on by with`). Compare words by exact lowercase match only; no stemming library. ponytail: exact match misses "report"/"reporting"; add suffix folding if reviewers ask.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(analysis): flag title words repeated in the description`

### Task A4: Articles in the slug

**Files:**

- Modify: `src/lib/analysis/karlPlacementChecks.ts` (the `karl-url-pattern` finding, ~lines 162–205)
- Test: `src/lib/analysis/karlPlacementChecks.test.ts`

- [ ] **Step 1: Write the failing tests**
  - Review Focus 4.
  - The 5 slugs in the review (`pay-a-…`, `appeal-a-…`, `get-ready-for-a-…` ×2, `make-a-…`) report an issue, and the item detail is `Karl drops articles from URLs: remove “a”.`
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.** After `FLAT_SLUG` passes, test `/(^|-)(a|an|the)(-|$)/` on the path segment. A match is an issue with that item, even when the pattern itself matches.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(analysis): flag articles left in a slug`

### Task A5: A Transaction with no way to act

**Files:**

- Modify: `src/lib/analysis/karlContentTypeChecks.ts`
- Test: `src/lib/analysis/karlContentTypeChecks.test.ts`

**Interfaces:**

- Produces: finding id `karl-transaction-action`, Transaction only. It passes when any step or section has a `button`, or the page has a Contact us block. Otherwise it is an issue: `A Transaction should let people act: add a button in What to do, or a Contact us block.`

- [ ] **Step 1: Write the failing tests**
  - Review Focus 5.
  - `respond-to-notice-of-violation` ("Fix your violation": no button, no Contact us) reports an issue.
  - The garbage page (311 button) passes.
  - A non-Transaction page gets no such finding.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.** Use the same button and contact detection `placementsFor` uses. Grep `placement.ts` for `button` and `contact` and reuse that; do not add a second detector.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Verify and ship track A.** Run the gates in Global Constraints and `bunx playwright test tests/accessibilitySignedIn.e2e.ts`. Take a screenshot of the Analysis panel on the annual fee page (the `verify` skill) and look at it. Open a PR and ask before merging.

## Track B — Copy changes the Decisions tab settled

Each task starts by counting edits for its pages (Global Constraints).

### Task B1: One confidentiality sentence

**Files:** `src/lib/data/report-garbage-filth-vegetation.ts`, `report-rats-mice-four-legged-problems.ts`, `report-cockroaches-mosquitoes-insects.ts`, `what-happens-after-report.ts`

- [ ] **Step 1: Write a failing corpus test** in `tests/` (`.spec.ts`, node), `confidentiality wording is the decided sentence`:
  - no page's copy contains `Reporter identities are only shared`;
  - every page whose copy mentions sharing a reporter's identity contains `We never share your name or contact information.` exactly once.
- [ ] **Step 2: Run it.** Expected: FAIL on garbage and _What happens after you report_.
- [ ] **Step 3: Edit the copy** so each page carries the sentence once and drops the City Attorney line.
- [ ] **Step 4: Run** `bun run verify`. Expected: PASS.
- [ ] **Step 5: Commit** `fix(content): one confidentiality sentence, once per page`

### Task B2: Report pages keep only what's specific to their condition

The Decisions tab moves shared text (anonymity, the landlord notice, how reports are processed) to _What happens after you report_ and _Tenant rights_. This covers the review's "Content is repeated" and "How your report is processed" findings.

**Files:** the three report modules from B1, plus `what-happens-after-report.ts` and `tenant-rights-reporting.ts`

- [ ] **Step 1:** List each shared passage and its destination page in the PR description before editing. Check that the destination doesn't already say it.
- [ ] **Step 2:** Replace the "How your report is processed" section on each report page with a Related card to _What happens after you report_.
- [ ] **Step 3:** In What to do, put what to include in the report before the 311 button, and the button last. The landlord notice moves out with the shared text.
- [ ] **Step 4:** Run `bun run verify` and `classifySection` before and after on every touched section. Commit `refactor(content): move shared report text to its own pages, button last`.

The 9-page report regroup, the SRO page removal, the mosquito and pigeon pages and the mold leak referral are **last in the Decisions tab's build order** and depend on open questions. They get their own plan, not this one. The Decisions tab's "Replaced" section points the step-order and audience-line findings at those 9 new pages, so they belong to that plan too.

## Track C — Decisions for the manager or HHVC (questions, not tasks)

Raise these as one list for manager review. Nothing here gets built until it moves to **Decided**.

| #   | Question                                                                                                                                                                                                                                                                                                   | Review blocker |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| C1  | Should the 6 pages that aren't transactions change type or merge? Fix violation → step-by-step; the two "get ready" pages and tenant steps → Information; complaints + violations lookups → one Transaction. Use `hhvc-content-structure-audit` for any yes; each one changes slugs and `pages.path` rows. | 1              |
| C2  | On the 7 pages with custom headings, rename the heading to "What to do", or retype the page (follows C1)? Where should the SRO page's "What this covers" go? It goes away if the SRO page is removed (Decided).                                                                                            | 2              |
| C3  | Mark the citation and inspector lookup pages **Blocked** until the payment link and the lookup tool are confirmed?                                                                                                                                                                                         | 3              |
| C4  | Remove the Related links to Resource Collection and Agency pages now, or wait for the Topic fold (Decided), which retires _Look up building records_?                                                                                                                                                      | 5              |
| C5  | Drop the articles from 5 slugs? This renames routable ids and `pages.path` rows.                                                                                                                                                                                                                           | Titles/URLs    |
| C6  | Rewrite descriptions to cut title-word reuse? A3 gives the list.                                                                                                                                                                                                                                           | Titles/URLs    |
| C7  | Annual fee page: the "Pay by the due date" heading vs "within 30 days of the invoice due date"; the $115 vs $117 half-hour reinspection fee (check the fee schedule); cut the "What the annual fee supports" callout?                                                                                      | Other pages    |
| C8  | Which agency handles leak-caused mold? Needed for the mold page (Decided)                                                                                                                                                                                                                                  | Report pages   |
| C9  | Score reading level against Karl's grade 5 instead of the per-page 6–7 targets?                                                                                                                                                                                                                            | Reading level  |
| C10 | Add a Contact us block to _Question a NOV_, _Fix violation_ and the annual fee page? A5 shows which pages lack an action.                                                                                                                                                                                  | Other pages    |

## Track D — Documentation

Follow `candera-docs-audit`: verify each claim, find every copy, and keep the original claims with a dated note rather than rewriting them.

- [x] **D1: Bring the two review files into the repo.** Move `docs/reviews/2026-11-23-transaction-pages-karl-review.md` and `docs/reviews/2026-11-24-karl-review-all-tabs.md` from the repo root to `docs/reviews/` (confirm the move first). Each gets a dated **Status, 2026-11-24** note under its title that points at this plan's status table. Leave the original findings unedited.
- [ ] **D2: Fix the review's own stale line.** Its "Gaps in the Analysis panel" says "What to do section: Pass shows on every page". Add a note under it: fixed by #208; the Related, placeholder, reuse, slug and action gaps are closed by A1–A5 (update as each one merges).
- [ ] **D3: `docs/karl-transaction-compliance.csv`.** Update the rows for every section B1–B2 change, in the same PR as the change. The CSV records section shapes, so it goes stale with any copy move.
- [ ] **D4: No CLAUDE.md change is warranted.** It documents none of the checks A1–A5 touch. Checked with `grep -rlE "karlComponentFindings|karl-transaction-what-to-do|HAS_PLACEHOLDER|Analysis panel"`, which matches only the review files, `PLAN.md` and `docs/plans/2026-11-23-karl-field-mapping-layer.md`. Re-run that grep at the end of track A. Update the field-mapping plan's §5 if A1 changes what it says `karlComponentFindings` keeps.
