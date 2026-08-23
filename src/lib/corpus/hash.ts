import { createHash } from 'node:crypto';
import type { FieldMap } from './fields.js';

export function hashText(text: string): string {
	return createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * One digest over a field-id-keyed hash map, in sorted-id order -- shared by
 * `hashFields` below (over a page's own fields) and `hashLockPages` in
 * `lock.ts` (over a lockfile page entry's `fieldHashes`, so that map is
 * covered by the lock's `corpusHash` and not just silently along for the
 * ride). Sorting here, rather than trusting the map's own key order, is what
 * keeps the digest stable whether the map was just built (insertion order)
 * or parsed back from JSON (whatever order the file happened to have).
 *
 * The digest is constructed with length-prefixed field ids (`{id.length}:{id}`)
 * followed by their 64-character hashes, with no separator between them. This
 * makes the byte stream unambiguous: a crafted field id cannot be built to
 * consume part of the next field's hash, because each hash is exactly 64 hex
 * chars and the id length is explicit.
 */
export function hashFieldMap(fieldHashes: Record<string, string>): string {
	const digest = createHash('sha256');
	for (const id of Object.keys(fieldHashes).sort()) {
		digest.update(`${id.length}:${id}`, 'utf8');
		digest.update(fieldHashes[id], 'utf8');
	}
	return digest.digest('hex');
}

/**
 * Per-field hashes plus one page hash.
 *
 * The page hash is taken over the field ids and their hashes in sorted order,
 * so it does not move when the module's keys are reordered -- otherwise every
 * import would look like a content change. Field ids are included in the
 * digest, so renaming a field changes the page hash even when the text does
 * not.
 *
 * Per-field hashes are what let a later slice expire only the accepted edits
 * whose own copy moved. A single page hash would expire every accepted edit on
 * the page whenever any part of it changed.
 */
export function hashFields(fields: FieldMap): {
	pageHash: string;
	fieldHashes: Record<string, string>;
} {
	const fieldHashes: Record<string, string> = {};
	for (const id of Object.keys(fields).sort()) {
		fieldHashes[id] = hashText(fields[id]);
	}

	return { pageHash: hashFieldMap(fieldHashes), fieldHashes };
}
