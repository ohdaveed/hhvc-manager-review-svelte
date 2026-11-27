/**
 * The overlay: the saved edits a review has produced, applied on top of the
 * base copy (`CONTEXT.md`).
 *
 * `edits` is append-only, so a field can carry several rows and only the newest
 * is current. That fold -- last write wins, ordered explicitly by `created_at`
 * rather than by PostgREST's return order -- used to be written out in four
 * places, and the copies disagreed at the edges. It lives here and only here.
 */
import { deriveFieldKey } from './fieldKey';
import { resolveField } from './fieldResolver';

/** One `edits` row, narrowed to what the fold needs. */
export type EditRow = { field_id: string; new_content: string; created_at?: string | null };

/**
 * The newest row per key. Rows `keyOf` maps to `undefined` are dropped, as are
 * rows whose `new_content` is not a string.
 */
export function latestBy<T extends { new_content: unknown; created_at?: string | null }>(
	rows: readonly T[],
	keyOf: (row: T) => string | undefined
): Map<string, T> {
	const latest = new Map<string, T>();
	const ordered = [...rows].sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));
	for (const row of ordered) {
		const key = keyOf(row);
		if (key === undefined || typeof row.new_content !== 'string') continue;
		latest.set(key, row);
	}
	return latest;
}

/** The newest row per field, for one page's edits. */
export function latestByField<T extends EditRow>(edits: readonly T[]): Map<string, T> {
	return latestBy(edits, (e) => e.field_id);
}

/**
 * The copy as recorded (`CONTEXT.md`): a copy of `page` with its saved edits
 * applied, newest per field. `page` itself is not touched.
 *
 * Sections are keyed by `deriveFieldKey`, the rule the page store uses, so a
 * raw corpus page and a store page resolve the same field ids. An edit whose
 * field no longer resolves -- an orphan -- is left off, as on the mockup; the
 * slug is not a field of the page object and stays in the review record.
 */
export function copyAsRecorded<P extends object>(page: P, edits: readonly EditRow[]): P {
	const copy = structuredClone(page) as P & { sections?: Record<string, unknown>[] };
	if (Array.isArray(copy.sections)) {
		copy.sections = copy.sections.map((section, index) => ({
			...section,
			fieldKey: deriveFieldKey(section, index)
		}));
	}
	for (const [fieldId, edit] of latestByField(edits)) {
		resolveField(copy, fieldId)?.set(edit.new_content);
	}
	return copy;
}
