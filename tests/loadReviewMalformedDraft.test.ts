/**
 * A malformed draft row must not take the review workspace down with it.
 *
 * `loadDrafts` is the first step of `loadReview` that can reject, and the
 * layout awaits it. A draft whose `content.sections` is not an array of objects
 * made `toStorePage` throw, which left the realtime channel unsubscribed-never
 * and the rejection unhandled. The row is skipped instead, and the rest merge.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const draftRows: unknown[] = [];

vi.mock('$lib/supabase', () => {
	const rows = (table: string): unknown[] =>
		table === 'reviews'
			? [{ id: 'r1' }]
			: table === 'pages'
				? [{ id: 'p1', review_id: 'r1', path: 'topic-x--about', status: 'needs-review' }]
				: table === 'draft_pages'
					? draftRows
					: [];
	const builder = (table: string) => {
		const self: Record<string, unknown> = {
			then: (resolve: (v: unknown) => void) => resolve({ data: rows(table), error: null })
		};
		for (const method of ['select', 'eq', 'in', 'order', 'limit']) self[method] = () => self;
		return self;
	};
	return {
		ensureDevSession: async () => {},
		supabase: {
			from: (table: string) => builder(table),
			channel: () => ({ on: () => {}, subscribe: () => {}, unsubscribe: () => {} })
		}
	};
});

const { loadReview } = await import('../src/lib/stores/reviewState.js');
const { pageStore } = await import('../src/lib/stores/pageData.svelte.js');

const draft = (id: string, content: unknown) => ({
	id,
	path: `draft:${id}`,
	title: id,
	description: 'd',
	state: 'ready',
	content,
	valid: true,
	issues: [],
	model: null,
	created_by: null,
	created_at: '2026-11-23T00:00:00Z',
	updated_at: '2026-11-23T00:00:00Z'
});

describe('loadReview with a malformed draft', () => {
	beforeEach(() => {
		draftRows.length = 0;
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});
	afterEach(() => {
		vi.restoreAllMocks();
		pageStore.pages = pageStore.pages.filter((p) => !p.id.startsWith('draft:'));
	});

	it.each([
		['sections is a string', { title: 'x', sections: 'x' }],
		['sections holds a null', { title: 'x', sections: [null] }]
	])('resolves and skips the draft when %s', async (_name, content) => {
		const corpusCount = pageStore.pages.length;
		draftRows.push(
			draft('bad', content),
			draft('good', { slug: 'sf.gov/ok', title: 'Fine', sections: [{ paragraphs: ['t'] }] })
		);

		await expect(loadReview()).resolves.toBeTypeOf('function');

		expect(pageStore.pages.length).toBeGreaterThanOrEqual(corpusCount);
		expect(pageStore.pages.some((p) => p.id === 'draft:bad')).toBe(false);
		expect(pageStore.pages.some((p) => p.id === 'draft:good')).toBe(true);
	});
});
