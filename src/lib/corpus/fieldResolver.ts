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

/**
 * Writes back in the same shape the entry already has.
 *
 * Exported as `setEntry` for `Section.svelte`, for the same reason `entryText`
 * is: the component holds the list, not the page. Both write paths must agree.
 */
export function setEntry(list: any[], i: number, next: string): void {
	writeEntry(list, i, next);
}

function writeEntry(list: any[], i: number, next: string): void {
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

	const parts = fieldId.split('.');

	if (parts[0] === 'audience' && parts.length === 2) {
		const i = Number(parts[1]);
		const list = page.audience;
		if (!Array.isArray(list) || !Number.isInteger(i) || typeof list[i] !== 'string') return null;
		return { name: `Audience [${i + 1}]`, value: list[i], set: (v) => (list[i] = v) };
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
