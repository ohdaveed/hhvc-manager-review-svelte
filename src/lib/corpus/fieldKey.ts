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
export function deriveFieldKey(section: { heading?: unknown }, index: number): string {
	const heading = typeof section.heading === 'string' ? section.heading : '';
	const slug = heading
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

	return slug || `section-${index}`;
}
