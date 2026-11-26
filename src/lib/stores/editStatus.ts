/**
 * Whether a saved edit still answers its field's base copy
 * (docs/adr/0001-edits-anchor-to-base-copy-hash.md).
 *
 * - **current**: the field's base copy hashes to the edit's `base_hash`.
 * - **expired**: it hashes to something else -- the base moved since the save.
 *   Compared against the base NOW, not against history, so copy that changes
 *   and changes back is current again.
 * - **orphaned**: the field no longer exists on its page, so there is no base
 *   copy to compare against and nowhere on the mockup to show it.
 *
 * An edit with no `base_hash` is treated as current. The column is required
 * (20261126100000) and production held no edits before it, so only an old
 * fixture or a hand-built row can lack one; calling it expired would invent a
 * claim about copy nobody recorded.
 */
import { hashTextBrowser } from '$lib/corpus/hashBrowser';
import { editKey, latestEdits, type EditLike } from './applySavedEdits';

export type EditStatus = 'current' | 'expired' | 'orphaned';

/** One edit against its field's base hash now; `undefined` = the field is gone. */
export function classifyEdit(
	edit: { base_hash?: string | null },
	baseHashNow: string | undefined
): EditStatus {
	if (baseHashNow === undefined) return 'orphaned';
	if (!edit.base_hash) return 'current';
	return edit.base_hash === baseHashNow ? 'current' : 'expired';
}

/**
 * Classifies the newest edit of every field, keyed by `editKey(path, fieldId)`.
 * Only fields that are not current are returned -- the common case stays out of
 * the map, and a key's absence means current.
 *
 * `baseCopyOf` answers the base copy now (`pageStore.baseCopyOf`); `hash`
 * defaults to the browser SHA-256 that `hashBrowser.test.ts` pins to the
 * Node hash the corpus is locked with.
 */
export async function classifyLatestEdits(
	livePages: readonly { id: string; path: string }[],
	edits: readonly EditLike[],
	baseCopyOf: (path: string, fieldId: string) => string | undefined,
	hash: (text: string) => Promise<string> = hashTextBrowser
): Promise<Record<string, Exclude<EditStatus, 'current'>>> {
	const out: Record<string, Exclude<EditStatus, 'current'>> = {};
	for (const edit of latestEdits(livePages, edits).values()) {
		const base = baseCopyOf(edit.path, edit.field_id);
		const status = classifyEdit(edit, base === undefined ? undefined : await hash(base));
		if (status !== 'current') out[editKey(edit.path, edit.field_id)] = status;
	}
	return out;
}
