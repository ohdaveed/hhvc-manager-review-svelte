# Section Rethink — Slice 1 (request and diff) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A reviewer selects one section, asks the assistant to rethink it, and reads a block-by-block diff of what it proposes — including blocks it would add or drop. Nothing is applied and nothing is saved.

**Architecture:** Five pure modules under `src/lib/rethink/` (corpus index, block extraction, diff, prompt, request) with all the logic and all the tests, plus a thin panel that renders their output. The request goes to the existing AI proxy as `task: 'content'` with the live page as grounding; the response is a whole page, from which only the target section is diffed. Selection state lives in the existing `pageStore` as a new selection _kind_ beside `selectedFieldIds`.

**Tech Stack:** SvelteKit 2 / Svelte 5 runes, TypeScript, Vitest (node + jsdom projects), `@testing-library/svelte`, bun.

**Spec:** `docs/superpowers/specs/2026-08-23-section-rethink-design.md`

## Global Constraints

- **Slice 1 applies nothing and persists nothing.** No writes to the corpus, no `edits` rows, no calls to `saveInlineEdit`. Slices 2–5 are blocked on slice 3 of `docs/superpowers/specs/2026-08-23-mockup-version-history-design.md` and are not in this plan.
- **Block types in scope: `heading`, `paragraphs`, `bullets`, `callout`** (decision 16). `steps`, `cards`, `component` and `kind` are out.
- **Provider is `claude`, named explicitly** (decision 15). Deployed model is `claude-opus-5`.
- **Task is `content`** (decision 4). The response envelope is `{ task, provider, model, attempts, valid, issues, result, usage, groundedBy, disclosure }` where `result` is a whole page object.
- **Caps.** Proxy body limit is 64KB — the binding one. Backend `prompt` limit is 8,000 characters; `page` grounding limit is 96KB serialized. Client-side guards must name the number, matching `FieldsPanel.svelte`'s existing pattern.
- **Vitest project split is decided by file location.** `src/**/*.test.ts` runs in the **node** project; `tests/**/*.test.ts` runs in **jsdom**. Put pure-module tests in `src/`, component tests in `tests/`.
- **Section keys come from `section.fieldKey`**, assigned once from the pristine corpus in `pageData.svelte.ts`. Never re-derive one.
- **Do not run `prettier --write` across the tree.** `bun run lint` is red repo-wide and fixing it is not this work.
- Test commands: `bun run test:unit -- --run <path>` for one file, `bun run verify` before any commit that touches build inputs.

## File Structure

| File                                                           | Responsibility                                                             |
| -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `src/lib/data/index.ts` (modify)                               | Add `pagesByKey`; derive `allPages` from it so one list defines the corpus |
| `src/lib/rethink/corpusIndex.ts` (create)                      | Render the 29-page index the prompt grounds link proposals on              |
| `src/lib/rethink/blocks.ts` (create)                           | Flatten a section into addressable blocks — the unit the reviewer toggles  |
| `src/lib/rethink/diff.ts` (create)                             | Match current blocks against proposed ones and emit ops                    |
| `src/lib/rethink/prompt.ts` (create)                           | Build the rubric prompt, and refuse one over the cap                       |
| `src/lib/rethink/request.ts` (create)                          | Call the proxy, validate the envelope, extract the target section          |
| `src/lib/ai/generate.ts` (modify)                              | Accept an optional `AbortSignal` so a Rethink can be cancelled             |
| `src/lib/stores/pageData.svelte.ts` (modify)                   | `selectedSectionKey` and the Rethink state machine                         |
| `src/lib/components/Section.svelte` (modify)                   | The `Rethink section` control                                              |
| `src/lib/components/workspace/RethinkPanel.svelte` (create)    | The panel: instruction, progress, cancel, ops list                         |
| `src/lib/components/workspace/ReviewWorkspace.svelte` (modify) | The Rethink tab                                                            |

---

### Task 1: Corpus index

**Files:**

- Modify: `src/lib/data/index.ts`
- Create: `src/lib/rethink/corpusIndex.ts`
- Test: `src/lib/rethink/corpusIndex.test.ts`

**Interfaces:**

- Consumes: nothing.
- Produces: `pagesByKey: Record<string, CorpusPageLike>` from `$lib/data`; `buildCorpusIndex(pages: Record<string, unknown>): string` and `CORPUS_INDEX_MAX_CHARS: number` from `$lib/rethink/corpusIndex`.

**Why the data module changes.** The backend's card schema demands `target` be "an EXISTING page key from the list of available page keys in the prompt. Never invent one." Those keys are the export names — `scopeInfo`, `article11Guide` — and today they exist only as import identifiers in `index.ts`. `allPages` is an array, so the keys are unrecoverable from it. Deriving `allPages` from a keyed object keeps one list rather than two that can drift.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/rethink/corpusIndex.test.ts
import { describe, it, expect } from 'vitest';
import { buildCorpusIndex, CORPUS_INDEX_MAX_CHARS } from './corpusIndex';
import { allPages, pagesByKey } from '$lib/data';

describe('pagesByKey', () => {
	it('holds every page, keyed by the name cards[].target uses', () => {
		expect(Object.keys(pagesByKey)).toHaveLength(29);
		expect(pagesByKey.scopeInfo).toBeDefined();
		expect(pagesByKey.article11Guide.slug).toContain('sf.gov/');
	});

	it('is the single definition of the corpus -- allPages is derived from it', () => {
		expect(allPages).toHaveLength(Object.keys(pagesByKey).length);
		expect(allPages[0]).toBe(Object.values(pagesByKey)[0]);
	});
});

describe('buildCorpusIndex', () => {
	it('renders one line per page, leading with the page key', () => {
		const index = buildCorpusIndex({
			scopeInfo: { type: 'Information', title: 'What we inspect', summary: 'Scope of HHVC.' },
			payFee: { type: 'Transaction', title: 'Pay the fee', summary: 'How to pay.' }
		});

		expect(index.split('\n')).toEqual([
			'scopeInfo | Information | What we inspect — Scope of HHVC.',
			'payFee | Transaction | Pay the fee — How to pay.'
		]);
	});

	it('tolerates a page missing a summary rather than printing undefined', () => {
		const index = buildCorpusIndex({ bare: { type: 'Information', title: 'Bare' } });
		expect(index).toBe('bare | Information | Bare');
	});

	it('stays inside the budget the prompt reserves for it', () => {
		expect(buildCorpusIndex(pagesByKey).length).toBeLessThanOrEqual(CORPUS_INDEX_MAX_CHARS);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- --run src/lib/rethink/corpusIndex.test.ts`
Expected: FAIL — `pagesByKey` is not exported from `$lib/data`, and `./corpusIndex` does not resolve.

- [ ] **Step 3: Export `pagesByKey` and derive `allPages`**

In `src/lib/data/index.ts`, keep every existing `import` line untouched. Replace the `export const allPages = [ ... ]` array with:

```ts
/**
 * The corpus, keyed by the name `cards[].target` uses to point at a page.
 *
 * Those keys are the AI backend's link vocabulary: its card schema requires
 * `target` to name "an EXISTING page key from the list of available page keys
 * in the prompt. Never invent one." An array of pages cannot supply them, so
 * this object is the definition and `allPages` is derived from it -- two lists
 * would drift the first time a page is added to one and not the other.
 */
export const pagesByKey = {
	filthReport,
	inspectionPrepFollowup,
	recordsHub,
	noticeOfViolation,
	inspectorLookup,
	inspectionPrepInitial,
	article11Guide,
	sroHotelReport,
	aboutHhvcTeam,
	afterReport,
	ownerHub,
	publicRecords,
	findHotelRecords,
	verminResources,
	pestsTopic,
	rodentsReport,
	tenantNoticeSteps,
	insectsReport,
	tenantRights,
	findViolations,
	findRecords,
	mosquitoWorkshop,
	healthyHousingTopic,
	article11Compliance,
	mosquitoControl,
	ownerGuidance,
	payFee,
	ipmEducation,
	scopeInfo
};

export const allPages = Object.values(pagesByKey);
```

Then create `src/lib/rethink/corpusIndex.ts`:

```ts
/**
 * The 29-page index the Rethink prompt grounds link proposals on.
 *
 * Compact on purpose: the whole thing shares an 8,000-character prompt with
 * the rubric, the target section and its Karl note. Measured at 6,040
 * characters over the current corpus.
 */

/** The share of the prompt budget this index may take. */
export const CORPUS_INDEX_MAX_CHARS = 7_000;

type IndexedPage = { type?: unknown; title?: unknown; summary?: unknown };

const str = (value: unknown): string => (typeof value === 'string' ? value : '');

export function buildCorpusIndex(pages: Record<string, unknown>): string {
	return Object.entries(pages)
		.map(([key, raw]) => {
			const page = (raw ?? {}) as IndexedPage;
			const head = `${key} | ${str(page.type)} | ${str(page.title)}`;
			const summary = str(page.summary);
			// An em dash only when there is something after it. Without this a page
			// with no summary renders a trailing dash, which reads to the model as
			// a truncated line rather than a page without one.
			return summary ? `${head} — ${summary}` : head;
		})
		.join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:unit -- --run src/lib/rethink/corpusIndex.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Run the full suite — `index.ts` is imported everywhere**

Run: `bun run verify`
Expected: `PASS unit tests`, `PASS production build`. If the unit count is not `145 passed` plus the new tests, a consumer of `allPages` regressed; read `$TMPDIR/hhvc-verify.log`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/data/index.ts src/lib/rethink/corpusIndex.ts src/lib/rethink/corpusIndex.test.ts
git commit -m "feat(rethink): key the corpus so link proposals can be checked"
```

---

### Task 2: Block extraction

**Files:**

- Create: `src/lib/rethink/blocks.ts`
- Test: `src/lib/rethink/blocks.test.ts`

**Interfaces:**

- Consumes: `entryText` from `$lib/corpus/fieldResolver`.
- Produces: `type BlockKind = 'heading' | 'paragraph' | 'bullet' | 'calloutTitle' | 'calloutText'`; `type Block = { kind: BlockKind; index: number; text: string; fieldId: string | null }`; `sectionBlocks(section: unknown, sectionKey: string): Block[]`; `proposedBlocks(section: unknown): Block[]`.

**Why two functions.** The current section's blocks carry the `field_id` that addresses them; a proposed section's blocks address nothing until the diff matches them to something. Returning `fieldId: null` for the proposed side makes it impossible to accidentally write a rewrite to a position derived from the model's output rather than from the corpus.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/rethink/blocks.test.ts
import { describe, it, expect } from 'vitest';
import { sectionBlocks, proposedBlocks } from './blocks';

const section = {
	heading: 'What we do',
	paragraphs: ['Our work covers:', { text: 'Unsourced.', unverified: true }],
	bullets: ['Rats', 'Garbage'],
	callout: { title: 'Emergency', text: 'Call 311.' }
};

describe('sectionBlocks', () => {
	it('flattens every in-scope block with its field id, in reading order', () => {
		expect(sectionBlocks(section, 'what-we-do')).toEqual([
			{ kind: 'heading', index: 0, text: 'What we do', fieldId: 'sections.what-we-do.heading' },
			{
				kind: 'paragraph',
				index: 0,
				text: 'Our work covers:',
				fieldId: 'sections.what-we-do.paragraphs.0'
			},
			{
				kind: 'paragraph',
				index: 1,
				text: 'Unsourced.',
				fieldId: 'sections.what-we-do.paragraphs.1'
			},
			{ kind: 'bullet', index: 0, text: 'Rats', fieldId: 'sections.what-we-do.bullets.0' },
			{ kind: 'bullet', index: 1, text: 'Garbage', fieldId: 'sections.what-we-do.bullets.1' },
			{
				kind: 'calloutTitle',
				index: 0,
				text: 'Emergency',
				fieldId: 'sections.what-we-do.callout.title'
			},
			{
				kind: 'calloutText',
				index: 0,
				text: 'Call 311.',
				fieldId: 'sections.what-we-do.callout.text'
			}
		]);
	});

	it('unwraps the {text, unverified} entry shape rather than stringifying it', () => {
		const blocks = sectionBlocks({ paragraphs: [{ text: 'Wrapped.' }] }, 'k');
		expect(blocks[0].text).toBe('Wrapped.');
	});

	it('ignores block types out of scope for slice 1', () => {
		const blocks = sectionBlocks(
			{ heading: 'H', steps: [{ title: 'S' }], cards: [{ title: 'C' }] },
			'k'
		);
		expect(blocks.map((b) => b.kind)).toEqual(['heading']);
	});

	it('returns nothing for a section with no in-scope copy', () => {
		expect(sectionBlocks({ cards: [{ title: 'C' }] }, 'k')).toEqual([]);
	});
});

describe('proposedBlocks', () => {
	it('addresses nothing -- a proposed block has no field until the diff matches it', () => {
		const blocks = proposedBlocks(section);
		expect(blocks.every((b) => b.fieldId === null)).toBe(true);
		expect(blocks.map((b) => b.text)).toEqual([
			'What we do',
			'Our work covers:',
			'Unsourced.',
			'Rats',
			'Garbage',
			'Emergency',
			'Call 311.'
		]);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- --run src/lib/rethink/blocks.test.ts`
Expected: FAIL — cannot resolve `./blocks`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/rethink/blocks.ts
import { entryText } from '$lib/corpus/fieldResolver';

/**
 * The block types a Rethink may touch in slice 1 (decision 16).
 *
 * `steps` and `cards` are deliberately absent: both carry nested structure that
 * would each need their own diff treatment, and adding them turns one feature
 * into three.
 */
export type BlockKind = 'heading' | 'paragraph' | 'bullet' | 'calloutTitle' | 'calloutText';

export type Block = {
	kind: BlockKind;
	/** Position within its own kind, as authored. */
	index: number;
	text: string;
	/** The address this block already has, or null for a proposed one. */
	fieldId: string | null;
};

/** Walks a section in reading order, asking `address` for each block's id. */
function walk(section: unknown, address: (path: string) => string | null): Block[] {
	const s = (section ?? {}) as Record<string, unknown>;
	const blocks: Block[] = [];

	if (typeof s.heading === 'string' && s.heading !== '') {
		blocks.push({ kind: 'heading', index: 0, text: s.heading, fieldId: address('heading') });
	}

	const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

	list(s.paragraphs).forEach((entry, index) => {
		const text = entryText(entry);
		if (text !== '') {
			blocks.push({ kind: 'paragraph', index, text, fieldId: address(`paragraphs.${index}`) });
		}
	});

	list(s.bullets).forEach((entry, index) => {
		const text = entryText(entry);
		if (text !== '') {
			blocks.push({ kind: 'bullet', index, text, fieldId: address(`bullets.${index}`) });
		}
	});

	const callout = (s.callout ?? {}) as { title?: unknown; text?: unknown };
	if (typeof callout.title === 'string' && callout.title !== '') {
		blocks.push({
			kind: 'calloutTitle',
			index: 0,
			text: callout.title,
			fieldId: address('callout.title')
		});
	}
	if (typeof callout.text === 'string' && callout.text !== '') {
		blocks.push({
			kind: 'calloutText',
			index: 0,
			text: callout.text,
			fieldId: address('callout.text')
		});
	}

	return blocks;
}

/** The current section's blocks, each carrying the field id that addresses it. */
export function sectionBlocks(section: unknown, sectionKey: string): Block[] {
	return walk(section, (path) => `sections.${sectionKey}.${path}`);
}

/**
 * A proposed section's blocks, addressing nothing.
 *
 * Deliberately not `sectionBlocks(proposed, key)`: positional ids derived from
 * the model's output would look addressable while naming whatever happened to
 * sit at that index in the corpus.
 */
export function proposedBlocks(section: unknown): Block[] {
	return walk(section, () => null);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:unit -- --run src/lib/rethink/blocks.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rethink/blocks.ts src/lib/rethink/blocks.test.ts
git commit -m "feat(rethink): flatten a section into the blocks a reviewer toggles"
```

---

### Task 3: Similarity and diff

**Files:**

- Create: `src/lib/rethink/diff.ts`
- Test: `src/lib/rethink/diff.test.ts`

**Interfaces:**

- Consumes: `Block`, `BlockKind`, `sectionBlocks`, `proposedBlocks` from `./blocks`.
- Produces: `similarity(a: string, b: string): number`; `MATCH_THRESHOLD: number`; `type Op` (discriminated on `type`, every variant carrying `id: string` and `kind: BlockKind`); `diffSection(current: unknown, proposed: unknown, sectionKey: string): Op[]`.

**Two rules to hold in mind while implementing:**

1. **One op per block.** A block whose text changed _and_ whose position moved emits a single `rewrite` carrying `moved: true`. Two ops on one block would give the reviewer two toggles for one decision and let them accept half of it.
2. **Ranks are computed among matched pairs only.** If ranks were positions in the full list, dropping one block would mark every block after it as moved.

**Known simplification, worth stating in review:** blocks are matched within their own kind, so a rethink that converts a paragraph into bullets reads as a drop plus adds rather than a conversion. That is honest about what changes and applies correctly; a cross-kind matcher is a later refinement.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/rethink/diff.test.ts
import { describe, it, expect } from 'vitest';
import { diffSection, similarity, MATCH_THRESHOLD } from './diff';

const current = {
	heading: 'What we do',
	paragraphs: ['Our work covers the following areas:'],
	bullets: [
		'Investigating reports of rats and mice',
		'Inspecting apartments',
		'Answering questions'
	]
};

describe('similarity', () => {
	it('scores identical text 1 and unrelated text near 0', () => {
		expect(similarity('rats and mice', 'rats and mice')).toBe(1);
		expect(similarity('rats and mice', 'zoning permit appeals')).toBeLessThan(0.2);
	});

	it('ignores case and punctuation, so a reworded sentence still matches', () => {
		expect(similarity('Inspecting apartments.', 'inspecting apartments')).toBe(1);
		expect(similarity('Inspecting apartments', 'Inspecting apartments and hotels')).toBeGreaterThan(
			MATCH_THRESHOLD
		);
	});

	it('scores two empty strings 1 rather than dividing by zero', () => {
		expect(similarity('', '')).toBe(1);
	});
});

describe('diffSection', () => {
	it('reports an unchanged block as keep', () => {
		const ops = diffSection(current, current, 'what-we-do');
		expect(ops.every((op) => op.type === 'keep')).toBe(true);
		expect(ops).toHaveLength(5);
	});

	it('reports a reworded block as a rewrite against its own field id', () => {
		const proposed = { ...current, heading: 'What we can inspect' };
		const ops = diffSection(current, proposed, 'what-we-do');

		expect(ops.find((op) => op.kind === 'heading')).toMatchObject({
			type: 'rewrite',
			fieldId: 'sections.what-we-do.heading',
			from: 'What we do',
			to: 'What we can inspect',
			moved: false
		});
	});

	it('reports a block only the proposal has as an add, anchored after its neighbour', () => {
		const proposed = { ...current, bullets: [...current.bullets, 'Following up on violations'] };
		const ops = diffSection(current, proposed, 'what-we-do');
		const add = ops.find((op) => op.type === 'add');
		expect(add).toMatchObject({
			type: 'add',
			kind: 'bullet',
			text: 'Following up on violations',
			afterFieldId: 'sections.what-we-do.bullets.2'
		});
	});

	it('reports a block only the current section has as a drop', () => {
		const proposed = { ...current, bullets: ['Investigating reports of rats and mice'] };
		const ops = diffSection(current, proposed, 'what-we-do');
		expect(ops.filter((op) => op.type === 'drop').map((op) => op.text)).toEqual([
			'Inspecting apartments',
			'Answering questions'
		]);
	});

	it('reports a reordered block as a move, and leaves its unmoved siblings alone', () => {
		const proposed = {
			...current,
			bullets: [
				'Answering questions',
				'Investigating reports of rats and mice',
				'Inspecting apartments'
			]
		};
		const ops = diffSection(current, proposed, 'what-we-do');
		const moved = ops.filter((op) => op.type === 'move');
		expect(moved.map((op) => op.text)).toContain('Answering questions');
		expect(moved.every((op) => op.fieldId !== null)).toBe(true);
	});

	it('does not mark surviving blocks as moved just because an earlier one was dropped', () => {
		const proposed = { ...current, bullets: ['Inspecting apartments', 'Answering questions'] };
		const ops = diffSection(current, proposed, 'what-we-do');
		expect(ops.some((op) => op.type === 'move')).toBe(false);
		expect(ops.filter((op) => op.type === 'drop')).toHaveLength(1);
	});

	it('emits one op per block when text and position both change', () => {
		const proposed = {
			...current,
			bullets: [
				'Answering questions from tenants',
				'Investigating reports of rats and mice',
				'Inspecting apartments'
			]
		};
		const ops = diffSection(current, proposed, 'what-we-do');
		const forThatBullet = ops.filter(
			(op) => 'fieldId' in op && op.fieldId === 'sections.what-we-do.bullets.2'
		);
		expect(forThatBullet).toHaveLength(1);
		expect(forThatBullet[0]).toMatchObject({ type: 'rewrite', moved: true });
	});

	it('gives every op a stable, unique id so a toggle survives a re-render', () => {
		const proposed = { ...current, bullets: [...current.bullets, 'A new bullet'] };
		const ops = diffSection(current, proposed, 'what-we-do');
		const ids = ops.map((op) => op.id);
		expect(new Set(ids).size).toBe(ids.length);
		expect(diffSection(current, proposed, 'what-we-do').map((op) => op.id)).toEqual(ids);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- --run src/lib/rethink/diff.test.ts`
Expected: FAIL — cannot resolve `./diff`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/rethink/diff.ts
import { proposedBlocks, sectionBlocks, type Block, type BlockKind } from './blocks';

/**
 * How alike two blocks must read before the diff calls them the same block
 * reworded rather than one dropped and another added.
 *
 * 0.5 on a word-set Dice coefficient: a sentence that keeps half its words is
 * a rewrite, one that keeps fewer is new copy.
 */
export const MATCH_THRESHOLD = 0.5;

const words = (text: string): Set<string> =>
	new Set(
		text
			.toLowerCase()
			.replace(/[^a-z0-9\s]/g, ' ')
			.split(/\s+/)
			.filter(Boolean)
	);

/** Word-set Dice coefficient. 1 is identical, 0 shares nothing. */
export function similarity(a: string, b: string): number {
	const A = words(a);
	const B = words(b);
	if (A.size === 0 && B.size === 0) return 1;
	if (A.size === 0 || B.size === 0) return 0;
	let shared = 0;
	for (const word of A) if (B.has(word)) shared += 1;
	return (2 * shared) / (A.size + B.size);
}

export type Op =
	| { id: string; type: 'keep'; kind: BlockKind; fieldId: string; text: string }
	| {
			id: string;
			type: 'rewrite';
			kind: BlockKind;
			fieldId: string;
			from: string;
			to: string;
			/** The block also changed position. Folded in so one block is one toggle. */
			moved: boolean;
	  }
	| { id: string; type: 'move'; kind: BlockKind; fieldId: string; text: string }
	| {
			id: string;
			type: 'add';
			kind: BlockKind;
			text: string;
			/** The field id this block follows, or null when it leads its kind. */
			afterFieldId: string | null;
	  }
	| { id: string; type: 'drop'; kind: BlockKind; fieldId: string; text: string };

type Pair = { current: Block; proposed: Block };

/** Greedy best-first matching within one kind. */
function matchKind(currentBlocks: Block[], proposedBlocks_: Block[]): Pair[] {
	const pairs: Pair[] = [];
	const takenCurrent = new Set<number>();
	const takenProposed = new Set<number>();

	// Exact first, so an unchanged block can never be stolen by a merely
	// similar one that happens to score higher against it.
	currentBlocks.forEach((c, ci) => {
		proposedBlocks_.forEach((p, pi) => {
			if (takenCurrent.has(ci) || takenProposed.has(pi)) return;
			if (similarity(c.text, p.text) === 1) {
				pairs.push({ current: c, proposed: p });
				takenCurrent.add(ci);
				takenProposed.add(pi);
			}
		});
	});

	const candidates: { score: number; ci: number; pi: number }[] = [];
	currentBlocks.forEach((c, ci) => {
		if (takenCurrent.has(ci)) return;
		proposedBlocks_.forEach((p, pi) => {
			if (takenProposed.has(pi)) return;
			const score = similarity(c.text, p.text);
			if (score >= MATCH_THRESHOLD) candidates.push({ score, ci, pi });
		});
	});
	candidates.sort((a, b) => b.score - a.score || a.ci - b.ci || a.pi - b.pi);

	for (const { ci, pi } of candidates) {
		if (takenCurrent.has(ci) || takenProposed.has(pi)) continue;
		pairs.push({ current: currentBlocks[ci], proposed: proposedBlocks_[pi] });
		takenCurrent.add(ci);
		takenProposed.add(pi);
	}

	return pairs;
}

const KINDS: BlockKind[] = ['heading', 'paragraph', 'bullet', 'calloutTitle', 'calloutText'];

/**
 * The differences between the section as it stands and the section as proposed.
 *
 * Ops come back in proposed reading order, with drops appended: a dropped block
 * has no position in the new section to be listed at.
 */
export function diffSection(current: unknown, proposed: unknown, sectionKey: string): Op[] {
	const currentBlocks = sectionBlocks(current, sectionKey);
	const nextBlocks = proposedBlocks(proposed);

	const pairs: Pair[] = [];
	for (const kind of KINDS) {
		pairs.push(
			...matchKind(
				currentBlocks.filter((b) => b.kind === kind),
				nextBlocks.filter((b) => b.kind === kind)
			)
		);
	}

	const pairByProposed = new Map<Block, Block>();
	const matchedCurrent = new Set<Block>();
	for (const pair of pairs) {
		pairByProposed.set(pair.proposed, pair.current);
		matchedCurrent.add(pair.current);
	}

	// Ranks among MATCHED blocks only, per kind. Using positions in the full
	// list would mark every block after a drop as moved.
	const rankOf = (blocks: Block[], kind: BlockKind, block: Block): number =>
		blocks.filter((b) => b.kind === kind).indexOf(block);

	const matchedCurrentByKind = currentBlocks.filter((b) => matchedCurrent.has(b));
	const matchedProposedByKind = nextBlocks.filter((b) => pairByProposed.has(b));

	let counter = 0;
	const nextId = (type: string, kind: BlockKind) => `${type}:${kind}:${counter++}`;

	const ops: Op[] = [];

	for (const block of nextBlocks) {
		const match = pairByProposed.get(block);

		if (!match) {
			// The nearest preceding block of the same kind that DOES have an
			// address. Slice 3's shape row anchors the insertion on it.
			const sameKind = nextBlocks.filter((b) => b.kind === block.kind);
			const before = sameKind.slice(0, sameKind.indexOf(block)).reverse();
			const anchor = before.map((b) => pairByProposed.get(b)).find(Boolean);
			ops.push({
				id: nextId('add', block.kind),
				type: 'add',
				kind: block.kind,
				text: block.text,
				afterFieldId: anchor?.fieldId ?? null
			});
			continue;
		}

		const moved =
			rankOf(matchedCurrentByKind, block.kind, match) !==
			rankOf(matchedProposedByKind, block.kind, block);

		if (match.text !== block.text) {
			ops.push({
				id: nextId('rewrite', block.kind),
				type: 'rewrite',
				kind: block.kind,
				fieldId: match.fieldId as string,
				from: match.text,
				to: block.text,
				moved
			});
		} else if (moved) {
			ops.push({
				id: nextId('move', block.kind),
				type: 'move',
				kind: block.kind,
				fieldId: match.fieldId as string,
				text: match.text
			});
		} else {
			ops.push({
				id: nextId('keep', block.kind),
				type: 'keep',
				kind: block.kind,
				fieldId: match.fieldId as string,
				text: match.text
			});
		}
	}

	for (const block of currentBlocks) {
		if (matchedCurrent.has(block)) continue;
		ops.push({
			id: nextId('drop', block.kind),
			type: 'drop',
			kind: block.kind,
			fieldId: block.fieldId as string,
			text: block.text
		});
	}

	return ops;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:unit -- --run src/lib/rethink/diff.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rethink/diff.ts src/lib/rethink/diff.test.ts
git commit -m "feat(rethink): diff a proposed section into per-block ops"
```

---

### Task 4: Prompt builder

**Files:**

- Create: `src/lib/rethink/prompt.ts`
- Test: `src/lib/rethink/prompt.test.ts`

**Interfaces:**

- Consumes: `buildCorpusIndex` from `./corpusIndex`.
- Produces: `MAX_PROMPT_CHARS: number`; `buildRethinkPrompt(input: { page: unknown; sectionKey: string; instruction?: string; corpusIndex: string }): string`. Throws `Error` with a message naming the character count when over the cap.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/rethink/prompt.test.ts
import { describe, it, expect } from 'vitest';
import { buildRethinkPrompt, MAX_PROMPT_CHARS } from './prompt';

const page = {
	title: 'About vector control',
	type: 'About us',
	reading: 'Grade 6',
	audience: ['This page is for tenants.'],
	sections: [
		{ fieldKey: 'who-we-are', heading: 'Who we are', karl: 'Information block 1.' },
		{
			fieldKey: 'what-we-do',
			heading: 'What we do',
			karl: 'Information block 2, rich text plus bullets.',
			paragraphs: ['Our work covers:'],
			bullets: ['Rats']
		}
	]
};

const args = { page, sectionKey: 'what-we-do', corpusIndex: 'scopeInfo | Information | Scope' };

describe('buildRethinkPrompt', () => {
	it('names the target section and quotes its Karl mapping', () => {
		const prompt = buildRethinkPrompt(args);
		expect(prompt).toContain('what-we-do');
		expect(prompt).toContain('Information block 2, rich text plus bullets.');
	});

	it('carries the rubric constraints that keep the proposal publishable', () => {
		const prompt = buildRethinkPrompt(args);
		expect(prompt).toContain('Grade 6');
		expect(prompt).toMatch(/never invent/i);
		expect(prompt).toMatch(/preserve every link/i);
		expect(prompt).toMatch(/what is missing/i);
	});

	it('passes the corpus index through so link targets can be checked', () => {
		expect(buildRethinkPrompt(args)).toContain('scopeInfo | Information | Scope');
	});

	it("includes the reviewer's own instruction when there is one", () => {
		const prompt = buildRethinkPrompt({ ...args, instruction: 'Lead with what a tenant does.' });
		expect(prompt).toContain('Lead with what a tenant does.');
	});

	it('refuses a section key that is not on the page rather than rethinking the wrong one', () => {
		expect(() => buildRethinkPrompt({ ...args, sectionKey: 'nope' })).toThrow(/not on this page/i);
	});

	it('refuses a prompt over the cap and names the number', () => {
		expect(() =>
			buildRethinkPrompt({ ...args, corpusIndex: 'x'.repeat(MAX_PROMPT_CHARS) })
		).toThrow(new RegExp(`${MAX_PROMPT_CHARS.toLocaleString()}`));
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- --run src/lib/rethink/prompt.test.ts`
Expected: FAIL — cannot resolve `./prompt`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/rethink/prompt.ts

/**
 * The backend's cap on `prompt` for the `content` task, mirrored here so a
 * request that cannot succeed never leaves the browser. Stated in
 * `build_scripts/ai/schemas.js` as `prompt: z.string().min(1).max(8000)`.
 */
export const MAX_PROMPT_CHARS = 8_000;

type PromptInput = {
	page: unknown;
	sectionKey: string;
	instruction?: string;
	corpusIndex: string;
};

/**
 * What the assistant is asked to do, and what it may not do.
 *
 * Every line here is a constraint the mockup corpus already implies: the page
 * declares its reading level, the section declares its Karl mapping, and the
 * card schema already refuses an invented page key. Stating them keeps a
 * proposal publishable rather than merely well-written.
 */
const RUBRIC = [
	'Reconsider this section as a whole. Do not merely simplify or shorten it.',
	'Consider its structure, its order, and whether its shape suits its purpose.',
	'Say plainly what is missing — a step, a caveat, a link a reader needs.',
	'Hold the page reading level. A rethink that raises it is a regression.',
	'Never invent facts, numbers, dates, phone numbers or addresses.',
	'Preserve every link.',
	'Respect the section Karl mapping below. If your proposal changes which Karl',
	'block this becomes, say so explicitly in the section karl note.',
	'Propose link targets only from the page keys listed below. Never invent one.',
	'At most two paragraphs before switching to bullets.'
].join('\n');

export function buildRethinkPrompt({
	page,
	sectionKey,
	instruction,
	corpusIndex
}: PromptInput): string {
	const sections = ((page ?? {}) as { sections?: unknown }).sections;
	const section = (Array.isArray(sections) ? sections : []).find(
		(s) => (s as { fieldKey?: unknown }).fieldKey === sectionKey
	) as { heading?: unknown; karl?: unknown } | undefined;

	// A key that does not resolve means the corpus moved under the selection.
	// Rethinking whatever section happens to be first would be worse than failing.
	if (!section) {
		throw new Error(`That section is not on this page (${sectionKey}).`);
	}

	const reading = ((page ?? {}) as { reading?: unknown }).reading;
	const readingLine =
		typeof reading === 'string'
			? `Page reading level: ${reading}.`
			: 'Page reading level: Grade 6.';

	const prompt = [
		`Rethink the section whose fieldKey is "${sectionKey}"`,
		typeof section.heading === 'string' ? `(heading: "${section.heading}").` : '.',
		'',
		RUBRIC,
		'',
		readingLine,
		'',
		`Section Karl mapping: ${typeof section.karl === 'string' ? section.karl : '(none recorded)'}`,
		'',
		instruction ? `What the reviewer wants from this section: ${instruction}` : '',
		'',
		'Available page keys:',
		corpusIndex,
		'',
		'Return the whole page. Change only the named section; leave the others as given.'
	]
		.filter((line) => line !== '')
		.join('\n');

	if (prompt.length > MAX_PROMPT_CHARS) {
		throw new Error(
			`That request is ${prompt.length.toLocaleString()} characters; the limit is ${MAX_PROMPT_CHARS.toLocaleString()}.`
		);
	}

	return prompt;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:unit -- --run src/lib/rethink/prompt.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rethink/prompt.ts src/lib/rethink/prompt.test.ts
git commit -m "feat(rethink): build the rubric prompt, and refuse one over the cap"
```

---

### Task 5: Cancellable request

**Files:**

- Modify: `src/lib/ai/generate.ts`
- Create: `src/lib/rethink/request.ts`
- Test: `src/lib/rethink/request.test.ts`
- Test (modify): `src/lib/ai/generate.test.ts`

**Interfaces:**

- Consumes: `requestGeneration` from `$lib/ai/generate`; `buildRethinkPrompt` from `./prompt`; `buildCorpusIndex` from `./corpusIndex`; `diffSection` from `./diff`; `pagesByKey` from `$lib/data`.
- Produces: `type RethinkResult = { rationale: string; ops: Op[]; otherSections: string[]; model: string; disclosure: string }`; `requestRethink(input: { page: unknown; pageId: string; sectionKey: string; instruction?: string; signal?: AbortSignal }): Promise<RethinkResult>`.

**Why `generate.ts` changes.** `requestGeneration` takes only a payload, so there is no way to abort one in flight. A Rethink runs an order of magnitude longer than a field rewrite, and the panel offers Cancel. The parameter is optional, so every existing caller is unaffected.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/rethink/request.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

const requestGeneration = vi.fn();
vi.mock('$lib/ai/generate', () => ({
	requestGeneration: (payload: unknown, signal?: AbortSignal) => requestGeneration(payload, signal)
}));

const { requestRethink } = await import('./request');

const page = {
	id: 'topic-x--about',
	title: 'About vector control',
	type: 'About us',
	reading: 'Grade 6',
	sections: [
		{
			fieldKey: 'what-we-do',
			heading: 'What we do',
			karl: 'Information block.',
			paragraphs: ['Our work covers:'],
			bullets: ['Rats', 'Garbage']
		},
		{ fieldKey: 'who-we-are', heading: 'Who we are', karl: 'Information block.' }
	]
};

const envelope = (sections: unknown[], extra: object = {}) => ({
	task: 'content',
	provider: 'claude',
	model: 'claude-opus-5',
	attempts: 1,
	valid: true,
	issues: [],
	disclosure: 'Drafted with generative AI.',
	result: { ...page, sections },
	...extra
});

describe('requestRethink', () => {
	beforeEach(() => requestGeneration.mockReset());

	it('asks for the content task from Claude, grounded on the live page', async () => {
		requestGeneration.mockResolvedValue(envelope(page.sections));

		await requestRethink({ page, pageId: page.id, sectionKey: 'what-we-do' });

		const [payload] = requestGeneration.mock.calls[0];
		expect(payload.task).toBe('content');
		expect(payload.provider).toBe('claude');
		expect(payload.page).toBe(page);
		expect(payload.prompt).toContain('what-we-do');
	});

	it('diffs only the target section and reports the rest by heading', async () => {
		requestGeneration.mockResolvedValue(
			envelope([
				{
					fieldKey: 'what-we-do',
					heading: 'What we can inspect',
					karl: 'Information block.',
					paragraphs: ['Our work covers:'],
					bullets: ['Rats', 'Garbage']
				},
				{ fieldKey: 'who-we-are', heading: 'Who we are, rewritten', karl: 'Information block.' }
			])
		);

		const result = await requestRethink({ page, pageId: page.id, sectionKey: 'what-we-do' });

		expect(result.ops.find((op) => op.kind === 'heading')).toMatchObject({
			type: 'rewrite',
			to: 'What we can inspect'
		});
		expect(result.ops.some((op) => op.text === 'Who we are, rewritten')).toBe(false);
		expect(result.otherSections).toEqual(['Who we are']);
	});

	it('carries the model and disclosure through for the record', async () => {
		requestGeneration.mockResolvedValue(envelope(page.sections));
		const result = await requestRethink({ page, pageId: page.id, sectionKey: 'what-we-do' });
		expect(result.model).toBe('claude-opus-5');
		expect(result.disclosure).toBe('Drafted with generative AI.');
	});

	it('fails when the proposal does not contain the section that was asked about', async () => {
		requestGeneration.mockResolvedValue(envelope([{ fieldKey: 'who-we-are', heading: 'Who' }]));
		await expect(
			requestRethink({ page, pageId: page.id, sectionKey: 'what-we-do' })
		).rejects.toThrow(/did not return that section/i);
	});

	it('fails loudly when the backend could not validate its own draft', async () => {
		requestGeneration.mockResolvedValue(
			envelope(page.sections, { valid: false, issues: ['heading missing'] })
		);
		await expect(
			requestRethink({ page, pageId: page.id, sectionKey: 'what-we-do' })
		).rejects.toThrow(/heading missing/);
	});

	it('passes the abort signal through so Cancel actually cancels', async () => {
		requestGeneration.mockResolvedValue(envelope(page.sections));
		const controller = new AbortController();
		await requestRethink({
			page,
			pageId: page.id,
			sectionKey: 'what-we-do',
			signal: controller.signal
		});
		expect(requestGeneration.mock.calls[0][1]).toBe(controller.signal);
	});
});
```

Add to `src/lib/ai/generate.test.ts`, inside the existing `describe('requestGeneration', ...)`:

```ts
it('passes an abort signal to fetch when one is given', async () => {
	getSession.mockResolvedValue({ data: { session: { access_token: 'token-abc' } } });
	const fetchSpy = vi.fn(async () => new Response('{}', { status: 200 }));
	vi.stubGlobal('fetch', fetchSpy);
	const controller = new AbortController();

	await requestGeneration({ task: 'rewrite-field', fieldText: 'hi' }, controller.signal);

	const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
	expect(init.signal).toBe(controller.signal);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test:unit -- --run src/lib/rethink/request.test.ts src/lib/ai/generate.test.ts`
Expected: FAIL — cannot resolve `./request`; the new `generate` test fails because `init.signal` is `undefined`.

- [ ] **Step 3: Write the implementation**

In `src/lib/ai/generate.ts`, change the signature and the fetch call only:

```ts
export async function requestGeneration(payload: Record<string, unknown>, signal?: AbortSignal) {
	const {
		data: { session }
	} = await supabase.auth.getSession();
	if (!session) throw new Error('You must be signed in to use AI assistance.');

	const res = await fetch('/api/ai/generate', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${session.access_token}`
		},
		body: JSON.stringify(payload),
		// Optional, so every existing caller is unaffected. A Rethink runs an
		// order of magnitude longer than a field rewrite and offers Cancel.
		signal
	});

	if (!res.ok) throw new Error('API Error');
	return res.json();
}
```

Create `src/lib/rethink/request.ts`:

```ts
import { requestGeneration } from '$lib/ai/generate';
import { pagesByKey } from '$lib/data';
import { buildCorpusIndex } from './corpusIndex';
import { buildRethinkPrompt } from './prompt';
import { diffSection, type Op } from './diff';

export type RethinkResult = {
	/** The assistant's reasoning. Slice 4 files this as a note. */
	rationale: string;
	ops: Op[];
	/** Headings of sections the assistant also wanted to change (decision 17). */
	otherSections: string[];
	model: string;
	disclosure: string;
};

type RethinkInput = {
	page: unknown;
	pageId: string;
	sectionKey: string;
	instruction?: string;
	signal?: AbortSignal;
};

type Section = { fieldKey?: unknown; heading?: unknown; editorNote?: unknown };

const sectionsOf = (page: unknown): Section[] => {
	const list = ((page ?? {}) as { sections?: unknown }).sections;
	return Array.isArray(list) ? (list as Section[]) : [];
};

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/**
 * Ask the assistant to rethink one section, and return the differences.
 *
 * The `content` task answers with a whole page. Only the target section is
 * diffed; the others are reported by heading and otherwise discarded, because
 * cross-section changes are out of scope and silently dropping them would
 * throw away the most useful thing a rethink notices.
 */
export async function requestRethink({
	page,
	pageId,
	sectionKey,
	instruction,
	signal
}: RethinkInput): Promise<RethinkResult> {
	const current = sectionsOf(page).find((s) => s.fieldKey === sectionKey);
	if (!current) throw new Error(`That section is not on this page (${sectionKey}).`);

	const prompt = buildRethinkPrompt({
		page,
		sectionKey,
		instruction,
		corpusIndex: buildCorpusIndex(pagesByKey)
	});

	const data = await requestGeneration(
		{ task: 'content', provider: 'claude', prompt, page },
		signal
	);

	// `valid: false` means the backend's own Zod validation still failed after
	// its retry. Its `issues` name what is wrong; showing them beats a diff
	// computed from a page the backend already rejected.
	if (data?.valid === false) {
		const issues = Array.isArray(data.issues) ? data.issues.join('; ') : 'unknown validation error';
		throw new Error(`The assistant's draft did not validate: ${issues}`);
	}

	const proposedPage = data?.result;
	const proposed = sectionsOf(proposedPage).find((s) => s.fieldKey === sectionKey);
	if (!proposed) {
		throw new Error('The assistant did not return that section.');
	}

	const before = new Map(sectionsOf(page).map((s) => [s.fieldKey, s]));
	const otherSections = sectionsOf(proposedPage)
		.filter((s) => s.fieldKey !== sectionKey)
		// Compared by KEY, never by array position: the model may return the
		// sections in a different order, and an index comparison would then report
		// every section as changed.
		.filter((s) => JSON.stringify(before.get(s.fieldKey)) !== JSON.stringify(s))
		.map((s) => text(before.get(s.fieldKey)?.heading))
		.filter(Boolean);

	return {
		rationale: text((proposed as { editorNote?: unknown }).editorNote),
		ops: diffSection(current, proposed, sectionKey),
		otherSections,
		model: text(data?.model),
		disclosure: text(data?.disclosure)
	};
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test:unit -- --run src/lib/rethink/request.test.ts src/lib/ai/generate.test.ts`
Expected: PASS — 6 new tests plus the 3 in `generate.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/generate.ts src/lib/ai/generate.test.ts src/lib/rethink/request.ts src/lib/rethink/request.test.ts
git commit -m "feat(rethink): request a rethought section, cancellably"
```

---

### Task 6: Selection and Rethink state

**Files:**

- Modify: `src/lib/stores/pageData.svelte.ts`
- Test: `tests/pageData.test.ts`

**Interfaces:**

- Consumes: `Op`, `RethinkResult` from `$lib/rethink/*`.
- Produces on `pageStore`: `selectedSectionKey: string | undefined`; `rethink: RethinkState`; `selectSection(key: string): void`; `clearSectionSelection(): void`; `setOpAccepted(opId: string, accepted: boolean): void`; `isOpAccepted(op: Op): boolean`; `acceptedOpCount(): number`.

```ts
export type RethinkState =
	| { state: 'idle' }
	| { state: 'loading'; pageId: string; sectionKey: string }
	| { state: 'error'; message: string }
	| {
			state: 'ready';
			pageId: string;
			sectionKey: string;
			result: RethinkResult;
			decisions: Record<string, boolean>;
	  };
```

**Defaults that matter:** `drop` starts **rejected**, everything else **accepted**. Deletion is opted into, not out of.

- [ ] **Step 1: Write the failing test**

Append to `tests/pageData.test.ts`:

```ts
describe('section selection and rethink state', () => {
	beforeEach(() => {
		pageStore.clearSelection();
		pageStore.clearSectionSelection();
		pageStore.enterPage(undefined);
	});

	it('is a different selection kind -- picking a section clears the field selection', () => {
		pageStore.select('title');
		pageStore.selectSection('what-we-do');
		expect(pageStore.selectedSectionKey).toBe('what-we-do');
		expect(pageStore.selectedFieldIds).toEqual([]);
	});

	it('and picking a field clears the section selection', () => {
		pageStore.selectSection('what-we-do');
		pageStore.select('title');
		expect(pageStore.selectedSectionKey).toBeUndefined();
	});

	it('drops the selection and any proposal when the page changes', () => {
		pageStore.enterPage('page-a');
		pageStore.selectSection('what-we-do');
		pageStore.rethink = {
			state: 'ready',
			pageId: 'page-a',
			sectionKey: 'what-we-do',
			result: { rationale: '', ops: [], otherSections: [], model: '', disclosure: '' },
			decisions: {}
		};

		pageStore.enterPage('page-b');

		expect(pageStore.selectedSectionKey).toBeUndefined();
		expect(pageStore.rethink.state).toBe('idle');
	});

	it('accepts every op by default except a drop', () => {
		const ops = [
			{
				id: 'rewrite:heading:0',
				type: 'rewrite',
				kind: 'heading',
				fieldId: 'f',
				from: 'a',
				to: 'b',
				moved: false
			},
			{ id: 'drop:bullet:1', type: 'drop', kind: 'bullet', fieldId: 'g', text: 'gone' }
		] as never[];

		expect(pageStore.isOpAccepted(ops[0])).toBe(true);
		expect(pageStore.isOpAccepted(ops[1])).toBe(false);
	});

	it('remembers a toggled decision, and counts what would apply', () => {
		pageStore.rethink = {
			state: 'ready',
			pageId: 'page-a',
			sectionKey: 'what-we-do',
			result: {
				rationale: '',
				otherSections: [],
				model: '',
				disclosure: '',
				ops: [
					{
						id: 'rewrite:heading:0',
						type: 'rewrite',
						kind: 'heading',
						fieldId: 'f',
						from: 'a',
						to: 'b',
						moved: false
					},
					{ id: 'drop:bullet:1', type: 'drop', kind: 'bullet', fieldId: 'g', text: 'gone' },
					{ id: 'keep:bullet:2', type: 'keep', kind: 'bullet', fieldId: 'h', text: 'stays' }
				]
			},
			decisions: {}
		} as never;

		expect(pageStore.acceptedOpCount()).toBe(1); // the rewrite; keep is not a change

		pageStore.setOpAccepted('drop:bullet:1', true);
		expect(pageStore.acceptedOpCount()).toBe(2);

		pageStore.setOpAccepted('rewrite:heading:0', false);
		expect(pageStore.acceptedOpCount()).toBe(1);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- --run tests/pageData.test.ts`
Expected: FAIL — `pageStore.selectSection is not a function`.

- [ ] **Step 3: Write the implementation**

In `src/lib/stores/pageData.svelte.ts`, add the imports and type near the existing `Suggestion` type:

```ts
import type { Op } from '$lib/rethink/diff';
import type { RethinkResult } from '$lib/rethink/request';

export type RethinkState =
	| { state: 'idle' }
	| { state: 'loading'; pageId: string; sectionKey: string }
	| { state: 'error'; message: string }
	| {
			state: 'ready';
			pageId: string;
			sectionKey: string;
			result: RethinkResult;
			/** Explicit reviewer decisions. Absent means the op's default. */
			decisions: Record<string, boolean>;
	  };
```

Add to the `PageStore` class:

```ts
	/**
	 * The section a Rethink is about.
	 *
	 * A selection KIND distinct from `selectedFieldIds`, not another entry in
	 * it: the badge numbering on the mockup belongs to the field selection and
	 * cannot mean two things at once. Choosing one clears the other.
	 */
	selectedSectionKey = $state<string | undefined>(undefined);

	rethink = $state<RethinkState>({ state: 'idle' });

	selectSection(sectionKey: string) {
		this.selectedFieldIds = [];
		this.suggestions = this.pruneSuggestions([]);
		this.selectedSectionKey = sectionKey;
		this.rethink = { state: 'idle' };
	}

	clearSectionSelection() {
		this.selectedSectionKey = undefined;
		this.rethink = { state: 'idle' };
	}

	/**
	 * A drop starts REJECTED and everything else starts accepted. Deletion is
	 * opted into: a proposal that removes a paragraph should need a deliberate
	 * click, not a deliberate un-click.
	 */
	isOpAccepted(op: Op): boolean {
		if (this.rethink.state !== 'ready') return false;
		const explicit = this.rethink.decisions[op.id];
		if (typeof explicit === 'boolean') return explicit;
		return op.type !== 'drop';
	}

	setOpAccepted(opId: string, accepted: boolean) {
		if (this.rethink.state !== 'ready') return;
		this.rethink = {
			...this.rethink,
			decisions: { ...this.rethink.decisions, [opId]: accepted }
		};
	}

	/** Accepted ops that would actually change something. `keep` never counts. */
	acceptedOpCount(): number {
		if (this.rethink.state !== 'ready') return 0;
		return this.rethink.result.ops.filter((op) => op.type !== 'keep' && this.isOpAccepted(op))
			.length;
	}
```

In the existing `select(fieldId, additive)` method, add as the first line of the body:

```ts
// Two selection kinds cannot both be live; see `selectedSectionKey`.
this.selectedSectionKey = undefined;
```

In the existing `enterPage(pageId)` method, add after `this.rewriteInstruction = '';`:

```ts
this.selectedSectionKey = undefined;
this.rethink = { state: 'idle' };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:unit -- --run tests/pageData.test.ts`
Expected: PASS — the existing tests plus 5 new ones.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/pageData.svelte.ts tests/pageData.test.ts
git commit -m "feat(rethink): hold a section selection beside the field selection"
```

---

### Task 7: The Rethink control on a section

**Files:**

- Modify: `src/lib/components/Section.svelte`
- Test: `tests/sectionRethink.test.ts`

**Interfaces:**

- Consumes: `pageStore.selectSection`, `pageStore.selectedSectionKey`, `sessionStore.knownSignedOut`.
- Produces: a `<button>` labelled `Rethink section` carrying `data-rethink-section={key}`.

**Why a real `<button>`:** `EditTarget`'s docstring records that these were `role="button"` with no key handler, so a keyboard-only reviewer could not edit anything on an SF.gov property. A new control must not reintroduce that. Signed out, it must not render at all — the mockups are readable, not editable.

- [ ] **Step 1: Write the failing test**

```ts
// tests/sectionRethink.test.ts
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import Section from '../src/lib/components/Section.svelte';
import { pageStore } from '../src/lib/stores/pageData.svelte.js';
import { sessionStore } from '../src/lib/stores/session.svelte.js';

const section = {
	fieldKey: 'what-we-do',
	heading: 'What we do',
	paragraphs: ['Our work covers:'],
	bullets: ['Rats']
};

describe('Section rethink control', () => {
	beforeEach(() => {
		pageStore.clearSectionSelection();
		sessionStore.knownSignedOut = false;
	});

	it('is a real button, so a keyboard reviewer can reach it', () => {
		render(Section, { props: { section, index: 1 } });
		const button = screen.getByRole('button', { name: /rethink section/i });
		expect(button.tagName).toBe('BUTTON');
		expect(button.getAttribute('data-rethink-section')).toBe('what-we-do');
	});

	it('selects its own section, by key rather than by position', async () => {
		render(Section, { props: { section, index: 1 } });
		await fireEvent.click(screen.getByRole('button', { name: /rethink section/i }));
		expect(pageStore.selectedSectionKey).toBe('what-we-do');
	});

	it('does not render signed out -- the mockup is readable, not editable', () => {
		sessionStore.knownSignedOut = true;
		render(Section, { props: { section, index: 1 } });
		expect(screen.queryByRole('button', { name: /rethink section/i })).toBeNull();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- --run tests/sectionRethink.test.ts`
Expected: FAIL — no button with that accessible name.

- [ ] **Step 3: Write the implementation**

In `src/lib/components/Section.svelte`, add to the `<script>` block:

```ts
import { pageStore } from '$lib/stores/pageData.svelte';
import { sessionStore } from '$lib/stores/session.svelte';

// Undefined while the session check is in flight: treat as editable, so the
// control does not flicker out and back for a signed-in reviewer. Same rule
// `EditTarget` follows.
const editable = $derived(!sessionStore.knownSignedOut);
const sectionSelected = $derived(pageStore.selectedSectionKey === key);
```

and, as the first child of the `<div class="page-section ...">` wrapper:

```svelte
{#if editable}
	<div class="page-section-chrome">
		<button
			type="button"
			class="rethink-section"
			data-rethink-section={key}
			aria-pressed={sectionSelected}
			onclick={(event) => {
				event.stopPropagation();
				pageStore.selectSection(key);
			}}
		>
			Rethink section
		</button>
	</div>
{/if}
```

Add to the component's `<style>` block (or the nearest existing stylesheet if the component has none):

```css
.page-section-chrome {
	display: flex;
	justify-content: flex-end;
}

.rethink-section {
	font-size: 12px;
	line-height: 1;
	padding: 4px 8px;
	border: 1px solid currentColor;
	border-radius: 3px;
	background: transparent;
	cursor: pointer;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:unit -- --run tests/sectionRethink.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/Section.svelte tests/sectionRethink.test.ts
git commit -m "feat(rethink): put a Rethink control on every section"
```

---

### Task 8: The Rethink panel

**Files:**

- Create: `src/lib/components/workspace/RethinkPanel.svelte`
- Modify: `src/lib/components/workspace/ReviewWorkspace.svelte`
- Test: `tests/rethinkPanel.test.ts`

**Interfaces:**

- Consumes: `requestRethink` from `$lib/rethink/request`; `pageStore` selection and Rethink state from Task 6.
- Produces: a `Rethink` tab in the workspace, rendering the ops list.

**States:** no section selected · composing · running (with Cancel) · error · ready. One Rethink in flight per session — the submit button is disabled while `rethink.state === 'loading'`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/rethinkPanel.test.ts
/**
 * @vitest-environment jsdom
 *
 * `$lib/rethink/request` is mocked, which also keeps `$lib/supabase` -- a
 * `createClient` at module scope -- out of the run.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import RethinkPanel from '../src/lib/components/workspace/RethinkPanel.svelte';
import { pageStore } from '../src/lib/stores/pageData.svelte.js';

const requestRethink = vi.fn();
vi.mock('$lib/rethink/request', () => ({
	requestRethink: (input: unknown) => requestRethink(input)
}));

const pageData = {
	id: 'topic-x--about',
	title: 'About vector control',
	sections: [{ fieldKey: 'what-we-do', heading: 'What we do', paragraphs: ['Our work covers:'] }]
};

const result = {
	rationale: 'It buries what a tenant needs behind a list of what staff do.',
	model: 'claude-opus-5',
	disclosure: 'Drafted with generative AI.',
	otherSections: ['Who we are'],
	ops: [
		{
			id: 'rewrite:heading:0',
			type: 'rewrite',
			kind: 'heading',
			fieldId: 'sections.what-we-do.heading',
			from: 'What we do',
			to: 'What we can inspect',
			moved: false
		},
		{
			id: 'add:bullet:1',
			type: 'add',
			kind: 'bullet',
			text: 'Call 311 if you have no heat.',
			afterFieldId: null
		},
		{
			id: 'drop:bullet:2',
			type: 'drop',
			kind: 'bullet',
			fieldId: 'sections.what-we-do.bullets.3',
			text: 'Duplicated bullet'
		}
	]
};

describe('RethinkPanel', () => {
	beforeEach(() => {
		requestRethink.mockReset();
		pageStore.enterPage('topic-x--about');
		pageStore.clearSectionSelection();
	});

	it('says what to do when no section is selected', () => {
		render(RethinkPanel, { props: { pageData } });
		expect(screen.getByText(/no section selected/i)).toBeTruthy();
	});

	it('sends the reviewer instruction with the request', async () => {
		requestRethink.mockResolvedValue(result);
		pageStore.selectSection('what-we-do');
		render(RethinkPanel, { props: { pageData } });

		await fireEvent.input(screen.getByLabelText(/what should this section accomplish/i), {
			target: { value: 'Lead with what a tenant does.' }
		});
		await fireEvent.click(screen.getByRole('button', { name: /rethink this section/i }));

		expect(requestRethink.mock.calls[0][0]).toMatchObject({
			pageId: 'topic-x--about',
			sectionKey: 'what-we-do',
			instruction: 'Lead with what a tenant does.'
		});
	});

	it('renders one toggle per op, with a drop unchecked by default', async () => {
		requestRethink.mockResolvedValue(result);
		pageStore.selectSection('what-we-do');
		render(RethinkPanel, { props: { pageData } });
		await fireEvent.click(screen.getByRole('button', { name: /rethink this section/i }));

		const rewrite = await screen.findByRole('checkbox', { name: /rewrite heading/i });
		const drop = screen.getByRole('checkbox', { name: /drop bullet/i });
		expect((rewrite as HTMLInputElement).checked).toBe(true);
		expect((drop as HTMLInputElement).checked).toBe(false);
	});

	it('flags added copy as unsourced, because nothing in the app can clear it', async () => {
		requestRethink.mockResolvedValue(result);
		pageStore.selectSection('what-we-do');
		render(RethinkPanel, { props: { pageData } });
		await fireEvent.click(screen.getByRole('button', { name: /rethink this section/i }));

		expect(await screen.findByText(/unverified/i)).toBeTruthy();
	});

	it('names the sections it also wanted to change rather than dropping them silently', async () => {
		requestRethink.mockResolvedValue(result);
		pageStore.selectSection('what-we-do');
		render(RethinkPanel, { props: { pageData } });
		await fireEvent.click(screen.getByRole('button', { name: /rethink this section/i }));

		expect(await screen.findByText(/Who we are/)).toBeTruthy();
	});

	it('shows the failure rather than an empty panel', async () => {
		requestRethink.mockRejectedValue(new Error('That request is 9,001 characters'));
		pageStore.selectSection('what-we-do');
		render(RethinkPanel, { props: { pageData } });
		await fireEvent.click(screen.getByRole('button', { name: /rethink this section/i }));

		expect(await screen.findByText(/9,001 characters/)).toBeTruthy();
	});

	it('applies nothing -- slice 1 is read-only', async () => {
		requestRethink.mockResolvedValue(result);
		pageStore.selectSection('what-we-do');
		render(RethinkPanel, { props: { pageData } });
		await fireEvent.click(screen.getByRole('button', { name: /rethink this section/i }));
		await screen.findByRole('checkbox', { name: /rewrite heading/i });

		expect(screen.queryByRole('button', { name: /^apply/i })).toBeNull();
		expect(pageData.sections[0].heading).toBe('What we do');
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- --run tests/rethinkPanel.test.ts`
Expected: FAIL — cannot resolve `RethinkPanel.svelte`.

- [ ] **Step 3: Write the implementation**

```svelte
<!-- src/lib/components/workspace/RethinkPanel.svelte -->
<script lang="ts">
	/**
	 * The Rethink tab: reconsider a whole section, block by block.
	 *
	 * Slice 1 is READ-ONLY. There is deliberately no Apply control here: the
	 * structural half of a proposal cannot survive a reload until the
	 * accepted-edit overlay exists, and a button that silently loses added
	 * copy is worse than no button.
	 */
	import { Button } from '$lib/components/ui/button/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { pageStore } from '$lib/stores/pageData.svelte';
	import { requestRethink } from '$lib/rethink/request';
	import type { Op } from '$lib/rethink/diff';

	let { pageData }: { pageData: unknown } = $props();

	const pageId = $derived((pageData as { id?: string } | undefined)?.id);
	const sectionKey = $derived(pageStore.selectedSectionKey);

	const heading = $derived.by(() => {
		const sections = (pageData as { sections?: { fieldKey?: string; heading?: string }[] })
			?.sections;
		return (sections ?? []).find((s) => s.fieldKey === sectionKey)?.heading ?? sectionKey;
	});

	let instruction = $state('');
	let controller: AbortController | undefined;

	const KIND_LABEL: Record<string, string> = {
		heading: 'heading',
		paragraph: 'paragraph',
		bullet: 'bullet',
		calloutTitle: 'callout title',
		calloutText: 'callout text'
	};

	const opLabel = (op: Op) => `${op.type} ${KIND_LABEL[op.kind] ?? op.kind}`;

	async function run() {
		if (!sectionKey || !pageId) return;
		if (pageStore.rethink.state === 'loading') return;

		// Captured before the request. A slow answer must not land on a section
		// the reviewer has since left -- the guard `recommend()` already uses.
		const requestPageId = pageId;
		const requestSectionKey = sectionKey;
		const current = () =>
			pageStore.selectedSectionKey === requestSectionKey &&
			(pageData as { id?: string } | undefined)?.id === requestPageId;

		controller = new AbortController();
		pageStore.rethink = { state: 'loading', pageId: requestPageId, sectionKey: requestSectionKey };

		try {
			const result = await requestRethink({
				page: pageData,
				pageId: requestPageId,
				sectionKey: requestSectionKey,
				instruction: instruction.trim() || undefined,
				signal: controller.signal
			});
			if (!current()) return;
			pageStore.rethink = {
				state: 'ready',
				pageId: requestPageId,
				sectionKey: requestSectionKey,
				result,
				decisions: {}
			};
		} catch (e) {
			if (!current()) return;
			const message =
				e instanceof Error && e.name === 'AbortError'
					? 'Cancelled.'
					: e instanceof Error
						? e.message
						: 'Could not reach the assistant.';
			pageStore.rethink = { state: 'error', message };
		} finally {
			controller = undefined;
		}
	}

	function cancel() {
		controller?.abort();
	}
</script>

<div class="flex h-full min-h-0 flex-col">
	<div class="min-h-0 flex-1 overflow-y-auto">
		{#if !sectionKey}
			<div class="px-5 py-6 text-sm">
				<p class="font-semibold">No section selected</p>
				<p class="mt-1.5 leading-[20px]">
					Choose <strong>Rethink section</strong> on any section of the mockup. The assistant will reconsider
					how it is written and structured, and say what it thinks is missing.
				</p>
			</div>
		{:else}
			<div class="border-b px-5 py-3">
				<span class="text-[13px] font-semibold">{heading}</span>
			</div>

			<section class="mx-5 mt-4" aria-label="Rethink">
				<Textarea
					bind:value={instruction}
					rows={2}
					class="text-[13px]"
					aria-label="What should this section accomplish?"
					placeholder="Optional: what should this section accomplish?"
				/>
				<div class="mt-2 flex gap-2">
					<Button
						size="sm"
						class="h-8 flex-1 text-[12px]"
						disabled={pageStore.rethink.state === 'loading'}
						onclick={run}
					>
						{pageStore.rethink.state === 'loading' ? 'Rethinking…' : 'Rethink this section'}
					</Button>
					{#if pageStore.rethink.state === 'loading'}
						<Button variant="outline" size="sm" class="h-8 text-[12px]" onclick={cancel}>
							Cancel
						</Button>
					{/if}
				</div>
				{#if pageStore.rethink.state === 'loading'}
					<p class="mt-2 text-[12px]" role="status">
						Reading the whole section. This usually takes about 30 seconds.
					</p>
				{/if}
			</section>

			{#if pageStore.rethink.state === 'error'}
				<p class="mx-5 mt-4 text-[12px] leading-[17px]" role="alert">
					{pageStore.rethink.message}
				</p>
			{/if}

			{#if pageStore.rethink.state === 'ready'}
				{@const result = pageStore.rethink.result}
				{#if result.rationale}
					<section class="mx-5 mt-4 rounded-[4px] border p-3" aria-label="Why">
						<span class="text-[12px] font-bold tracking-[0.06em] uppercase">Why</span>
						<p class="mt-1.5 text-[13px] leading-[19px]">{result.rationale}</p>
					</section>
				{/if}

				<ul class="mt-4 space-y-2 px-5 pb-4" aria-label="Proposed changes">
					{#each result.ops.filter((op) => op.type !== 'keep') as op (op.id)}
						<li class="rounded-[4px] border p-3">
							<label class="flex items-start gap-2 text-[12px]">
								<input
									type="checkbox"
									class="mt-0.5"
									aria-label={opLabel(op)}
									checked={pageStore.isOpAccepted(op)}
									onchange={(event) => pageStore.setOpAccepted(op.id, event.currentTarget.checked)}
								/>
								<span class="font-bold tracking-[0.06em] uppercase">{opLabel(op)}</span>
							</label>

							{#if op.type === 'rewrite'}
								<p class="mt-2 rounded-[3px] px-2 py-1.5 text-[13px] leading-[19px] line-through">
									{op.from}
								</p>
								<p class="mt-1.5 rounded-[3px] px-2 py-1.5 text-[13px] leading-[19px]">{op.to}</p>
								{#if op.moved}
									<p class="mt-1 text-[12px]">Also moves position.</p>
								{/if}
							{:else if op.type === 'add'}
								<p class="mt-2 rounded-[3px] px-2 py-1.5 text-[13px] leading-[19px]">{op.text}</p>
								<p class="mt-1 text-[12px]">
									Unverified — proposed by the assistant, with no confirmed source.
								</p>
							{:else}
								<p class="mt-2 rounded-[3px] px-2 py-1.5 text-[13px] leading-[19px]">{op.text}</p>
							{/if}
						</li>
					{/each}
				</ul>

				{#if result.otherSections.length > 0}
					<p class="mx-5 mb-4 text-[12px] leading-[17px]" role="status">
						The assistant also proposed changes to {result.otherSections.join(', ')}. Those are not
						applied here — rethink that section to see them.
					</p>
				{/if}

				<p class="mx-5 mb-4 text-[12px] leading-[17px]">
					{result.disclosure}
					{result.model ? ` (${result.model})` : ''}
				</p>
			{/if}
		{/if}
	</div>
</div>
```

In `ReviewWorkspace.svelte`, import the panel beside the others:

```ts
import RethinkPanel from './RethinkPanel.svelte';
```

add a trigger after the `fields` one:

```svelte
<Tabs.Trigger value="rethink" class="flex-none px-3 py-3">Rethink</Tabs.Trigger>
```

add the content pane after the `fields` one:

```svelte
<Tabs.Content value="rethink" class="bg-background min-h-0 flex-1 overflow-hidden">
	<RethinkPanel {pageData} />
</Tabs.Content>
```

and follow a section selection to the tab, beside the existing field-selection effect:

```ts
// Selecting a section is a request to work on it, so the panel follows.
// One-way, like the field effect above: a reviewer who then opens another
// tab stays there.
let lastSection = $state<string | undefined>(undefined);
$effect(() => {
	const key = pageStore.selectedSectionKey;
	if (key !== lastSection) {
		lastSection = key;
		if (key) activeTab = 'rethink';
	}
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:unit -- --run tests/rethinkPanel.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Run the whole gate**

Run: `bun run verify`
Expected: `PASS unit tests`, `PASS production build`.

- [ ] **Step 6: Verify in the real app**

Run `bun run dev`, sign in, open any review page, click `Rethink section` on a body section, and submit. Confirm: the tab follows the selection; the button disables and Cancel appears; a real proposal renders with per-op checkboxes; a drop is unchecked; added copy carries the unverified line; the disclosure and model render; and the mockup itself is unchanged. Check the browser console is clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/components/workspace/RethinkPanel.svelte src/lib/components/workspace/ReviewWorkspace.svelte tests/rethinkPanel.test.ts
git commit -m "feat(rethink): the Rethink tab, read-only"
```

---

## Self-review notes

**Spec coverage.** Slice 1 of the spec is "the Rethink tab, section selection, the `content` request with rubric and corpus index, ops computed and displayed. Read-only." Tasks 1–8 cover each part. Decisions carried in: 3 (corpus index, Task 1), 4 (`content` transport, Task 5), 8 (reads the live page, Task 5), 9 (Karl change surfaced — the rubric asks the model to say so, Task 4), 10 (added copy flagged unverified, Task 8), 15 (Claude named, Task 5), 16 (four block types, Task 2), 17 (other sections named, Tasks 5 and 8), 18 (one in flight, Task 8).

**Deliberately deferred to a later plan**, all requiring the overlay: decisions 5, 6, 7, 11, 12, 13, 14 — apply, field-edit rows, the shape row, expiry, added-block lifetime, the rationale note, and disclosure as a persisted record. Slice 1 shows the disclosure rather than storing it.

**Carried risks.** Task 5's first real run is also the confirmation that Claude's structured-output path works against the deployed build (spec Open risks). If `valid: false` comes back consistently with schema complaints, stop and reopen decision 15 rather than working around it.
