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
 * A field the reviewer is typing into is left alone. Its draft is on screen,
 * and replacing it with another reviewer's save would throw the typing away.
 */
import { resolveField } from '$lib/corpus/fieldResolver';

type EditLike = { page_id: string; field_id: string; new_content: string; created_at?: string };
type LivePageLike = { id: string; path: string };
type PageLike = { id: string };

/** Returns how many fields were changed, which is mostly useful to tests. */
export function applySavedEdits(
	pages: readonly PageLike[],
	livePages: readonly LivePageLike[],
	edits: readonly EditLike[],
	isDrafting: (pageId: string, fieldId: string) => boolean
): number {
	const pathOf = new Map(livePages.map((p) => [p.id, p.path]));
	const latest = new Map<string, EditLike & { path: string }>();
	const ordered = [...edits].sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));
	for (const edit of ordered) {
		const path = pathOf.get(edit.page_id);
		if (path === undefined || typeof edit.new_content !== 'string') continue;
		latest.set(`${path}\u0000${edit.field_id}`, { ...edit, path });
	}

	let changed = 0;
	for (const edit of latest.values()) {
		if (isDrafting(edit.path, edit.field_id)) continue;
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
