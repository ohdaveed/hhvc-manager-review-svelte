import { createHash } from 'node:crypto';
import type { FieldMap } from './fields.js';

export function hashText(text: string): string {
	return createHash('sha256').update(text, 'utf8').digest('hex');
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
 * The page digest is constructed with length-prefixed field ids (`{id.length}:{id}`)
 * followed by their 64-character hashes, with no separator between them. This makes
 * the byte stream unambiguous: if an attacker crafted a field id containing the
 * separator character, it could not consume part of the next field's hash, because
 * each hash is exactly 64 hex chars and the id length is explicit.
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

	const digest = createHash('sha256');
	for (const id of Object.keys(fieldHashes)) {
		digest.update(`${id.length}:${id}`, 'utf8');
		digest.update(fieldHashes[id], 'utf8');
	}

	return { pageHash: digest.digest('hex'), fieldHashes };
}
