# Karl field-mapping layer: Karl outline + Blueprint (plan, not started)

Status: **plan only, awaiting approval.** No code changed. Measurements below came from a scratch
copy of `karl-transcript.js` run with `bun` over the real corpus on 2026-11-23.

## 1. Findings: what already exists

**Most of the "data change" already exists.** The repo already has a per-type Karl schema in
editor order, an unplaced-copy sweep, and a stable field id on every rendered string. What it lacks is
the **join** between them: nothing records _which_ Karl field claimed _which_ rendered element.

| Asked for                     | Already in the tree                                                                                                                                                                                                                                                             | Gap                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Schema per type, editor order | `KARL_PANELS` in `src/lib/legacy-core/karl-blocks.js:363`, 10 types, 110 panels, `order`/`required`/`repeatable`/`blockTypesDoc`/`source`, transcribed from the live Wagtail forms (`docs/karl-export-field-map.md`, E1/E2)                                                     | Limits are spread over three files (below). No typed access.                             |
| Limits                        | `KARL_FLAGS` (`karl-blocks.js:191`): button 25, cost description 120, Things to know 2, spotlight caps. `COMPONENT_SUPPORT` (`src/lib/karl/componentSupport.ts`): accordion title 65, alert 30/120, button 25 **again**. `STEP_LIMIT = 15` (`src/lib/karl/contentTypeRules.ts`) | Title 65 / Description 110 are cited only in docs, not code. Button 25 is defined twice. |
| Allowed Related types         | `RELATED_PERMITTED_TYPES` (`src/lib/karl/sitemap.ts`), shared with `COMPONENT_SUPPORT.related`                                                                                                                                                                                  | None                                                                                     |
| Unplaced detection            | `buildTranscript().unmapped` (`src/lib/legacy-core/karl-transcript.js:993` `sweepUnconsumed`): 94 findings across 39 pages, each with a `shape` and a register-backed `reason` (U1, U3, U5, U20–U22)                                                                            | None                                                                                     |
| `karlField` per copy field    | Every rendered string goes through `EditTarget.svelte` with a `fieldId`, which it emits as `data-rewrite-field` (30 call sites, e.g. `StepsBlock.svelte:29` `sections.${sectionKey}.steps.${i}.title`)                                                                          | No Karl field attached.                                                                  |
| Content type per page         | Yes: `type: 'Transaction'` on every data module, e.g. `src/lib/data/report-rats-mice-four-legged-problems.ts:3`                                                                                                                                                                 | None                                                                                     |

**Walkthrough.** `pageStore.mode` (`src/lib/stores/pageData.svelte.ts:533`) is
`'review' | 'walkthrough' | 'sitemap'`. The toolbar button calls `pageStore.enterWalkthrough()`
(`src/routes/review/+layout.svelte`). `buildWalkthrough()` (`src/lib/karl/walkthrough.ts:329`)
re-presents `buildTranscript(page, record, pagesByKey)` as steps, which `WalkthroughDrawer.svelte`
and `WalkthroughHeader.svelte` render. Each step has `rawName`, `uiLabel`, `values` and `notes`, and
gaps arrive as `{path, reason, kind:'flag'|'unmapped'}`. **Steps have no link back to page
elements**, so a step cannot highlight its copy, and that link is the piece both new modes need.
Both modes should extend the walkthrough's data, not be built beside it.

**Corpus.** "Copy checks read the corpus module" (`AnalysisPanel.svelte:296`) refers to
`src/lib/data/*.ts`. These are read through `analyzableCopy()` → `extractCopy()`
(`src/lib/corpus/fields.ts`), which yields leaf ids. Sections are keyed by `deriveFieldKey()`
(`src/lib/corpus/fieldKey.ts`), a heading slug or a pinned `fieldKey`, **not** by index. Each
section has a free-text `karl` note. Treat those notes as review content: a classifier that matches
note prose is a known defect class (U27).

**Analysis checks.** `analyzePage()` (`src/lib/analysis/index.ts:243`) calls
`karlComponentFindings` and `karlContentTypeFindings`. Your three known gaps all trace to code:

- **"What to do" passes pages without the heading.** `isWhatToDo`
  (`karlContentTypeChecks.ts:43`) also matches the **note prose**: `/what[_ ]to[_ ]do/i.test(section.karl)`.
- **Related is inconsistent.** `COMPONENT_SUPPORT.related` checks the _linked_ page's type, never
  whether the _host_ type has a Related field. The transcript then lets catch-all matchers absorb
  "Related pages" sections silently. Measured:
  ```text
  Resource Collection  recordsHub/ownerHub/languageGuides  "Related pages" -> body (Resources)
  Report               inspectionsAnnual                   "Related pages" -> content (match: {})
  Location             ehOffice                            "Related pages" -> body (inferred)
  Step by step         3 pages                             "Related pages" -> UNMAPPED
  Transaction          appealNotice, payCitation           "Related pages" -> UNMAPPED (card class)
  ```
- **No checks yet** for PLACEHOLDER (32 occurrences in 5 modules), URL pattern, Title/Description
  length, or empty fields.

**Render path.** `Page.svelte` → `Section.svelte` → `blocks/*.svelte`. All copy goes through
`EditTarget.svelte`, which has two render branches: a `<button data-rewrite-field>` when signed in
and a plain element when signed out. **That component is the single, least-invasive place for
`data-karl-field`.** Section-level outlines go on the `<section>` root in `Section.svelte` and on
the `WhatToKnow`/`ContactSection` roots.

**Where your brief doesn't match the code:**

- **Campaign "Contact us".** `KARL_PANELS.Campaign` has a `contact` panel ("Contact us", from the
  E2 live-admin capture), so the code says it is not unplaced. Information has none (U22), which
  matches your audit.
- **Missing Description.** All 39 pages carry `summary`, which maps to `description`, and none is
  over 110 characters. Measured: `{t65: 0, d110: 0, nodesc: 0}`. Either the audit read "Description"
  differently, or the summaries were added since. The Blueprint will show it either way.
- **URL patterns.** Karl contradicts itself. The URLs page
  (`…/components/urls`) lists Information, Step by step, Topic and Agency as `sf.gov/[slug]`,
  `sf.gov/[slug]`, `sf.gov/topic-[slug]` and `sf.gov/department-[slug]`. Each type's own page lists
  `sf.gov/information/…`, `sf.gov/step-by-step/…`, `sf.gov/topics/…` and `sf.gov/departments/…`.
  Only Transaction and Campaign agree, so the URL rule is **unconfirmed** for everything else.
- **"1 Transaction link per step".** The Steps page says "Optional: Link to a transaction", a single
  field with no stated cap. The rule is unconfirmed.
- **The toolbar can't take another switch.** The old "Karl tags" switch was removed because the
  toolbar has zero slack between 1080px and 1400px (`+layout.svelte:46`).

## 2. Recommended approach

### 2a. Schema: a typed view over the existing inventory, not a new inventory

New file `src/lib/karl/schema.ts`. It composes `KARL_PANELS`, `KARL_FLAGS`, `COMPONENT_SUPPORT`,
`CONTENT_TYPE_RULES` and `RELATED_PERMITTED_TYPES`, keyed by `(type, rawName)`. Field names and
order come only from `KARL_PANELS`. The new file adds the **rules**, each carrying a citation and a
`status` of `confirmed` or `unconfirmed`. Title 65 and Description 110 become code here for the
first time. Button 25 moves here and both old copies read it.

```ts
export type RuleStatus = 'confirmed' | 'unconfirmed';
export type Cite = { helpTitle: string; url: string; says: string };
export type FieldRule =
	| { kind: 'maxChars'; sub?: string; max: number; strict: boolean; status: RuleStatus; cite: Cite } // strict: < vs <=
	| { kind: 'maxItems'; max: number; status: RuleStatus; cite: Cite }
	| { kind: 'fixedHeading'; heading: string; status: RuleStatus; cite: Cite }
	| { kind: 'noPlaceholder'; status: 'confirmed'; cite: null }; // house rule, every field
export type KarlPanelSchema = {
	rawName: string; // KARL_PANELS key, unique per type (asserted)
	label: string; // KARL_PANELS uiLabel = live Wagtail label
	helpLabel?: string; // help-center name when it differs → open question
	order: number;
	required: boolean;
	repeatable: boolean;
	allows: readonly string[]; // block choices, from blockTypesDoc
	inert?: true; // redirect_url, agency_redirect: no dashed placeholder
	rules: readonly FieldRule[];
};
export type ContentTypeSchema = {
	type: string;
	url: { pattern: string; status: RuleStatus; cite: Cite };
	relatedTargets: readonly string[] | null; // null = type has no Related field
	fields: readonly KarlPanelSchema[];
};
```

A test asserts that every `(type, rawName)` in `schema.ts` exists in `KARL_PANELS` and that the
order matches. **`KARL_PANELS`' shape does not change**, because tests read the field map against
it (`src/lib/karl/crossTypeFields.test.ts`, `whatToKnowOwner.test.ts`). The `tests/karl-blocks.test.js`
named in `karl-blocks.js`' header is a legacy-repo path that doesn't exist here, so that comment is
stale.

### 2b. Placement (the brief's `karlField`): derived at runtime, not hand-authored, and never stored

Each copy field gets a hand key only where derivation is wrong. Hand-keying 968 claims across 39
pages would duplicate the 105 `source` matchers and drift from them. That is the same failure as the
prose-matching classifier in U27. There are four steps:

1. **Record claims in `buildTranscript`.** Add a `claim(path)` helper beside `consumed.add` that
   records `transcript.claims[path] = context.currentPanel`. Set `currentPanel` to `panel.rawName`
   in the panel loop (`karl-transcript.js:360`), to `'promote'` around `emitPromoteTab`, and to
   `null` before `sweepUnconsumed`. A scratch prototype with exactly this change produced 968
   claims across 39 pages. Its first run leaked Promote paths into `redirect_url`, which is why the
   reset is part of the change. The walkthrough and Markdown output stay byte-identical, asserted
   against current output.
2. **Join to rendered ids** in the new `src/lib/karl/placement.ts`:
   `placementsFor(page) → Map<fieldId, Placement>`. It converts `sections.<index>` to
   `sections.<deriveFieldKey>`, then takes the longest-prefix match against claims and against
   `unmapped`. Claims are container-level (`…steps.0.text`) and ids are leaf-level
   (`…steps.0.text.0`), so a prefix match is needed. A heading the sweep folded into its section
   (`missing.length > 1`) inherits that section's red.
3. **Label** = panel `uiLabel` + instance number + sub-field, from a small per-panel suffix map:
   `steps.N.title` → `Section N+1 · Section title`, `steps.N.button` → `Section N+1 · Button link`,
   `thingsToKnow.N.label` → `Block N+1 · Title`. Repeat panels are numbered (`Custom Section 2`).
4. **Status** comes from signals that already exist. No new judgement layer:

   | Status              | Text and icon (never colour alone) | Signal                                                                                                                                                                                                                      |
   | ------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | Placed (green)      | ✓ "Goes into Karl"                 | claimed, no rule broken                                                                                                                                                                                                     |
   | Needs a fix (amber) | ⚠ "Goes into Karl, needs a fix"    | claimed + a `schema.ts` rule fails, or PLACEHOLDER. Also: a "Related" section absorbed by a catch-all matcher (RC `body`, Report `content`, Location `body`). Also: a `what_to_do` section whose heading isn't "What to do" |
   | Unplaced (red)      | ✕ "Won't carry over"               | in `transcript.unmapped`                                                                                                                                                                                                    |
   | Unconfirmed (gray)  | ? "Karl's rule unconfirmed"        | panel `inferred: true`, `isSupported() === 'unknown'`, or a rule whose `status` is `unconfirmed`                                                                                                                            |

When several statuses apply, the chip shows the first of **Unplaced > Needs a fix > Unconfirmed > Placed** and lists
every reason. Rules are evaluated on the copy as rendered, base plus accepted edits (§6, items 6–7).

Nothing is written anywhere. `edits.field_id`, `latest_edits`, the review record fold and
`exportReview.ts` don't change, because a placement is computed per render from the page plus its
review record.

**Fix in the same slice:** `primary_agency` had `source: {kind:'none'}`, so the rendered
`primaryAgency` string read **red** on every page that has one. **Corrected while building (`f1277d6`):**
only the 16 Transaction pages carry `primaryAgency`, as a label rather than a page reference (the
field map's U6, "narrowed, not closed"). So the source is `{kind:'path', path:'primaryAgency'}` as
a CHOOSE **on Transaction only**; the other types carry no value and keep the FLAG.

### 2c. Mode 1: Karl outline

- **Toggle.** Replace the single "Open Karl walkthrough" toolbar button with a same-width **"Karl"
  menu**: Show Karl fields (a switch), Blueprint, Walkthrough. The toolbar width doesn't change.
  `pageStore.karlOutline` is a boolean, off by default and persisted the way `previewWidth` is
  (`localStorage`, `hhvc:` key prefix).
- **DOM.** `EditTarget` gets one optional prop, `placement?: Placement`, and renders
  `data-karl-field={ref.rawName}` `data-karl-status={ref.status}` on both branches.
  `Section.svelte`'s root gets the section-level ref, which is what gets outlined and chipped.
  The chips sit on blocks, not on every string, so the page stays readable. The mockup reads refs
  from a context (`setContext('karlPlacements', map)` in `Page.svelte`), so no block component's props
  change beyond `EditTarget`.
- **Accessibility.** The chip is a visible `<span>` with text: icon + status word + label. The
  label is bound with `aria-describedby`, because `EditTarget`'s `aria-label={name}` replaces the
  button's content and would silence a chip nested inside it. In the signed-out branch the chip is
  plain text. A summary line ("12 go into Karl · 2 need a fix · 3 won't carry over") is
  `role="status"`. Focus order is untouched. Amber/red text uses tokens that clear AA on their tints:
  `--color-sfds-slate-l2` failed at 4.07:1 here once, so it is not a candidate.

### 2d. Mode 2: Blueprint, a fourth `pageStore.mode`

`'blueprint'` reuses `buildWalkthrough` + `placementsFor`. It renders `ContentTypeSchema.fields` in
`order`, one slot per field, with the copy placed in each:

- **Filled** = there is a transcript entry for that `rawName` with `fields.length || choices.length`.
  Claims don't count, because `emitPathPanel` claims `contact` even when it is empty. **Empty** gets
  a dashed slot ("Contact us (empty)"). An `inert` field gets no slot. A required empty field is
  marked "Karl won't save without this".
- **Tray** "Won't carry over to Karl" lists `unmapped`, each with its source label and the reason
  the transcript already writes (U-numbers stay out of the default text).
- **Jump.** A slot or tray item is a `<button>`. Clicking it switches to `review` mode with the outline on,
  scrolls the mockup container with the drawer's `scrollTop` pattern (not `scrollIntoView`: nested
  scroll container), moves focus to `[data-rewrite-field="<id>"]` and applies a highlight class
  for 2s. Gray slots say why in text.

**Rejected:**

- A hand-written `karlField` key on every data field. It duplicates the matchers, drifts, and bloats 39 modules.
- A new schema file that re-lists fields. It would be a second inventory, outside the field-map drift test.
- Building the modes beside the walkthrough. That gives two answers to "where does this go".
- Toolbar switch. No room, and that is the measured reason the last one was removed.
- Storing placements in `page_versions`. It would turn a derived value into a migration.

## 3. Schema sample

### Transaction (`src/lib/karl/schema.ts`, excerpt; all 17 fields listed, rules on the ones that have them)

```ts
const HC = 'https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms';
const TX = `${HC}/content-types/building-a-page-by-content-type/transaction`;

export const TRANSACTION: ContentTypeSchema = {
	type: 'Transaction',
	url: {
		pattern: 'sf.gov/[slug]',
		status: 'confirmed',
		cite: { helpTitle: 'URLs', url: `${HC}/components/urls`, says: 'Transaction - sf.gov/[slug]' }
	},
	relatedTargets: RELATED_PERMITTED_TYPES, // Transaction, Information, Campaign, Topic
	fields: [
		{
			rawName: 'title',
			label: 'Page title',
			order: 0,
			required: true,
			repeatable: false,
			allows: [],
			rules: [
				{
					kind: 'maxChars',
					max: 65,
					strict: true,
					status: 'confirmed',
					cite: {
						helpTitle: 'Title',
						url: `${HC}/components/title`,
						says: 'Titles should be less than 65 characters'
					}
				}
			]
		},
		{
			rawName: 'description',
			label: 'Description',
			order: 1,
			required: false,
			repeatable: false,
			allows: [],
			rules: [
				{
					kind: 'maxChars',
					max: 110,
					strict: false,
					status: 'confirmed',
					cite: {
						helpTitle: 'Description',
						url: `${HC}/components/description`,
						says: 'You have up to 110 characters.'
					}
				}
			]
		},
		{
			rawName: 'primary_agency',
			label: 'Primary agency',
			order: 2,
			required: true,
			repeatable: false,
			allows: ['Agency page'],
			rules: []
		},
		{
			rawName: 'cost',
			label: 'Cost',
			order: 3,
			required: false,
			repeatable: false,
			allows: [],
			rules: [
				{
					kind: 'maxChars',
					sub: 'Cost description',
					max: 120,
					strict: false,
					status: 'confirmed',
					cite: {
						helpTitle: 'Live form (field map E1)',
						url: 'docs/karl-export-field-map.md',
						says: 'Cost description … 120 characters'
					}
				}
			]
		},
		{
			rawName: 'things_to_know',
			label: 'Things to Know',
			order: 4,
			required: false,
			repeatable: true,
			allows: ['Title and text'],
			rules: [
				{
					kind: 'maxItems',
					max: 2,
					status: 'confirmed',
					cite: {
						helpTitle: 'What to know before you start section - Cost and Things to know',
						url: `${TX}/what-to-know-before-you-start-section-cost-and-things-to-know`,
						says: 'We recommend keeping it brief and no more than 2 items, if you can.'
					}
				}
			]
		},
		{
			rawName: 'what_to_do',
			label: 'What to Do',
			order: 5,
			required: false,
			repeatable: true,
			allows: ['Callout', 'Section'],
			rules: [
				{
					kind: 'fixedHeading',
					heading: 'What to do',
					status: 'confirmed',
					cite: {
						helpTitle: 'What to do section on a Transaction page',
						url: `${TX}/what-to-do-section-on-a-transaction-page`,
						says: 'You cannot remove or change the heading "What to do." It is hard-coded in the CMS.'
					}
				}
			]
		},
		{
			rawName: 'section_title',
			label: 'Section title',
			order: 6,
			required: false,
			repeatable: false,
			allows: [],
			rules: []
		},
		{
			rawName: 'section_specifics',
			label: 'Section specifics',
			order: 7,
			required: false,
			repeatable: true,
			allows: ['Address', 'Callout', 'Document', 'Email', 'Button link', 'Phone number', 'Text'],
			rules: [
				{
					kind: 'maxChars',
					sub: 'Button link',
					max: 25,
					strict: false,
					status: 'confirmed',
					cite: {
						helpTitle: 'Button',
						url: `${HC}/components/button`,
						says: 'Buttons can only be 25 characters long.'
					}
				}
			]
		},
		{
			rawName: 'special_cases',
			label: 'Special cases',
			order: 8,
			required: false,
			repeatable: false,
			allows: [],
			rules: []
		},
		{
			rawName: 'supporting_information',
			label: 'Accordion title and text',
			helpLabel: 'Supporting information',
			order: 9,
			required: false,
			repeatable: true,
			allows: ['Title and text'],
			rules: [
				{
					kind: 'maxChars',
					sub: 'Title',
					max: 65,
					strict: false,
					status: 'confirmed',
					cite: {
						helpTitle: 'Accordions',
						url: `${HC}/components/accordions`,
						says: 'Title of the Accordion section: up to 65 characters'
					}
				}
			]
		},
		{
			rawName: 'custom_section',
			label: 'Custom Section',
			order: 10,
			required: false,
			repeatable: true,
			allows: ['Title and text'],
			rules: []
		},
		{
			rawName: 'related',
			label: 'Related',
			order: 11,
			required: true,
			repeatable: true,
			allows: ['SF.gov page'],
			rules: []
		},
		{
			rawName: 'good_for_community',
			label: 'Why is this Transaction Good for the Community?',
			order: 12,
			required: false,
			repeatable: true,
			allows: ['Additional info'],
			rules: []
		},
		{
			rawName: 'get_help',
			label: 'Contact us',
			order: 13,
			required: false,
			repeatable: true,
			allows: ['Address', 'Email', 'Phone number', 'Additional info'],
			rules: []
		},
		{
			rawName: 'partner_agencies',
			label: 'Partner agencies',
			order: 14,
			required: false,
			repeatable: true,
			allows: ['Agency page'],
			rules: []
		},
		{
			rawName: 'topics',
			label: 'Topics',
			order: 15,
			required: false,
			repeatable: true,
			allows: ['Topic page'],
			rules: []
		},
		{
			rawName: 'redirect_url',
			label: 'Redirect this page to',
			order: 16,
			required: false,
			repeatable: false,
			allows: [],
			inert: true,
			rules: []
		}
	]
};
```

`noPlaceholder` applies to every field and isn't repeated per field. `related.required: true` is the
live form's own flag, and is kept.

### `report-rats-mice-four-legged-problems`: derived placement map (prototype output)

Leaf ids are collapsed where every sibling maps the same way. The outline chip shows the label.

```diff
+ title                                   Page title
+ summary                                 Description                                  (104/110)
+ primaryAgency                           Primary agency            ← after the source fix; red today
+ whatToKnow.cost                         Cost
+ whatToKnow.thingsToKnow.{0,1}.label     Things to Know · Block 1–2 · Title           (2/2 items)
+ whatToKnow.thingsToKnow.{0,1}.text      Things to Know · Block 1–2 · Text
+ sections.what-to-do.heading             What to Do · heading (hard-coded "What to do")
+ …what-to-do.steps.0.title               What to Do · Section 1 · Section title
+ …what-to-do.steps.0.text.{0,1}          What to Do · Section 1 · Text
+ …what-to-do.steps.0.button              What to Do · Section 1 · Button link         (18/25)
+ …what-to-do.steps.0.callout.text        What to Do · Section 1 · Callout
+ …what-to-do.steps.1.{title,bullets.*}   What to Do · Section 2 · Section title / Text
+ …what-to-do.steps.2.{title,text,bullets} What to Do · Section 3 · Section title / Text
+ …what-to-do.steps.2.callout.text        What to Do · Section 3 · Callout
+ …while-you-wait-….{heading,paragraphs,bullets}  Accordion title and text · Title / Text
+ …while-you-wait-….cards.{0-4}.*         Accordion title and text · Item 1–5 (links in Text)
+ …get-help-making-your-report.*          Custom Section 1 · Title / Text
+ …how-your-report-is-processed.{heading,bullets.*}  Custom Section 2 · Title / Text
+ …related-pages.{heading,cards.0-4.title} Related · Item 1–5
+ partnerAgencies.{0,1}.*                 Partner agencies
+ seoTitle, metaDescription               Promote → For search engines
- audience.{0-3}                          Won't carry over: transaction-page-audience
- …how-your-report-is-processed.button    Won't carry over: U1, section button outside a step ("View Article 11")
```

Blueprint empty slots for this page: **Contact us (empty)**, **Topics (empty)**, Special cases,
Why is this Transaction Good for the Community?. `redirect_url` is inert and gets no slot.

## 4. Thin first slice

**Scope:** schemas for Transaction, Information and Resource Collection; Karl outline + Blueprint on
`report-rats-mice-four-legged-problems`, `information-what-happens-after-you-report-housing-pest-problem`
and `look-up-building-records`. Other pages show the outline too, but only in green/red/gray from
the transcript, with no `schema.ts` rule colours until their type lands.

Steps, each test-first:

1. `claim()` + `currentPanel` in `karl-transcript.js`. Test: every pilot claim matches the table
   above, and `renderTranscriptMarkdown` output is unchanged for all 39 pages (snapshot taken
   before the change).
2. `primary_agency` source fix. Update the walkthrough test (FLAG → CHOOSE).
3. `schema.ts` (3 types) + test: keys ⊂ `KARL_PANELS`, order matches, every rule has a `cite`.
4. `placement.ts` `placementsFor()` + `src/lib/karl/placement.test.ts` (server project). Expected pilot statuses (from the
   prototype, **corrected by the built code**):
   - rats: 2 red groups (audience, U1 button). **The two Custom Sections are Unconfirmed, not
     green**: `custom_section` reaches a plain body section through an `inferred: true` mapping, and
     the transcript already tells editors to verify it. The rest is Placed.
   - after-report: red audience + the `how-a-report-moves-through-the-city` steps section (U3) and
     its heading. URL `sf.gov/information/…` is **gray** (Karl contradicts itself). Empty: Part of,
     Partner agencies, Topics.
   - records: red audience. "Related pages" → Body 3 is **amber** ("lands as Resource tiles; Resource
     Collection has no Related") per §6. Empty: Data dashboard, Custom section, Topics, Partner agencies.
5. Outline: the `EditTarget` prop + `Section` root + context + the Karl menu.
6. Blueprint mode + jump-to-element.

**Verification.**

- `bun run verify` (unit + build), `bun run check:ratchet` (0), `lint:ratchet` (3),
  `format:ratchet` (50).
- New `tests/karlOutline.e2e.ts` and `tests/karlBlueprint.e2e.ts`, importing `test` from
  `./fixtures` and signing in with `tests/signedIn.ts`. Per pilot page they:
  - assert the chip text and `data-karl-status` counts above;
  - check the Blueprint slot order against `schema.ts`;
  - check that a tray click focuses the right `data-rewrite-field`;
  - check that a keyboard-only path (Tab → menu → switch → slot → Enter) reaches the element;
  - run axe with the outline **on** and in Blueprint, at 1280px and 375px.
- Screenshots: `page.screenshot()` in those specs writes `test-results/karl-{outline,blueprint}-{pilot}-{1280,375}.png`
  (12 images), and I'll look at them before reporting. The Playwright MCP server failed to connect
  this session, so the repo's own e2e is the path.

## 5. Rollout after the slice

| Order | Type (pages)                | Schema work                                                        | Notes                                                                                                                                                                                                                                                                                                                             |
| ----- | --------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Step by step (3)            | `steps` maxItems 15 (aim 5); step Title required; Transaction link | **Done.** "1 Transaction link per step" turned out **confirmed** ("Each step can link to one or no transaction"). The 3 "Related pages" sections are Unplaced. Also fixed: steps were labelled in Transaction's vocabulary.                                                                                                       |
| 2     | Topic (1)                   | spotlight 1; `content_fields` choices                              | **Done.** Spotlight button and More-services auto-listing are Unconfirmed; Related (U5) Unplaced. Added: blocks labelled "Child topics · Spotlight block" (the form's naming trap), and "Only DS can make new topics" as a page caveat.                                                                                           |
| 3     | Campaign (3)                | spotlight ≤2, `related_links`, `contact`                           | **Done.** Contact us is **Unconfirmed**: the live form has it, but Karl's "How a Campaign page works" omits it. Callouts on Campaign need a fix (any type without callouts); a 26-character spotlight button flagged. Fixed: the About and partner-agency panels read "— unused", and a Related note missed the classifier (U27). |
| 4     | Report (2)                  | spotlight 1, tables (Report only)                                  | **Done.** Content blocks named (Body, Table); tables over 3 columns advised; "Text in tables is not machine translated" shown as a confirmed Good-to-know note; URL Unconfirmed. Callout and absorbed Related already needed fixes from earlier steps.                                                                            |
| 5     | Agency (1)                  | spotlight ≤2, alert 30/120, Section title 1/2 required             | **Done.** Fixed the walkthrough: Subsection intro paragraphs were emitted as a "Text" field that does not exist (now reported as U20), and Section title 2 got four headings (now each heading is its Subsection's Title, decided 2026-11-24). Resource tiles Unconfirmed; URL Unconfirmed.                                       |
| 6     | About us, Location (1 each) | Location's panels are "not captured", so most read gray            | `inferred` matchers → gray                                                                                                                                                                                                                                                                                                        |

**Analysis checks moving onto the schemas** (same finding ids, so the panel doesn't change shape):

- `karl-transaction-what-to-do`: passes only if `claims` has a `what_to_do` entry **and** the
  section's heading is "What to do". The note-prose regex goes.
- New `karl-host-has-field`: one finding per red/amber outline item. This replaces the host-type
  half of Related/Contact/resource-tile checks with the transcript's answer, so all types agree.
- New `karl-field-limits` (title, description, button, Things to know, steps, accordion title),
  `karl-placeholder`, `karl-url-pattern` (gray where unconfirmed) and `karl-empty-fields`.
- `karlComponentFindings` keeps only what the transcript can't see: the Related **target** type.
  `componentSupport.ts` reads its limits from `schema.ts`.

## 6. Decisions, assumptions and risks

**Settled in review, 2026-11-23.** The terms are recorded in `CONTEXT.md`.

1. The mode is the **Karl outline**, and the button reads "Show Karl fields". **Overlay** keeps its
   glossary meaning: accepted edits.
2. A slot on Karl's form is a **Karl panel** in code and in the glossary. Only interface copy for the
   manager says "Karl field".
3. Copy with no panel on its type is **unplaced**, and the UI says "Won't carry over to Karl".
   **Orphan** keeps its existing meaning: edits whose field id no longer resolves.
4. The computed **placement** decides the colour. The hand-written `karl` note appears beside it as
   commentary, and nothing reads the note's prose. A note-vs-placement disagreement state is deferred.
5. "Related pages" absorbed into another panel (Resource Collection `body`, Report `content`,
   Location `body`) is **amber**: "Goes into Karl as Resource tiles, not Related".
6. One status per chip, by precedence **Unplaced > Needs a fix > Unconfirmed > Placed**. Every applicable reason is
   listed in the chip's description, which `aria-describedby` reads out.
7. Limits and PLACEHOLDER are judged on **the copy on screen**: base copy plus accepted edits, using
   the review record `buildTranscript` already takes.

8. Audience lines are **unplaced** and reported as **one** finding for the block ("Won't carry
   over: the 'Who this is for' list"), not one per line.
9. A section chip shows the section's own placement and status. Each non-placed string inside it gets
   its own small outline and chip. Placed strings get no chip of their own.
10. The statuses are named **Placed / Needs a fix / Unplaced / Unconfirmed** in code, tests and the
    glossary. Colour is only how they're drawn.
11. The Primary agency fix ships in the first slice, so its walkthrough step changes from FLAG to
    CHOOSE. The 39-page transcript snapshot shows the change.
12. AI-drafted pages are out of the first slice, and the Karl menu is turned off on
    `/review/draft/<id>`.
13. Both views work signed out, judged on base copy.
14. PLACEHOLDER means the literal uppercase string only.
15. Below 1024px the Karl menu takes the walkthrough button's slot. That button is already visible at
    every width and shrinks to "Karl" under `sm`.
16. Chips show the **Wagtail form label**. Where the help center names the panel differently, that
    name goes in the description (`helpLabel`). Known pairs: "Accordion title and text" ↔
    Supporting information, and Contact us ↔ `get_help`.
17. The Karl outline is off on a first visit. Once switched on, it **stays on** across pages and visits,
    persisted like `previewWidth`. Chip wording is plain language first ("Goes into Karl: What to
    do · Section 2 · Button link"), and `rawName` appears only in a tooltip.
18. The rollout order in §5 stands: Step by step → Topic → Campaign → Report → Agency → About us,
    Location.

Remaining assumptions, to be checked during rollout rather than decided now:

- **Campaign Contact us** is Placed, following the live form. I'll verify it against a live Campaign
  page in rollout step 3.
- **"Essential information"** appears nowhere in `src/` or the field map, so I can't place it. It
  stays an open question for whoever has Karl access.
- **Audience tray text** reuses the transcript's own reason, which already says where the lines
  could go.

Risks:

- **Transcript output drift.** `claim()` touches a 1185-line untyped module. The before/after
  Markdown snapshot over all 39 pages is the guard.
- **Prefix join.** A section whose `fieldKey` is pinned (`571bac4`) still joins through
  `deriveFieldKey`, so pinning is covered, but a test should include one pinned section.
- **Catch-all matchers.** Amber for absorbed "Related" depends on heading text (`/related/i`). That
  reads copy, not prose notes, but it's still a heuristic, so the amber text says so.
- **Contrast on tinted outlines.** It has failed here twice. axe with the outline on is the gate,
  not a visual check.
