import { describe, it, expect } from 'vitest';
import { buildLock, derivePagePath } from './lock.js';

const pages = [
	{ slug: 'sf.gov/topic-b--about', title: 'B', sections: [{ heading: 'H', paragraphs: ['p'] }] },
	{ slug: 'sf.gov/topic-a', title: 'A', sections: [] }
];

describe('derivePagePath', () => {
	it('strips the sf.gov prefix and dashes slashes', () => {
		expect(derivePagePath({ slug: 'sf.gov/topic-x--about', title: 'X' })).toBe('topic-x--about');
		expect(derivePagePath({ slug: 'sf.gov/a/b', title: 'X' })).toBe('a-b');
	});

	it('falls back to a slugified title', () => {
		expect(derivePagePath({ title: 'Two Words' })).toBe('two-words');
	});
});

describe('buildLock', () => {
	it('keys pages by path and sorts them', () => {
		expect(Object.keys(buildLock(pages).pages)).toEqual(['topic-a', 'topic-b--about']);
	});

	it('is stable across input order', () => {
		expect(buildLock(pages).corpusHash).toBe(buildLock([...pages].reverse()).corpusHash);
	});

	it('changes when any page copy changes', () => {
		const changed = structuredClone(pages);
		changed[0].sections[0].paragraphs[0] = 'p!';
		expect(buildLock(changed).corpusHash).not.toBe(buildLock(pages).corpusHash);
	});

	it('does not change when only an annotation changes', () => {
		const annotated = structuredClone(pages) as Record<string, unknown>[];
		annotated[0].editorNote = 'a note that must not count';
		expect(buildLock(annotated).corpusHash).toBe(buildLock(pages).corpusHash);
	});
});
