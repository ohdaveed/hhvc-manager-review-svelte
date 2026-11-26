/**
 * Puts saved edits back on the mockup.
 *
 * The mockup renders `pageStore.pages`, the static corpus, and nothing used to
 * write `edits.new_content` into it: a saved edit showed only for the session
 * that typed it and was gone from the preview on reload, while the walkthrough,
 * Analysis and the export -- which fold `edits` themselves -- still had it.
 * This closes that gap with the same fold they use: last write wins, ordered
 * explicitly by `created_at`.
 *
 * Only edits the database has confirmed. `saveInlineEdit` puts an optimistic
 * row (`id: 'temp-…'`) into `editsStore` before its insert, and rolls it back
 * if the insert fails. Applying that row would put copy on the mockup the
 * moment Save is pressed, and nothing would take it off again on failure:
 * this function only ever applies, it never un-applies.
 *
 * A field the reviewer is typing into is left alone. Its change is on screen,
 * and replacing it with another reviewer's save would throw the typing away.
 */
import { resolveField } from '$lib/corpus/fieldResolver';

export type EditLike = {
	id?: string;
	page_id: string;
	field_id: string;
	new_content: string;
	created_at?: string;
	/** Who saved it. Lets a held-back save be told apart from the reviewer's own. */
	user_id?: string | null;
	/** sha256 of the field's base copy when saved -- see `editStatus.ts`. */
	base_hash?: string | null;
};
/** The id `saveInlineEdit` gives its optimistic row until the insert returns. */
const OPTIMISTIC_PREFIX = 'temp-';

type LivePageLike = { id: string; path: string };
type PageLike = { id: string };

/** The key `latestEdits` files a field under: page path, then field id. */
export const editKey = (path: string, fieldId: string) => `${path}\u0000${fieldId}`;

/**
 * The newest edit per field, keyed by `editKey`. Last write wins, ordered
 * explicitly by `created_at`. Rows for a page with no live row are dropped.
 */
export function latestEdits(
	livePages: readonly LivePageLike[],
	edits: readonly EditLike[]
): Map<string, EditLike & { path: string }> {
	const pathOf = new Map(livePages.map((p) => [p.id, p.path]));
	const latest = new Map<string, EditLike & { path: string }>();
	const ordered = [...edits].sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));
	for (const edit of ordered) {
		const path = pathOf.get(edit.page_id);
		if (path === undefined || typeof edit.new_content !== 'string') continue;
		latest.set(editKey(path, edit.field_id), { ...edit, path });
	}
	return latest;
}

/**
 * Returns how many fields were changed, which is mostly useful to tests.
 *
 * `onHeldBack` hears about each confirmed edit left off the mockup because the
 * reviewer has an unsaved change on that field -- the way a save made
 * elsewhere during the typing is noticed rather than silently overwritten.
 */
export function applySavedEdits(
	pages: readonly PageLike[],
	livePages: readonly LivePageLike[],
	edits: readonly EditLike[],
	hasUnsavedChange: (pageId: string, fieldId: string) => boolean,
	onHeldBack?: (pageId: string, fieldId: string, edit: EditLike) => void
): number {
	let changed = 0;
	for (const edit of latestEdits(livePages, edits).values()) {
		// The newest row is still in flight: skip the field rather than fall back
		// to an older confirmed row, which would put stale copy back.
		if (edit.id?.startsWith(OPTIMISTIC_PREFIX)) continue;
		if (hasUnsavedChange(edit.path, edit.field_id)) {
			onHeldBack?.(edit.path, edit.field_id, edit);
			continue;
		}
		const field = resolveField(
			pages.find((p) => p.id === edit.path),
			edit.field_id
		);
		if (!field || field.value === edit.new_content) continue;
		field.set(edit.new_content);
		changed++;
	}
	return changed;
}

/** The parts of `pageStore` hydration touches -- an interface so tests can fake it. */
export type UnsavedChangesLike = {
	getChange(pageId: string, fieldId: string): unknown;
	stampChangeBases(newestEditId: (pageId: string, fieldId: string) => string | null): void;
	markSavedElsewhere(pageId: string, fieldId: string, editId: string): void;
};

/**
 * One hydration pass, as the review layout runs it on every edits, pages or
 * unsaved-change update: stamp new unsaved changes, put saved edits on the
 * mockup, and flag a change whose field another reviewer saved meanwhile.
 *
 * Stamping waits for `editsLoaded`. Against a store that is empty only because
 * the fetch has not returned, every older save would look new and raise the
 * notice; a change typed before then is stamped on the pass the load causes.
 *
 * `isOwnEdit` names the rows THIS TAB inserted: those are never "elsewhere".
 * A save by the same reviewer in another tab is, since it overwrites typing
 * just as another reviewer's would. A row with no author (a deleted account)
 * cannot be new, so it is never flagged either.
 */
export function hydrateMockup(args: {
	pages: readonly PageLike[];
	livePages: readonly LivePageLike[];
	edits: readonly EditLike[];
	editsLoaded: boolean;
	isOwnEdit: (id: string) => boolean;
	changes: UnsavedChangesLike;
}): number {
	const { pages, livePages, edits, editsLoaded, isOwnEdit, changes } = args;
	if (editsLoaded) {
		const newest = latestEdits(livePages, edits);
		changes.stampChangeBases((path, fieldId) => newest.get(editKey(path, fieldId))?.id ?? null);
	}
	return applySavedEdits(
		pages,
		livePages,
		edits,
		(path, fieldId) => changes.getChange(path, fieldId) !== undefined,
		(path, fieldId, edit) => {
			if (!edit.id || !edit.user_id || isOwnEdit(edit.id)) return;
			changes.markSavedElsewhere(path, fieldId, edit.id);
		}
	);
}
