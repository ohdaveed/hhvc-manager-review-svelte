# Landing page: status badges, search + status filters, themed groups

Plan for the four changes asked for on `/`:

1. a status badge next to each page link,
2. a search box and a status filter (`All` / `Undecided` / `Needs revision` / `Blocked` / `Approved`),
3. the 39 links clustered into collapsible themed sections,
4. a hero card at the top pairing a colour-coded segmented progress bar with the
   Continue CTA,
5. **How it works** made collapsible,
6. the page links rendered as **scannable rows with a subtle hover state**, not raw
   underlined links.

Branch off `main` (`main` is ruleset-protected — PR required). Extends the record in
[`2026-11-23-landing-page-rulings.md`](2026-11-23-landing-page-rulings.md).

---

## Decisions for the repo owner

**D1 — the grouping taxonomy. RULED 2026-11-23: six sections**, the default below.
Five cannot cover the corpus without a grab-bag; see "Why six, not five". The
exactly-five and literal-five variants were offered and declined.

**D2 — where AI drafts go (defaulted).** A draft has no theme — it is described by a
reviewer in free text at request time. Default: a **"Proposed pages"** section rendered
after the themed six, present only when `draftsStore` is non-empty, excluded from the
`groups.ts` exhaustiveness test. Rejected: classifying a draft by AI (a second model
call to decide which `<details>` it lands in), and hiding drafts (the propose form sits
on the same page — a reviewer must see what they proposed).

**D3 — label vocabulary (defaulted, with a flag).** The request says "Undecided"; the
app says three different things for the same four statuses today:

| status         | `ReviewQueue` `PRESENTATION` | `ReviewPanel` `decisions` | requested here |
| -------------- | ---------------------------- | ------------------------- | -------------- |
| `needs-review` | Needs review                 | Needs review              | **Undecided**  |
| `revise`       | Needs revision               | Revise                    | Needs revision |
| `blocked`      | Blocked                      | Blocked                   | Blocked        |
| `approved`     | Approved                     | Approved                  | Approved       |

Default: the landing page uses the requested words, and **nothing elsewhere is renamed**
in this change. That is a deliberate third vocabulary, so Task 1 below makes the map
shared and single-sourced rather than copied a third time; renaming the queue and the
panel to match is a separate decision, noted as follow-up F1.

---

## What is already there

| Fact                                                                     | Where                                               |
| ------------------------------------------------------------------------ | --------------------------------------------------- |
| The list: corpus ids then drafts, flat `<ul>`, no status                 | `src/lib/components/landing/AllPagesList.svelte`    |
| **A three-segment green/amber/red progress bar over a grey track**       | `ReviewQueue.svelte` lines ~173–185                 |
| `decided of total` + Continue CTA, no bar                                | `src/lib/components/landing/ProgressSummary.svelte` |
| Status lives on the review row, keyed by `path`                          | `ReviewPage.status` in `src/lib/stores/reviewState` |
| Canonical status order                                                   | `QUEUE_STATUS_ORDER`                                |
| Headings + bar tones per status                                          | `PRESENTATION` in `ReviewQueue.svelte`              |
| Pill labels + fill tones per status                                      | `decisions` in `ReviewPanel.svelte`                 |
| A working title+path search over the same data                           | `needle` / `shown` in `ReviewQueue.svelte`          |
| Signed-out fallback: render the corpus, show no status                   | `browsing` in `ReviewQueue.svelte`                  |
| `<ToggleGroup>`, `<Badge>`, `<Input>`-shaped primitives                  | `src/lib/components/ui/`                            |
| **A real scannable row: title line, meta line, left border, hover tint** | `queueLink` snippet in `ReviewQueue.svelte`         |
| A collapsible drawer using native `<details>`                            | `WalkthroughDrawer.svelte`                          |
| Routable id derivation (`sf.gov/a/b` → `a-b`)                            | `routableId` in `src/lib/corpus/pageId.ts`          |
| Corpus `audience` is a prose **string array**, not a categorical tag     | all 39 modules in `src/lib/data/`                   |

**The segmented bar already exists and is already the requested design.** `ReviewQueue`
renders three segments over a grey track, filtering `needs-review` out of the segments,
with `role="img"` and a sentence label. Its tones come from `PRESENTATION[].bar`:
`bg-sfds-green` (`#0b7a3e`), `bg-sfds-amber` (`#a84b00`), `bg-sfds-red` (`#b7202e`) —
green / amber / red for approved / revise / blocked, as asked. So the hero card
**extracts** that bar rather than building a second one; building a second one is how
the two would come to disagree about a colour.

Note `--color-sfds-amber` is a dark orange-brown, not a bright amber. It is the token
the app already states `revise` in, so consistency with the queue and the decision pills
wins over the literal colour name.

## Tooling: nothing to install

The components for scannable rows are already here, and so is the generator:

| Already a dependency                                | What it gives                                                                                        |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `shadcn-svelte@^1.5.0` (devDep) + `components.json` | `bunx shadcn-svelte@latest add <name>` — style `nova`, lucide icons, aliased to `$lib/components/ui` |
| `bits-ui@^2.19.0`                                   | the headless primitives those components wrap                                                        |
| `tailwind-variants@^3.3.1`                          | the variant API `badge.svelte` is built with                                                         |
| `@lucide/svelte@^1.78.0`                            | icons for the row's trailing affordance                                                              |

So **no new dependency.** Per the repo's scope rules, a new one would need flagging
first, and there is nothing here to flag.

Two generated components are worth pulling if they are wanted, both from the CLI above:
`card` (already present) and `accordion`. **The plan deliberately does not add
`accordion`** — Task 4 uses native `<details>` for the six group sections, and
`WalkthroughDrawer` already uses `<details>` elsewhere in the app. A bits-ui Accordion
beside it would put two disclosure mechanisms with different keyboard behaviour on the
same page. One mechanism, used twice, is the better outcome.

## Scannable rows: the precedent, and the one that looks right but is not

**Use `queueLink` from `ReviewQueue.svelte`.** It is already the row being asked for: a
real `<a>` wrapping a title line and a muted meta line, a 2px left border that fills in
on the current page, and `hover:bg-sfds-blue-l1/60` as the subtle hover tint. It is in
the tool's own chrome, which is the right register for `/`.

**Do not reuse `LinkGrid.svelte` or `CardsBlock.svelte`,** which is what a search for
"link rows" turns up first. Those are **mockup furniture and deliberately inert** — a
title there is an `EditTarget` styled to look like a link, never an `<a href>`, because
a dead anchor fails axe and the mockup has nowhere to navigate to. They also encode
measured sf.gov spacing (28px rules, `#2A60AF` link blue) that exists to make the
mockup look like the live site. Borrowing either would put sf.gov's visual language
into the review tool's chrome and give the reviewer rows that look clickable and are
not.

Two things that look usable and are not:

- **`audience` cannot group anything.** It is the page's "Who this is for" copy — an
  array of sentences on all 39 modules. Measured, not assumed.
- **`type` is the Karl page type** (`Transaction`, `Information`, `Step by step`, …), a
  CMS template, not a theme. Grouping by it would put `pay-a-healthy-housing-citation`
  beside `report-rats-mice-four-legged-problems`.

So the themed mapping is **new hand-authored content**. That is the part needing a
ruling, not the code.

---

## Why six, not five

39 corpus pages. Five coherent task groups cover 34; the last 5 are cross-cutting
department and navigation pages that belong to no task:

`departments--healthy-housing-and-vector-control`,
`departments--healthy-housing-and-vector-control--about`,
`topics--healthy-housing-conditions`, `location-environmental-health-office`,
`resource-guides-in-other-languages`.

Forcing them into a task group would make one section mean nothing. The example list in
the request also mixes two axes — Reporting / Inspections / Records are **tasks**,
Property owners / Tenants are **audiences** — so a page like
`tenant-steps-after-notice-of-violation` qualifies for two. The default resolves that
with one stated rule:

> **Tie-break: task beats audience.** A page goes in the group matching what the
> reader came to do. An audience group holds only pages whose entire subject is that
> audience's standing obligations — not a task they happen to perform.

Under that rule a Tenants group holds **one** page (`information-tenant-rights-and-
reporting-housing-conditions`, itself half a reporting page), which is why the default
has no Tenants section.

### Default mapping — 6 sections, 39 pages

Keys are routable ids (`routableId`), which is what `/review/[slug]` matches and what
`pageStore.pages[].id` holds. **Not** module filenames: `hhvc-inspection-scope.ts`
routes as `information-learn-what-hhvc-can-inspect`.

**1. Report a problem (8)**

```
report-rats-mice-four-legged-problems
report-cockroaches-mosquitoes-insects
report-garbage-filth-vegetation
report-problem-sro-hotel
step-by-step-report-a-pest-problem
information-who-to-call-about-a-housing-problem
information-what-happens-after-you-report-housing-pest-problem
information-tenant-rights-and-reporting-housing-conditions
```

**2. Inspections and violations (9)**

```
information-learn-what-hhvc-can-inspect
find-healthy-housing-inspector-by-neighborhood
get-ready-for-a-housing-inspection
get-ready-for-a-follow-up-inspection
fix-healthy-housing-and-vector-control-violation
step-by-step-correct-a-violation-and-close-your-case
appeal-a-notice-of-violation
tenant-steps-after-notice-of-violation
report-health-code-article-11-plain-language
```

**3. Records, fees and payments (8)**

```
find-complaints-and-inspection-records
lookup-residential-health-code-violations
find-residential-hotel-and-shelter-records
look-up-building-records
make-a-public-records-request-environmental-health
pay-a-healthy-housing-citation
pay-your-annual-healthy-housing-fee-apartment-buildings
report-healthy-housing-inspections-annual-summary
```

**4. Pests and prevention (6)**

```
rat-free-blocks
integrated-pest-management-education
mosquito-control-program
mosquito-education-workshop
step-by-step-prepare-your-unit-for-pest-treatment
resource--healthy-housing-and-vermin-information
```

**5. Property owners and managers (3)**

```
property-owner-responsibilities-hhvc
information--article-11-compliance-for-property-owners
information-integrated-pest-management-for-property-owners-and-managers
```

**6. About HHVC (5)**

```
departments--healthy-housing-and-vector-control
departments--healthy-housing-and-vector-control--about
topics--healthy-housing-conditions
location-environmental-health-office
resource-guides-in-other-languages
```

Judgment calls worth contesting, each with the rule applied:

| Page                                                | Placed in                  | Why, and the alternative                                             |
| --------------------------------------------------- | -------------------------- | -------------------------------------------------------------------- |
| `tenant-steps-after-notice-of-violation`            | Inspections and violations | Task beats audience. Alternative: a Tenants section.                 |
| `information-tenant-rights-and-reporting…`          | Report a problem           | Its subject is reporting. Alternative: a Tenants section.            |
| `report-health-code-article-11-plain-language`      | Inspections and violations | It is the law being enforced. Alternative: Records (it is a Report). |
| `report-healthy-housing-inspections-annual-summary` | Records, fees and payments | Published data, not an inspection to prepare for.                    |
| `resource--healthy-housing-and-vermin-information`  | Pests and prevention       | Alternative: About HHVC, as a resource hub.                          |
| `step-by-step-prepare-your-unit-for-pest-treatment` | Pests and prevention       | Alternative: Inspections and violations (it follows a NOV).          |

### Declined alternative, kept for the record

Exactly five, by merging section 5 into section 4 as **"Prevention and property care"
(9)**. Declined 2026-11-23 in favour of keeping the owners/managers pages addressable
as their own section.

---

## Tasks

### Task 1 — one shared status vocabulary

`src/lib/review/statusLabels.ts` (new): a `satisfies Record<ReviewPage['status'], …>`
map of **label + badge classes + bar class**, plus the canonical order. Then **change
`ReviewQueue`'s `PRESENTATION` and `ReviewPanel`'s `decisions` to read from it** rather
than leaving a third and fourth copy behind.

- Labels: the words from D3.
- Badge tone: SFDS pairs, **not shadcn `destructive`** — that measures 3.98:1
  (`#e7000b` on `#fde5e7`), below AA, and `AnalysisPanel`'s `ISSUE_BADGE`
  (`bg-sfds-red-l1 text-sfds-red`, 5.64:1) is the existing precedent for exactly this.
- Bar tone: the queue's existing `bg-sfds-green` / `bg-sfds-amber` / `bg-sfds-red`,
  moved here unchanged.
- The label carries the meaning; colour is redundant reinforcement (WCAG 1.4.1).

Putting badge tone and bar tone in the same record is the point: a page's badge in the
list and its slice of the hero bar then cannot be different colours for the same status.

Test: `src/lib/review/statusLabels.test.ts` — asserts every `QUEUE_STATUS_ORDER` entry
has a label, a badge class and a bar class, and that the map has no extra keys.

### Task 2 — the group mapping, with an exhaustiveness test

`src/lib/landing/groups.ts` (new): ordered `{ id, heading, pages: readonly string[] }[]`
from the approved table.

Test: `src/lib/landing/groups.spec.ts` — **server** project, since it reads `allPages`.
Three assertions, which is the whole point of the file:

1. Every `pageStore.pages[].id` appears in exactly one group.
2. No group names an id that is not in the corpus.
3. The counts sum to `pageStore.pages.length`.

Without (1) and (2), adding a corpus module silently drops it off the landing page —
the same failure shape as the e2e fixture-import bypass: nothing conflicts, so a clean
merge is what hides it.

### Task 3 — the filter, as a pure function

`src/lib/landing/filter.ts` (new):
`filterPages({ paths, query, status, statusOf, titleOf })` → matching paths.

- Query matches title **or** path, lowercased — the same rule as `ReviewQueue`'s
  `shown`. Extract it to one helper so the two cannot diverge.
- `status: 'all'` short-circuits.
- **A path with no review row is not "Undecided".** `statusOf` returns `undefined`
  there, and such a page matches only `all`. This matters: `seed.hosted.sql` writes 39
  rows and the corpus has 39 pages today (measured), but several modules are annotated
  `PROPOSED PAGE — not in the current 29`, so the two have been out of step before and
  a `?? 'needs-review'` default would invent a decision state.

Test: `src/lib/landing/filter.test.ts` — empty query, title hit, path hit, case, each
status, and the no-row case.

### Task 4a — the shared row

`src/lib/components/review/PageRow.svelte` (new), extracted from `ReviewQueue`'s
`queueLink` snippet so the queue and the landing list are one component:

```
[ title                                    ] [ badge ]
[ muted meta line: type · N edited fields  ]
```

- A single `<a>` wrapping the whole row, so the hit area is the row, not the words.
  One link per row — a second focusable element inside it (the badge as a filter
  shortcut) would double the tab stops through 39 rows. That is F4's problem, not this
  one's.
- Hover `bg-sfds-blue-l1/60`, matching the queue. **Hover is not the only cue:**
  `focus-visible` gets a visible ring, since hover is invisible to a keyboard user and
  absent on touch.
- `aria-current="page"` support kept for the queue's use; unused on `/`.
- The badge is a plain `<span>` inside the link, not an interactive `<Badge href>`.
- Variants by prop, not by a second component: the queue passes `density="compact"`
  (13px/18px, as now), the landing list `density="comfortable"`.

Test: `src/lib/components/review/pageRow.test.ts` — the whole row is one anchor, the
href comes from `reviewHrefFor`, the badge renders or is absent, the meta line is
omitted when empty. Then assert the queue still renders identically — this is a
refactor of a working component.

### Task 4b — `AllPagesList.svelte`

- Labelled search `<input>` (`<label for>`, not placeholder-as-label).
- Rows via `<PageRow density="comfortable">`, one per page, separated by hairline
  rules rather than `space-y` gaps: at 39 rows, rules read as a scannable table and
  gaps read as 39 floating items.
- Status filter: `<ToggleGroup type="single">` with the five options, each showing a
  count. `aria-label="Filter by status"`.
- One `<details>` per group with `<summary>` carrying heading + count. Native
  `<details>`, not a custom disclosure: keyboard, screen-reader semantics and in-page
  find all work without JS.
- Badge tone from Task 1. Badge omitted when there is no review row.
- `aria-live="polite"` region announcing "N of 39 pages" when a filter is active —
  without it, filtering is a silent change for a screen-reader user.

Three behaviours the filter forces:

1. **While a filter is active, groups with matches render open.** Otherwise search
   "finds" rows that stay collapsed and invisible.
2. **Groups with no matches are hidden**, not shown at 0 — five empty disclosures are
   noise.
3. **The reviewer's own open/closed state is restored when the filter clears.** Keep it
   in component state; `localStorage` is out of scope.

Signed-out / not-`ready`: no badges, no status filter; search and groups still work.
`ReviewQueue`'s `browsing` is the prior art. **Never render 39 "Undecided" badges while
the load is pending** — that is a claim the page does not have yet, the same error the
`ready` gate on the progress line exists to prevent.

### Task 5 — extract the segmented bar

`src/lib/components/review/StatusBar.svelte` (new), lifted from `ReviewQueue` lines
~173–185 and given a `size` prop (`'sm'` for the sidebar's `h-1.5`, `'lg'` for the hero
card). `ReviewQueue` then renders `<StatusBar size="sm" …>` — so this task is a
refactor whose test is that the queue looks and reads the same.

Four properties of the existing bar to carry over rather than re-decide:

1. **`needs-review` gets no segment.** The grey track _is_ the undecided remainder; a
   fourth grey segment on a grey track would be invisible and would double-count.
2. **`role="img"` with a sentence label, not `role="progressbar"`.** A progressbar
   carries one value; this carries three. Keep the queue's choice, and extend the label
   to name the parts — `"12 of 39 pages decided, 31 percent: 8 approved, 3 need
revision, 1 blocked"` — because a bar split by colour alone says nothing to a screen
   reader (WCAG 1.4.1 again, and the reason the per-row coloured dot was removed from
   the queue).
3. **Percentages, not flex weights**, so a one-page slice of 39 is still visible.
4. The three fills on `bg-sfds-grey-l2` are non-text graphics needing 3:1 (WCAG 1.4.11),
   which the dark tokens clear comfortably — but the **boundary between adjacent
   segments** is what distinguishes them, so keep the hairline separation the queue has
   rather than letting amber and red touch.

Test: `src/lib/components/review/statusBar.test.ts` — segment widths for a known mix,
no segment for `needs-review`, the label text, and an all-undecided mix rendering a bar
with no segments at all (not a zero-width div each).

### Task 6 — the hero card

Replace `ProgressSummary.svelte`'s contents (keep the filename — it is imported by
`+page.svelte` and asserted by `tests/landingPage.test.ts`) with a card that holds, in
one bordered block at the top of `/`:

- the heading line `{decided} of {total} decided` with the percentage,
- `<StatusBar size="lg">`,
- a legend naming each colour with its count — the bar's own `aria-label` serves screen
  readers, the legend serves everyone else, and without it green/amber/red is a key the
  reviewer has to guess,
- the **Continue to {nextTitle}** button as the card's primary action.

Three states it must keep. All three work today and a card is where they regress:

| State               | Card shows                                                     |
| ------------------- | -------------------------------------------------------------- |
| Nothing decided yet | All-grey bar, `0 of 39 decided`, CTA reads **Start reviewing** |
| Some decided        | Segments + legend + **Continue to {nextTitle}**                |
| Every page decided  | Full bar, no CTA, `Every page has a decision.`                 |

`nextHref` is already `undefined` in the last case by design (`reviewProgress` picks the
first `needs-review` rather than `firstQueuePath`, so Continue never points at an
approved page). The card must not substitute a link there.

**The loading placeholder has to match the card's height.** `+page.svelte`'s header
carries `min-h-20` for exactly this reason today, with a comment saying a fixed-height
neutral line keeps the header from jumping. A card is much taller than one line, so that
value changes with it — otherwise every signed-in load shifts the whole page down once
`ready` flips, and the signed-out visitor gets the same jolt before the sign-in link
appears.

### Task 6a — How it works, collapsible

`HowItWorks.svelte` is four `<li>` strings under an `<h2>` today. Make it a `<details>`
with the `<h2>` inside the `<summary>`, the same mechanism as the group sections, so the
page has one disclosure pattern rather than two.

**Default state is the decision here.** Open for a first-time visitor, closed for a
returning one — the whole point of the hero card is a "pick up where you left off"
anchor, and four paragraphs of onboarding above the list works against that on every
visit after the first.

Default: **closed when signed in, open when signed out.** Signed-in is the returning
case by definition, and signed out the page's job is to explain the tool. This needs no
storage, no flash of the wrong state on hydration, and no per-reviewer state to migrate
later. Rejected: `localStorage` (a first-paint flash, and `/` is SSR'd), and always-open
(it is what exists now and what the request is asking to change).

`<details open={...}>` reflects the initial state only; once the reviewer toggles it,
their choice stands for the visit.

### Task 7 — the layout

`AllPagesList` is currently one of three `md:grid-cols-3` columns. Search + a
five-option filter + six disclosures will not fit a third of the width. In
`src/routes/+page.svelte`: hero card full-width at the top, **How it works** (now a
collapsed one-line summary when signed in) and **Propose a page** side by side beneath
it, then the list full-width below. Collapsing How it works is what makes this fit —
the two side-by-side sections are now a summary line and a short form, not four
paragraphs against a textarea.

### Task 8 — tests

| File                                                | Project | Adds                                                                                                                                            |
| --------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/landingPage.test.ts`                         | client  | badges per status; no badge signed out; group headings; **all three hero states, including that Continue is absent when everything is decided** |
| `tests/allPagesList.test.ts` (new)                  | client  | search filters; status filter; matching group auto-opens; count line                                                                            |
| `src/lib/components/review/pageRow.test.ts` (new)   | server  | one anchor per row; href; badge present/absent; meta omitted when empty                                                                         |
| `tests/howItWorks.test.ts` (new)                    | client  | closed signed in, open signed out; all four steps present in the DOM either way                                                                 |
| `src/lib/components/review/statusBar.test.ts` (new) | server  | widths, no `needs-review` segment, label text, all-undecided                                                                                    |
| `tests/landing.e2e.ts`                              | e2e     | expand a section, follow a link; keyboard-toggle a `<summary>`                                                                                  |
| `tests/accessibilitySignedIn.e2e.ts`                | e2e     | **scan `/` signed in** — see below                                                                                                              |

`landingPage.test.ts` already has a `counts decisions, not rows` case covering all four
statuses, so the fixture for a mixed bar exists — extend it rather than adding a second.

The axe addition is the one that is not optional. Signed-in surfaces had never been
scanned until `accessibilitySignedIn.e2e.ts` existed, and the first scan found
`--color-sfds-slate-l2` at 4.07:1 and a shadcn `destructive` badge at 3.98:1. This
change adds **status-coloured badges and a colour-coded bar**, the exact category that
blind spot hid. But
`gotoSignedIn` proves rendering by asserting queue rows, and `/` is outside the review
layout and has no queue — so the landing scan needs its own proof-of-render assertion
(a badge is visible, a `<summary>` is present) before axe runs, or it scans a
signed-out page and reports green. For the hero card the proof-of-render assertion is a
visible bar segment, not just the card's border — an all-undecided bar is grey and would
scan clean while telling you nothing about the coloured segments.

Every new e2e spec imports `test` from `./fixtures`, enforced by
`tests/e2eFixtureImports.spec.ts`.

---

## Gates

`bun run verify` (unit + build), then `bun run test:e2e`. Three ratchets are blocking
and this change must not move them: `lint:ratchet` (4), `check:ratchet` (0 errors, 0
warnings), `format:ratchet` (50). New files must be prettier-clean — the PostToolUse
hook handles that, but the ratchet is what fails if it does not.

No migration, no new dependency, no env var. `draft_pages` and `pages` are read through
stores that already exist.

Two gates this change is unusually likely to trip, both worth running early rather than
at the end:

- **`check:ratchet` enforces zero warnings, not just zero errors.** Svelte's a11y
  warnings are in that count, and a row built as a clickable non-anchor is exactly what
  raises one. `PageRow` being a real `<a>` keeps it at zero.
- **axe's `scrollable-region-focusable`** is why the mockup container carries a
  `tabindex="0"` and a paired `svelte-ignore`. If the full-width list gets its own
  scroll container, it inherits that same conflict — prefer letting the page scroll.

## Follow-ups, not in scope

- **F1** — rename the queue and panel labels to one vocabulary (D3). Needs a ruling
  because `ReviewPanel`'s pills are what a reviewer clicks to record a decision.
- **F2** — persist the open/closed sections per reviewer.
- **F3** — group the review queue's sidebar by the same themes, as a second axis under
  the status grouping.
- **F4** — make the hero bar's segments clickable, setting the status filter below. The
  obvious next move once both exist, deliberately not in this change: it couples two
  components that are otherwise independent, and the filter needs to be proven on its
  own controls first.
