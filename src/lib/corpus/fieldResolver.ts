/**
 * Resolves an `edits.field_id` path back to the live corpus value it names.
 *
 * Multi-field editing needs each selected field's CURRENT text and a way to
 * write a rewrite back. The obvious approach — have `EditTarget` register
 * `{name, value, update}` into a map as it mounts — breaks in four ways here,
 * and all four are silent:
 *
 *   1. `EditTarget` renders inside `{#if editable}`, so every target unmounts
 *      and remounts when the session check resolves.
 *   2. Navigating between pages leaves the previous page's entries behind.
 *   3. `update` closes over `section.paragraphs[i]`; after a re-render that
 *      closure can write to a detached object, and the write appears to work.
 *   4. A captured `value` is a snapshot, wrong the moment any edit lands.
 *
 * So nothing is cached. `fieldId` is already a structured path, and this walks
 * the page object for it on demand. The cost is a resolve per read; the page
 * is a plain object with tens of fields, so that is free.
 *
 * Sections resolve by `fieldKey`, never by array position — the same reason
 * `pageData.svelte.ts` derives that key once from the pristine corpus. Using
 * the index here would reintroduce exactly the orphaning that change fixed.
 */

/** A resolved field: what to show, what it currently says, how to change it. */
export type ResolvedField = {
	/** Human-facing label, e.g. `Section [2] Paragraph`. Display only. */
	name: string;
	value: string;
	set: (next: string) => void;
	/** Corpus copy HHVC has not confirmed. Drives the unverified callout. */
	unverified?: boolean;
	unverifiedReason?: string;
};

/**
 * The corpus modules in `$lib/data` are plain untyped TS objects with no shared
 * declaration, so this is the boundary where untyped data enters. Narrowing it
 * to `unknown` would only push a cast onto every property read below and say
 * nothing more true, so the `any` is scoped here and named -- the same call the
 * repo already makes in `$lib/utils.ts`. `readEntry` is where individual values
 * are actually checked.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPage = Record<string, any>;

/**
 * A paragraph or bullet is usually a plain string, but ten entries across the
 * corpus are `{ text, unverified, unverifiedReason }` — copy with no tier-1
 * source, flagged for HHVC to confirm before publication.
 *
 * Section.svelte rendered those straight into the DOM, so they displayed as the
 * literal string `[object Object]` on seven pages of a tool whose entire job is
 * reviewing copy. `extractCopy` in `./fields.ts` already unwrapped them for
 * hashing; the renderer never learned to.
 *
 * Returns null for anything that is neither, so a shape nobody anticipated
 * fails the resolver rather than being coerced into text.
 */
function readEntry(entry: unknown): { text: string; unverified?: boolean; reason?: string } | null {
	if (typeof entry === 'string') return { text: entry };
	if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
		const e = entry as { text?: unknown; unverified?: unknown; unverifiedReason?: unknown };
		if (typeof e.text === 'string') {
			return {
				text: e.text,
				unverified: e.unverified === true,
				reason: typeof e.unverifiedReason === 'string' ? e.unverifiedReason : undefined
			};
		}
	}
	return null;
}

/**
 * The display text of a paragraph/bullet entry, whichever shape it is.
 *
 * Exported for `Section.svelte`, which holds the raw entry rather than a page
 * and so cannot go through `resolveField`. Both paths must agree, or the copy
 * a reviewer reads differs from the copy the panel rewrites.
 */
export function entryText(entry: unknown): string {
	return readEntry(entry)?.text ?? '';
}

/** Whether an entry is corpus copy HHVC has not confirmed. */
export function entryUnverified(entry: unknown): boolean {
	return readEntry(entry)?.unverified === true;
}

/** Writes back in the same shape the entry already has. */
function writeEntry(list: unknown[], i: number, next: string): void {
	const current = list[i];
	if (current && typeof current === 'object' && !Array.isArray(current)) {
		// Keep `unverified`/`unverifiedReason`: a reviewer rewriting the copy has
		// not thereby verified it, and dropping the flag would silently retire
		// the callout that asks HHVC to confirm it.
		list[i] = { ...current, text: next };
	} else {
		list[i] = next;
	}
}

/**
 * A plain-string leaf directly on `obj[key]` (a card's `title`, a step's
 * `buttonUrl`, ...). Null if `obj` doesn't exist or the value isn't a string
 * — covers both a stale index and a shape nobody anticipated.
 */
function stringField(
	obj: AnyPage | undefined | null,
	key: string,
	name: string
): ResolvedField | null {
	if (!obj || typeof obj[key] !== 'string') return null;
	return { name, value: obj[key], set: (v) => (obj[key] = v) };
}

/**
 * A plain-string entry at `list[i]` (a table cell, a `thingsToKnow` item, an
 * `audience` line). Distinct from `readEntry`/`writeEntry`: these lists never
 * hold the `{ text, unverified }` wrapper in the corpus, per `extractCopy`,
 * which reads every one of them with `str()` rather than `entryText()`.
 */
function arrayStringField(list: unknown, i: number, name: string): ResolvedField | null {
	if (!Array.isArray(list) || !Number.isInteger(i) || typeof list[i] !== 'string') return null;
	return { name, value: list[i], set: (v: string) => (list[i] = v) };
}

/** Mirrors the display labels `Page.svelte` and `Section.svelte` pass. */
function sectionLabel(page: AnyPage, fieldKey: string): string {
	const i = (page.sections ?? []).findIndex((s: AnyPage) => s.fieldKey === fieldKey);
	return `Section [${i + 1}]`;
}

/**
 * Resolve one field path against one page.
 *
 * Returns `null` for anything that does not name a live field — an unknown
 * shape, a section whose key no longer exists, an index past the end of its
 * array. Callers must treat `null` as "this selection is stale" rather than
 * as an empty string, or a rewrite would be written into a field that is not
 * there.
 */
export function resolveField(
	page: AnyPage | undefined | null,
	fieldId: string
): ResolvedField | null {
	if (!page || typeof fieldId !== 'string' || fieldId === '') return null;

	if (fieldId === 'title') {
		if (typeof page.title !== 'string') return null;
		return { name: 'Title', value: page.title, set: (v) => (page.title = v) };
	}

	if (fieldId === 'summary') {
		if (typeof page.summary !== 'string') return null;
		return { name: 'Summary', value: page.summary, set: (v) => (page.summary = v) };
	}

	if (fieldId === 'primaryAgency') {
		if (typeof page.primaryAgency !== 'string') return null;
		return {
			name: 'Primary agency',
			value: page.primaryAgency,
			set: (v) => (page.primaryAgency = v)
		};
	}

	// Flat page-level strings with no nested path — mirrors the `set(...)`
	// calls at the bottom of `extractCopy`.
	const TOP_LEVEL_STRINGS: Record<string, string> = {
		metaDescription: 'Meta Description',
		reportDate: 'Report Date',
		seoTitle: 'SEO Title',
		topicTag: 'Topic Tag'
	};
	if (Object.hasOwn(TOP_LEVEL_STRINGS, fieldId)) {
		return stringField(page, fieldId, TOP_LEVEL_STRINGS[fieldId]);
	}

	const parts = fieldId.split('.');

	if (parts[0] === 'audience' && parts.length === 2) {
		const i = Number(parts[1]);
		const list = page.audience;
		if (!Array.isArray(list) || !Number.isInteger(i) || typeof list[i] !== 'string') return null;
		return { name: `Audience [${i + 1}]`, value: list[i], set: (v) => (list[i] = v) };
	}

	if (parts[0] === 'contact' && parts.length === 3) {
		const sub = parts[1];
		if (sub !== 'phone' && sub !== 'email' && sub !== 'other') return null;
		const i = Number(parts[2]);
		const kind = sub === 'phone' ? 'Phone' : sub === 'email' ? 'Email' : 'Other';
		return arrayStringField(page.contact?.[sub], i, `Contact ${kind} [${i + 1}]`);
	}

	if (parts[0] === 'partnerAgencies' && parts.length === 3) {
		if (parts[2] !== 'title' && parts[2] !== 'url') return null;
		const i = Number(parts[1]);
		const agency = Array.isArray(page.partnerAgencies) ? page.partnerAgencies[i] : undefined;
		const kind = parts[2] === 'title' ? 'Title' : 'URL';
		return stringField(agency, parts[2], `Partner Agency [${i + 1}] ${kind}`);
	}

	if (parts[0] === 'spotlight') {
		if (parts.length === 3 && parts[1] === 'paragraphs') {
			const i = Number(parts[2]);
			return arrayStringField(page.spotlight?.paragraphs, i, `Spotlight Paragraph [${i + 1}]`);
		}
		if (parts.length === 2) {
			const SPOTLIGHT_NAMES: Record<string, string> = {
				title: 'Spotlight Title',
				button: 'Spotlight Button',
				buttonUrl: 'Spotlight Button URL'
			};
			const name = SPOTLIGHT_NAMES[parts[1]];
			if (!name) return null;
			return stringField(page.spotlight, parts[1], name);
		}
		return null;
	}

	if (parts[0] === 'whatToKnow') {
		if (parts.length === 2 && parts[1] === 'cost') {
			return stringField(page.whatToKnow, 'cost', 'Cost');
		}
		if (parts[1] === 'thingsToKnow') {
			const list = page.whatToKnow?.thingsToKnow;
			if (parts.length === 3) {
				const i = Number(parts[2]);
				return arrayStringField(list, i, `Thing To Know [${i + 1}]`);
			}
			if (parts.length === 4 && (parts[3] === 'label' || parts[3] === 'text')) {
				const i = Number(parts[2]);
				const item = Array.isArray(list) ? list[i] : undefined;
				const kind = parts[3] === 'label' ? 'Label' : 'Text';
				return stringField(item, parts[3], `Thing To Know [${i + 1}] ${kind}`);
			}
		}
		return null;
	}

	if (parts[0] !== 'sections' || parts.length < 3) return null;

	// `fieldKey` is a heading slug and can itself contain dots in principle, so
	// the key is everything between `sections.` and the trailing field path
	// rather than `parts[1]`. The trailing path is 1 segment (heading), 2
	// (paragraphs.N / bullets.N / callout.title / callout.text).
	const section = (page.sections ?? []).find(
		(s: AnyPage) => typeof s?.fieldKey === 'string' && fieldId.startsWith(`sections.${s.fieldKey}.`)
	);
	if (!section) return null;

	const rest = fieldId.slice(`sections.${section.fieldKey}.`.length).split('.');
	const label = sectionLabel(page, section.fieldKey);

	if (rest.length === 1 && rest[0] === 'heading') {
		if (typeof section.heading !== 'string') return null;
		return {
			name: `${label} Heading`,
			value: section.heading,
			set: (v) => (section.heading = v)
		};
	}

	if (rest.length === 2 && (rest[0] === 'paragraphs' || rest[0] === 'bullets')) {
		const list = section[rest[0]];
		const i = Number(rest[1]);
		if (!Array.isArray(list) || !Number.isInteger(i)) return null;
		const entry = readEntry(list[i]);
		if (!entry) return null;
		const kind = rest[0] === 'paragraphs' ? 'Paragraph' : 'Bullet';
		return {
			name: `${label} ${kind}`,
			value: entry.text,
			set: (v) => writeEntry(list, i, v),
			unverified: entry.unverified,
			unverifiedReason: entry.reason
		};
	}

	if (rest.length === 2 && rest[0] === 'callout' && (rest[1] === 'title' || rest[1] === 'text')) {
		const callout = section.callout;
		if (!callout || typeof callout[rest[1]] !== 'string') return null;
		const kind = rest[1] === 'title' ? 'Callout Title' : 'Callout Text';
		return {
			name: kind,
			value: callout[rest[1]],
			set: (v) => (callout[rest[1]] = v)
		};
	}

	if (rest.length === 1 && (rest[0] === 'button' || rest[0] === 'buttonUrl')) {
		const kind = rest[0] === 'button' ? 'Button' : 'Button URL';
		return stringField(section, rest[0], `${label} ${kind}`);
	}

	if (rest.length === 3 && rest[0] === 'cards') {
		const CARD_NAMES: Record<string, string> = { title: 'Title', text: 'Text', url: 'URL' };
		const kind = CARD_NAMES[rest[2]];
		if (!kind) return null;
		const i = Number(rest[1]);
		const card = Array.isArray(section.cards) ? section.cards[i] : undefined;
		return stringField(card, rest[2], `${label} Card [${i + 1}] ${kind}`);
	}

	if (rest.length === 3 && rest[0] === 'facts' && (rest[2] === 'label' || rest[2] === 'text')) {
		const i = Number(rest[1]);
		const fact = Array.isArray(section.facts) ? section.facts[i] : undefined;
		const kind = rest[2] === 'label' ? 'Label' : 'Text';
		const field = stringField(fact, rest[2], `${label} Fact [${i + 1}] ${kind}`);
		if (!field || rest[2] === 'label') return field;

		// A fact carries `unverified`/`unverifiedReason` as SIBLINGS of `text`,
		// not as a wrapper around it -- unlike a paragraph or bullet. `readEntry`
		// reads that shape directly, so no new helper is needed.
		//
		// This has to be surfaced here and not only on the mockup: FieldsPanel
		// derives its "no confirmed source" callout from `field.unverified` on
		// the RESOLVED field, while the page gets it from FactsBlock's own prop.
		// Returning a plain string made the two disagree -- the page warned and
		// the panel did not, so a reviewer could rewrite and approve an
		// explicitly unconfirmed phone number without ever seeing the flag.
		const entry = readEntry(fact);
		return { ...field, unverified: entry?.unverified, unverifiedReason: entry?.reason };
	}

	if (rest.length === 3 && rest[0] === 'table') {
		const r = Number(rest[1]);
		const c = Number(rest[2]);
		const row = Array.isArray(section.table) ? section.table[r] : undefined;
		return arrayStringField(row, c, `${label} Table [${r + 1},${c + 1}]`);
	}

	if (rest[0] === 'steps' && rest.length >= 3) {
		const i = Number(rest[1]);
		const step = Array.isArray(section.steps) ? section.steps[i] : undefined;
		const stepLabel = `${label} Step [${i + 1}]`;

		if (rest.length === 3) {
			const STEP_NAMES: Record<string, string> = {
				title: 'Title',
				button: 'Button',
				buttonUrl: 'Button URL'
			};
			const kind = STEP_NAMES[rest[2]];
			if (!kind) return null;
			return stringField(step, rest[2], `${stepLabel} ${kind}`);
		}

		if (rest.length === 4 && (rest[2] === 'text' || rest[2] === 'bullets')) {
			const list = step?.[rest[2]];
			const j = Number(rest[3]);
			if (!Array.isArray(list) || !Number.isInteger(j)) return null;
			const entry = readEntry(list[j]);
			if (!entry) return null;
			const kind = rest[2] === 'text' ? 'Text' : 'Bullet';
			return {
				name: `${stepLabel} ${kind} [${j + 1}]`,
				value: entry.text,
				set: (v) => writeEntry(list, j, v),
				unverified: entry.unverified,
				unverifiedReason: entry.reason
			};
		}

		if (rest.length === 4 && rest[2] === 'callout' && (rest[3] === 'title' || rest[3] === 'text')) {
			const kind = rest[3] === 'title' ? 'Callout Title' : 'Callout Text';
			return stringField(step?.callout, rest[3], `${stepLabel} ${kind}`);
		}

		return null;
	}

	return null;
}

/** Resolve many at once, dropping any that no longer name a live field. */
export function resolveFields(
	page: AnyPage | undefined | null,
	fieldIds: readonly string[]
): { fieldId: string; field: ResolvedField }[] {
	const out: { fieldId: string; field: ResolvedField }[] = [];
	for (const fieldId of fieldIds) {
		const field = resolveField(page, fieldId);
		if (field) out.push({ fieldId, field });
	}
	return out;
}
