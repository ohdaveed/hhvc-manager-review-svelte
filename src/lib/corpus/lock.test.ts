import { describe, it, expect } from 'vitest';
import {
	buildLock,
	derivePagePath,
	hashLockPages,
	isValidFieldHashMap,
	type CorpusLock
} from './lock.js';
import { hashFieldMap, hashFields, hashText } from './hash.js';

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

describe('hashLockPages', () => {
	it('prevents collisions from crafted paths', () => {
		// The corpus digest construction must be injective: two structurally
		// different page manifests cannot produce the same digest, even if one
		// page's path is crafted to look like a separator-joined pair of the
		// other manifest's entries. If this ever reverts to a plain
		// separator-joined string (e.g. `${path}|${contentHash}`), pagesB below
		// collapses onto pagesA's digest and this test catches it.
		const hashA = hashText('hello');
		const hashB = hashText('world');
		const pagesA: CorpusLock['pages'] = {
			a: { contentHash: hashA, fieldHashes: {} },
			b: { contentHash: hashB, fieldHashes: {} }
		};
		const craftedPath = `a|${hashA}|b`;
		const pagesB: CorpusLock['pages'] = {
			[craftedPath]: { contentHash: hashB, fieldHashes: {} }
		};
		expect(hashLockPages(pagesB)).not.toBe(hashLockPages(pagesA));
	});

	it('detects a pages map tampered independently of corpusHash', () => {
		// This is the reviewer's exploit for Finding 1: edit a page's
		// contentHash in a parsed corpus.lock while leaving corpusHash alone.
		// Re-deriving the digest from the (now tampered) pages map must no
		// longer match the untouched corpusHash, which is what lets the
		// checker tell an internally-inconsistent lockfile from a merely
		// stale one.
		const lock = buildLock(pages);
		const tamperedPages = structuredClone(lock.pages);
		const anyPath = Object.keys(tamperedPages)[0];
		tamperedPages[anyPath].contentHash = 'd'.repeat(64);

		expect(hashLockPages(tamperedPages)).not.toBe(lock.corpusHash);
	});
});

describe('isValidFieldHashMap', () => {
	it('rejects a fieldHashes map whose values are not 64-hex, closing the hashFieldMap collision', () => {
		// hashFieldMap only length-prefixes field ids, not values, so it treats
		// { a: '1:bVALUE' } and { a: '', b: 'VALUE' } as the same byte stream --
		// a real collision (see hash.ts). The checker must never let either
		// shape reach hashFieldMap in the first place: both have a value that
		// is not a 64-character hex digest, so this guard has to reject them
		// on its own, independent of whether the two ever actually collide.
		expect(hashFieldMap({ a: '1:bVALUE' })).toBe(hashFieldMap({ a: '', b: 'VALUE' }));
		expect(isValidFieldHashMap({ a: '1:bVALUE' })).toBe(false);
		expect(isValidFieldHashMap({ a: '', b: 'VALUE' })).toBe(false);
	});

	it('accepts a well-formed fieldHashes map', () => {
		const { fieldHashes } = hashFields({ title: 'T', summary: 'S' });
		expect(isValidFieldHashMap(fieldHashes)).toBe(true);
		expect(isValidFieldHashMap({})).toBe(true);
	});
});
