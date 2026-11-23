import { describe, it, expect } from 'vitest';
import { allPages } from '$lib/data';
import { routableId } from './pageId.js';
import {
	DRAFT_PATH_PREFIX,
	MAX_DESCRIPTION_CHARS,
	draftIdFrom,
	draftPathFor,
	isDraftPath,
	reviewHrefFor
} from './draftPath.js';

describe('draft paths', () => {
	it('round-trips a draft id through its path', () => {
		const id = '9f1c2f0e-0000-4000-8000-000000000001';
		expect(draftIdFrom(draftPathFor(id))).toBe(id);
	});

	it('prefixes the id with the reserved prefix', () => {
		expect(DRAFT_PATH_PREFIX).toBe('draft:');
		expect(draftPathFor('abc')).toBe('draft:abc');
	});

	it('does not mistake a corpus path for a draft', () => {
		expect(isDraftPath('report-garbage-filth-vegetation')).toBe(false);
		expect(draftIdFrom('report-garbage-filth-vegetation')).toBeUndefined();
	});

	it('recognises a draft path', () => {
		expect(isDraftPath(draftPathFor('abc'))).toBe(true);
		expect(draftIdFrom('draft:abc')).toBe('abc');
	});

	it('treats a bare prefix as not a draft, consistently across all three functions', () => {
		expect(isDraftPath('draft:')).toBe(false);
		expect(draftIdFrom('draft:')).toBeUndefined();
		expect(reviewHrefFor('draft:')).toBe('/review/draft:');
	});

	it('treats an empty path as a corpus path', () => {
		expect(isDraftPath('')).toBe(false);
		expect(draftIdFrom('')).toBeUndefined();
		expect(reviewHrefFor('')).toBe('/review/');
	});

	it('does not match a colon that is not the leading prefix', () => {
		expect(isDraftPath('foo:draft:x')).toBe(false);
		expect(draftIdFrom('foo:draft:x')).toBeUndefined();
		expect(reviewHrefFor('foo:draft:x')).toBe('/review/foo:draft:x');
	});

	it('round-trips an empty id only as not a draft', () => {
		expect(draftPathFor('')).toBe('draft:');
		expect(draftIdFrom(draftPathFor(''))).toBeUndefined();
	});
});

describe('reviewHrefFor', () => {
	it('routes each kind of path to its own route', () => {
		expect(reviewHrefFor('mosquito-education-workshop')).toBe(
			'/review/mosquito-education-workshop'
		);
		expect(reviewHrefFor('draft:abc')).toBe('/review/draft/abc');
	});
});

describe('reserved prefix guard', () => {
	it('no corpus page routes to a path that reads as a draft', () => {
		const draftRouted = allPages.map((page) => routableId(page)).filter((id) => isDraftPath(id));
		expect(draftRouted).toEqual([]);
	});
});

describe('MAX_DESCRIPTION_CHARS', () => {
	it('caps a drafted page description at 2000 characters', () => {
		expect(MAX_DESCRIPTION_CHARS).toBe(2000);
	});
});
