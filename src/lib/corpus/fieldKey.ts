/**
 * Single definition of a section's stable field key.
 *
 * Derived from the heading rather than the array index, so inserting or
 * reordering a section does not renumber the ones after it and orphan every
 * edit saved against their old positions. Imported by both
 * `pageData.svelte.ts` (which stamps `fieldKey` onto the pristine corpus) and
 * `corpus/fields.ts` (which hashes it). Two copies would be free to drift, and
 * a drifted key silently files edits under an id nothing reads.
 */
export function deriveFieldKey(
	section: { heading?: unknown; fieldKey?: unknown },
	index: number
): string {
	// An explicit `fieldKey` in the data module wins, and exists for exactly one
	// reason: REWORDING A HEADING OTHERWISE RE-KEYS ITS WHOLE SECTION.
	//
	// The derived key is a slug of the heading, so an editorial fix to the
	// heading text -- expanding a contraction, dropping a question mark --
	// silently moves every `sections.<key>.*` id in that section. `edits` and
	// `comments` are stored by `field_id` and `latest_edits` is keyed on
	// `(page_id, field_id)`, so the rows saved under the old id are orphaned:
	// still in the database, resolving to nothing on the page. `edits` has no
	// UPDATE or DELETE policy, so they cannot be repaired through the app.
	//
	// Pinning the key decouples the identity from the copy, which is the same
	// split `Section.svelte` already makes between `fieldId` (identity) and
	// `label` (display). Honoured here rather than at the two call sites so the
	// renderer and the hasher cannot disagree -- see the note above.
	if (typeof section.fieldKey === 'string' && section.fieldKey.trim()) {
		return section.fieldKey.trim();
	}

	const heading = typeof section.heading === 'string' ? section.heading : '';
	const slug = heading
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

	return slug || `section-${index}`;
}
