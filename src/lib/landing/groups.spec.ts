import { describe, expect, it } from 'vitest';
import { routableId } from '$lib/corpus/pageId';
import { allPages } from '$lib/data';
import { PAGE_GROUPS, groupPaths } from './groups';

// Every assertion compares lists of ids rather than counts, so a failure names
// the page that needs a home instead of reporting "expected 39 to be 38".
const corpusIds = allPages.map((page) => routableId(page));
const groupedIds: string[] = PAGE_GROUPS.flatMap((group) => [...group.pages]);

const duplicates = (ids: readonly string[]) => [
	...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))
];

describe('PAGE_GROUPS', () => {
	it('places every corpus page in a group', () => {
		const missing = corpusIds.filter((id) => !groupedIds.includes(id));
		expect(missing).toEqual([]);
	});

	it('places no page in more than one group, or twice in one', () => {
		expect(duplicates(groupedIds)).toEqual([]);
	});

	it('names no id that is not in the corpus', () => {
		const unknown = groupedIds.filter((id) => !corpusIds.includes(id));
		expect(unknown).toEqual([]);
	});

	it('lists exactly the corpus, so the group counts sum to its length', () => {
		// The corpus ids must themselves be distinct, or a sum that matches could
		// hide one page listed twice standing in for another that is missing.
		expect(duplicates(corpusIds)).toEqual([]);
		expect([...groupedIds].sort()).toEqual([...corpusIds].sort());
		expect(groupedIds.length).toBe(allPages.length);
	});

	it('gives each group a unique id', () => {
		expect(duplicates(PAGE_GROUPS.map((group) => group.id))).toEqual([]);
	});
});

describe('groupPaths', () => {
	it('lists pages under the landing headings, in landing order, whatever order they arrive in', () => {
		const sections = groupPaths([...corpusIds].reverse());
		expect(sections.map((s) => s.heading)).toEqual(PAGE_GROUPS.map((g) => g.heading));
		expect(sections.flatMap((s) => s.paths)).toEqual(groupedIds);
	});

	it('leaves out pages it was not given', () => {
		const sections = groupPaths(['report-mold', 'rat-free-blocks']);
		expect(sections.flatMap((s) => s.paths)).toEqual(['report-mold', 'rat-free-blocks']);
		expect(sections.find((s) => s.id === 'records')?.paths).toEqual([]);
	});

	it('lists an unclaimed page under Other pages and a draft under Proposed pages, last', () => {
		const sections = groupPaths(['draft:abc', 'not-a-themed-page', 'report-mold']);
		expect(sections.slice(-2)).toEqual([
			{ id: 'ungrouped', heading: 'Other pages', paths: ['not-a-themed-page'] },
			{ id: 'drafts', heading: 'Proposed pages', paths: ['draft:abc'] }
		]);
	});
});
