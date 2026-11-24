# PLAN — findings.csv remediation

Source: `findings` sheet in Drive (364 rows, uploaded 2026-11-24), a plain-language
audit of the 39-page static corpus. Graded against corpus at `3b6ac94`; the one
commit to `origin/main` beyond it (`9b2d934`, #193) touches no file in `src/lib/data/`,
so this grading holds at the remote tip.

## What the 364 rows actually are

| Bucket                                           | Rows | Disposition              |
| ------------------------------------------------ | ---- | ------------------------ |
| Already fixed since the CSV was taken            | 66   | close, no work           |
| False positives                                  | 9    | close, no work           |
| Blocked on facts from HHVC                       | 5    | cannot fix here          |
| Sentences 16-20w, below the repo's own threshold | 163  | decision needed (see A0) |
| Real and actionable                              | 121  | the work below           |

66 + 9 + 5 + 163 + 121 = 364.

The CSV predates `3b6ac94` (#194), which is where most of the 66 stale rows went.
Verified by diff: all seven `description>110` strings appear as removed lines in
that commit, so that rule is **7 of 7 stale** -- zero work.

Every surviving row was re-checked by locating its text in the corpus and
recounting the sentence as it reads today, not by matching its opening words. 227
of the 285 sentence rows match verbatim; 58 are gone.

## A0 — DECIDED: >20 words (2026-11-23)

The repo's own threshold. Phase C scope is 64 sentences across 23 pages.
The 163 rows between 16 and 20 words are closed with no work.

## A0 rationale — the sentence threshold

The CSV flags every sentence over **15** words: 241 live rows, 78% of the audit.

`src/lib/server/ai/vendor/plain-language.js:27-32` — this repo's own port of the
SF.gov standard — reads the manual differently:

```js
const MEAN_SENTENCE_WORDS = 15; // scored against the page MEAN
const LONG_SENTENCE_WORDS = 20; // flags an INDIVIDUAL sentence
```

Its comment: "We score the mean against the manual's stricter end and flag
individual sentences that run past its looser end, so a page can pass on average
while still being told which sentences hurt."

So the CSV applied the mean target as a per-sentence cap.

Re-measured against the corpus today:

- At the repo's threshold (>20w): **64 sentences, 23 pages** (47 at 21-25w, 17 at 26w+)
- At the CSV's threshold (>15w): **227 sentences, 37 pages**

**Recommendation: >20w.** It is the threshold the shipping checker uses, and the
163 rows between 16 and 20 words are inside what the manual allows. Rewriting them
would also churn copy the reviewer UI will not flag.

## Phase A — DONE (all 9 items, gates green)

- [x] A1 — 3 contractions → expand. `you're`, `don't`, `you'll` on
      `article-11-compliance-for-property-owners`, `integrated-pest-management-*`,
      `integrated-pest-management-education`.
- [x] A2 — 3 UK spellings → US. `Neighbours`, `organise` (`campaign-rat-free-blocks`),
      `neighbour` (`step-prepare-unit-for-treatment`).
      NOT `organisms` on `mosquito-education-workshop` — standard US spelling, false positive.
- [x] A3 — 1 question heading → keyword-forward. `departments--healthy-housing-and-vector-control`,
      H2 "Need another City housing service?" → e.g. "Other City housing services".
- [x] A4 — 2 paragraphs over 3 sentences → split.
      `information-tenant-rights-*`, `pay-your-annual-healthy-housing-fee-*`.
      (A third, on `report-garbage-filth-vegetation`, is already fixed.)

## Phase B — PARTLY DONE, rest needs an editorial call

**Done (8 edits):** the cases where the expansion opens body prose and a
parenthetical genuinely belongs -- `HHVC` on `health-code-article-11` and
`mosquito-education-workshop`; `SFDPH` and `DPH` on
`article-11-compliance-for-property-owners`; `SRO` spelled out as "single room
occupancy (SRO) hotel" on `find-inspector-by-neighborhood`,
`lookup-residential-hotel-records`, `hhvc-inspection-scope` and
`report-cockroaches-mosquitoes-insects`, matching the wording
`report-sro-hotel-problem` already used.

**Blocked on a decision, not on effort.** Walking the real page objects (metadata
fields excluded) found 39 unpaired token/page pairs in rendered copy -- close to
the CSV's 38. But in most of them the **first** appearance of the expansion is a
structured field, not prose:

| Where the expansion first lands | Pages | Why a parenthetical is wrong there                         |
| ------------------------------- | ----- | ---------------------------------------------------------- |
| `primaryAgency`                 | 7     | a field Karl maps to an agency reference, not a sentence   |
| `title`                         | 2     | SF.gov page titles do not carry parentheticals             |
| `summary`                       | 3     | capped at 110 chars; "(HHVC)" costs 7                      |
| `contact.other[0]`              | 3     | contact block, not prose                                   |
| card `title`                    | 3     | names another page; "(IPM)" in a link title reads as noise |

Two more were false positives my first pass counted: `DPH` and `PCO` on
`integrated-pest-management-for-property-owners-and-managers` are **already**
paired -- the copy reads "San Francisco Department of Public Health (SFDPH)" and
"Pest Control Operators (PCOs)", which a singular/plural split missed.

A further set are external publication names where the acronym _is_ the proper
noun and expanding it would be wrong: `UC IPM Pest Notes: ...` x3,
`NEHA: Vector control resources` x2, `SFDPH Environmental Health Branch fee
schedule` x1, `STEM` x1. Recommend closing these the same way as `UC`.

**The question for a content owner:** when the expansion already appears in
`primaryAgency` or the page title, does SF.gov's "spell out on first use per page"
count that as the first use? If yes, ~15 of these close with no edit. If no, each
needs a reworded body sentence, and that is copy authoring rather than a fix.

## Phase B reference — acronym rule and counts

`src/lib/server/ai/style/writing-and-style.md:153` settles the fix direction:
"Spell out on first use per page, abbreviation in parentheses. No periods.
Well-known ones (IRS, USA, ATM, PIN, URL, USPS, PDF) are exempt." That same row
records the shipping checker does **not** implement it -- "not checked (needs
per-page first-use tracking)" -- so the CSV's acronym column came from elsewhere
and may not be doing per-page first-use tracking either. Spot-check before bulk
editing.

Pair acronym with expansion at first use per page: `HHVC` 16, `SRO`/`SROs` 7,
`IPM` 5, `DPH` 2, `SFDPH` 2, `NEHA` 2, `PCO`/`PCOs` 2, `ANR` 1, `STEM` 1.

Most pages already carry the expansion somewhere (HHVC: 31 of 35 files) — the fix
is ordering, not new prose.

Close as false positives: `UC` x6 (`UC IPM`, `UC ANR` are the published brand
names), `VI` x1 (`SS VI.6`, a section number), `PG` x1.

**Ordering matters:** "Healthy Housing and Vector Control (HHVC)" adds ~6 words and
~40 characters wherever it lands. After this phase, re-measure both sentence
lengths **and** `summary` lengths -- #194 only just brought every summary under 110,
so an expansion landing in a summary can push it back over.

## Phase C — DONE (76 sentences rewritten, 3 exceptions documented)

Scanned by walking the real page objects with metadata fields excluded, not from
the CSV: **79 sentences over 20 words across 24 pages**, more than the CSV's 64
because the scan reaches every rendered field and splits multi-sentence strings.

Rewritten: 76, in four batches. Four sentences were shared verbatim across three
pages each (the anonymous-reporting line, "Review time", "If you reported
anonymously", "Your contact info"), so 4 rewrites closed 12 rows and kept the
corpus consistent.

Three remain over 20 words and are **deliberate**:

| Page                                                             | Text                                                                                    | Why it stays                                                                                                             |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `information/what-happens-after-you-report-housing-pest-problem` | `Complaint → Inspection → Notice of Violation → …`                                      | a process chain, not prose; 6 of its 23 "words" are arrow glyphs, and rewriting it as a sentence destroys what it is for |
| `pay-your-annual-healthy-housing-fee-apartment-buildings`        | `By mail: make a check … mail it to P.O. Box 7429 …`                                    | **false positive**: the sentence splitter breaks at `P.O.` before a capital. The two real sentences are 14w and 17w      |
| `location/environmental-health-office`                           | `PLACEHOLDER — the street address, floor, and public counter hours are not confirmed …` | a Phase F blocked-fact marker, not copy to shorten                                                                       |

Facts, figures and citations were preserved throughout — the fee rates
($256/$234 per hour), the deadlines (72 hours, 30 days), `Director's Rules
§VI.6`, `Article 2, Section 92`, and the DBI routing under the San Francisco
Housing Code (2025).

## Phase D — DONE (10 tables, no new corpus field)

`table no caption` on `report-health-code-article-11-plain-language` (7 tables)
and `report-healthy-housing-inspections-annual-summary` (3).

**The fix reuses the section heading instead of adding a `caption` field.** All
ten table sections already carry a heading, and every one already reads as a
table name -- "Article 11 sections at a glance", "Inspections by outcome",
"Violations by condition". `Section.svelte` prints it as the `<h2>` directly
above the table, so passing it down gives the `<table>` a real `<caption>` and
the scroll region a meaningful accessible name with:

- no new corpus field, so no `fields.ts`, `fieldResolver.ts` or `corpus.lock` churn
- no second string for a reviewer to keep in sync with the heading
- no visual change at all
- the caption text still reviewable, because the heading is already an edit target

The planned schema field would have duplicated copy that already existed.

It also fixed a defect nobody had filed: the scroll region's accessible name was
`aria-label={`${label} table`}` -- "Section [2] table", a positional string a
screen reader user cannot act on. It is now the heading.

Rendered `sr-only`, following `DataTable`'s `captionHidden` pattern, because the
heading above already prints the same text; a visible caption would print it
twice and drift from the Figma Table design, which carries no visible caption.

`tests/tableBlock.test.ts` asserted the OLD positional name (`/table/i`) and was
updated -- its intent ("the scroll container has an accessible name") is
unchanged and better served. `tests/tableCaption.test.ts` is new: caption text
per section, region name, and that the caption is `sr-only` rather than
`display: none`, since a caption removed from the box tree leaves the
accessibility tree with it.

Verified in the real browser, not only in jsdom: 7 tables / 7 captions on the
article-11 page, text matching each heading, bounding box 0.53x0.53px -- hidden
but present. All 21 axe e2e tests pass, including that page.

## Phase E — CLOSE: metaDescription, no work

Not a CSV finding -- it came out of my own scan, and it closes.

7 `metaDescription` fields run 114-143 characters: `agency-service-grouping` (132),
`appeal-notice-of-violation` (114), `article-11-compliance-for-property-owners` (125),
`health-code-article-11` (143), `healthy-housing-conditions-topic` (123),
`healthy-housing-vermin-resources` (124), `integrated-pest-management-education` (129).

Karl's manual 7.8 specifies **110-160** characters. All seven are inside it.
Nothing in this app caps meta descriptions -- `grep metaDescription src/lib/analysis/`
finds only `pageCopy.ts:46`, which classifies the field as `meta` and measures no
length. The 110-or-fewer rule `plain-language.js:1208-1210` argues with belongs to
the **legacy** `index.html` reviewer UI, not this one.

Zero `summary` fields exceed 110. Leave all seven alone.

## Phase F — BLOCKED: PLACEHOLDER rows (no code fix exists)

5 rows flagged `ALL CAPS / unexpanded: PLACEHOLDER`. These are deliberate refusals
to invent facts, on pages marked `PROPOSED PAGE — not in the current 29`. The
corpus says so in its own editorStatus notes:

> "a page of invented statistics is the single most damaging thing this corpus
> could publish, and a plausible number is harder to catch than an obvious gap"

Each needs a specific fact from HHVC:

| Page                                   | Fact needed                                                                                                                                                |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pay-healthy-housing-citation`         | citation amount, penalty schedule, payment channels, deadline                                                                                              |
| `report-inspections-annual-summary`    | every table figure; reporting period; data pull date                                                                                                       |
| `guides-in-other-languages`            | which guides exist in which languages                                                                                                                      |
| `campaign-rat-free-blocks`             | start date, neighborhoods, partner list                                                                                                                    |
| `location-environmental-health-office` | street address and floor; public counter hours and whether an appointment is needed; mailing address if different; accessible entrance and nearest transit |

Do not fix by expanding an acronym. Route to HHVC as a content request.

## Review fixes (2026-11-23)

Self-review of the PR found two issues, both introduced by this branch.

**1. Three heading rewrites re-keyed 27 field ids.** `deriveFieldKey` slugifies
the section heading, so the Phase A heading fixes moved every
`sections.<key>.*` id in those sections:

| Page                                                     | key before                          | key after                     |
| -------------------------------------------------------- | ----------------------------------- | ----------------------------- |
| `departments--healthy-housing-and-vector-control`        | `need-another-city-housing-service` | `other-city-housing-services` |
| `information--article-11-compliance-for-property-owners` | `what-you-re-required-to-do`        | `what-you-must-do`            |
| `integrated-pest-management-education`                   | `what-you-ll-learn`                 | `what-the-session-covers`     |

`edits.field_id` and `comments.field_id` store those ids and `latest_edits` is
keyed on `(page_id, field_id)`, so rows saved under an old id are orphaned --
present in the database, resolving to nothing on the page. `edits` has no UPDATE
or DELETE policy, so they cannot be repaired through the app.

Production holds **0 edits and 0 comments** (checked), so nothing was actually
orphaned. It was a latent trap, not damage.

Fixed by making `deriveFieldKey` honour an explicit `fieldKey` and pinning those
three sections to their ORIGINAL slugs, which decouples identity from copy --
the same split `Section.svelte` already makes between `fieldId` and `label`.
Honoured inside `deriveFieldKey` rather than at its two call sites so the
renderer and the hasher cannot disagree. Verified: field ids added=0, removed=0
against `origin/main`.

`tests/fieldKeyStability.spec.ts` guards it -- precedence, the three pinned keys,
and that no two sections on a page share a key, since a pin could otherwise
collide with another section's derived slug and silently fold two sections'
fields together.

`src/lib/corpus/fields.test.ts`'s exhaustive key-coverage guard caught `fieldKey`
as an unclassified section key and it is now listed NON_COPY: it is identity, and
pinning a key changes no reader-visible copy.

**2. A load-bearing CSS comment was orphaned from its rule.** The `.sr-only`
block had been inserted between `TableBlock`'s 17-line `.table-scroll` comment
(the design's shadow note, the four-layer gradient mechanism, `Rectangle 155`)
and `.table-scroll` itself, so that explanation appeared to document `.sr-only`.
Moved to the end of the style block. Later in the cascade only strengthens it,
and nothing else targets the caption.

Four copy nits were recorded and left for a content owner: the DBI jurisdiction
clause was disambiguated by interpretation; the appeal-eligibility sentence turned
an example list into an exhaustive one; the mold bullet dropped "growing or"; and
the at-risk callout dropped the hedge "often".

## Mechanics for every phase

- Any `src/lib/data/` edit needs `bun run corpus:lock` regenerated; #194 is the
  precedent (9 data files + `corpus.lock` in one commit).
- An edit to a `karl` field needs a before/after diff of `classifySection` — note
  prose drives the card classifier.
- `bun run verify` before each PR; `main` requires `test & build` and `e2e`.
