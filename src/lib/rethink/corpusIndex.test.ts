import { describe, it, expect } from 'vitest';
import { buildCorpusIndex, CORPUS_INDEX_MAX_CHARS } from './corpusIndex';
import { allPages, pagesByKey } from '$lib/data';

describe('pagesByKey', () => {
	it('holds every page, keyed by the name cards[].target uses', () => {
		expect(Object.keys(pagesByKey)).toHaveLength(39);
		expect(pagesByKey.scopeInfo).toBeDefined();
		expect(pagesByKey.article11Guide.slug).toContain('sf.gov/');
	});

	it('is the single definition of the corpus -- allPages is derived from it', () => {
		expect(allPages).toHaveLength(Object.keys(pagesByKey).length);
		expect(allPages[0]).toBe(Object.values(pagesByKey)[0]);
	});
});

describe('buildCorpusIndex', () => {
	it('renders one line per page, leading with the page key', () => {
		const index = buildCorpusIndex({
			scopeInfo: { type: 'Information', title: 'What we inspect', summary: 'Scope of HHVC.' },
			payFee: { type: 'Transaction', title: 'Pay the fee', summary: 'How to pay.' }
		});

		expect(index.split('\n')).toEqual([
			'scopeInfo | Information | What we inspect — Scope of HHVC.',
			'payFee | Transaction | Pay the fee — How to pay.'
		]);
	});

	it('tolerates a page missing a summary rather than printing undefined', () => {
		const index = buildCorpusIndex({ bare: { type: 'Information', title: 'Bare' } });
		expect(index).toBe('bare | Information | Bare');
	});

	it('stays inside the budget the prompt reserves for it', () => {
		expect(buildCorpusIndex(pagesByKey).length).toBeLessThanOrEqual(CORPUS_INDEX_MAX_CHARS);
	});
});
