import { describe, expect, it } from 'vitest';
import { pagesByKey } from '../src/lib/data/index';

// `proposed: true` is what the review queue filters on; the editorNote's
// "PROPOSED PAGE" opening is what a reader of the module sees. Two markers for
// one fact drift unless something holds them together, so this asserts they
// agree on every page, in both directions.
const pages = Object.entries(pagesByKey) as [
	string,
	{ proposed?: unknown; editorNote?: unknown }
][];
const notedProposed = (page: { editorNote?: unknown }) =>
	typeof page.editorNote === 'string' && page.editorNote.startsWith('PROPOSED PAGE');

describe('proposed pages', () => {
	it('finds at least one, so the checks below cannot pass vacuously', () => {
		expect(pages.some(([, page]) => page.proposed === true)).toBe(true);
	});

	it.each(pages)(
		'%s: proposed: true exactly when its editorNote opens "PROPOSED PAGE"',
		(_, page) => {
			expect(page.proposed === true).toBe(notedProposed(page));
		}
	);

	// Absent, not `false`: a page that is not proposed says nothing about it.
	it.each(pages)('%s: proposed is true or absent', (_, page) => {
		expect([true, undefined]).toContain(page.proposed);
	});
});
