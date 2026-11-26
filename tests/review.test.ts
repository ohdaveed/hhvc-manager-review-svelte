/**
 * `review` -- the review squared with the corpus, through its own interface.
 * The rule itself (`reconcileReview`) has its own tests; these pin what every
 * reader gets from the module, and that it follows both of its sources.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReviewPage } from '$lib/stores/reviewState';

vi.mock('$lib/supabase', () => ({
	ensureDevSession: async () => {},
	supabase: {
		auth: {
			getSession: async () => ({ data: { session: null } }),
			onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
		},
		from: () => ({}),
		channel: () => ({ on: () => ({ subscribe: () => ({}) }) })
	}
}));

const { pagesStore } = await import('$lib/stores/reviewState');
const { pageStore } = await import('$lib/stores/pageData.svelte');
const { review } = await import('$lib/review/review.svelte');

const row = (path: string, status: ReviewPage['status'] = 'needs-review'): ReviewPage => ({
	id: `id-${path}`,
	review_id: 'r1',
	path,
	status,
	manager_notes: null,
	page_checks: null
});
const corpus = (...ids: string[]) =>
	ids.map((id) => ({ id, title: id, type: 'Information', sections: [] })) as never;

describe('review', () => {
	beforeEach(() => {
		pageStore.pages = corpus('a', 'b', 'c');
		pagesStore.set([]);
	});

	it('counts every page a reviewer can open, and only decided rows as decided', () => {
		pagesStore.set([row('a', 'approved'), row('b', 'revise'), row('draft:x')]);
		// a, b and the draft have rows; c is in the corpus with none.
		expect(review.total).toBe(4);
		expect(review.decided).toBe(2);
		expect(review.unreviewed).toEqual(['c']);
		expect(review.counts).toEqual({ approved: 1, revise: 1, 'needs-review': 1 });
	});

	it('leaves a retired page out of rows and counts, and names it', () => {
		pagesStore.set([row('a'), row('gone-page', 'approved')]);
		expect(review.rows.map((r) => r.path)).toEqual(['a']);
		expect(review.retired.map((r) => r.path)).toEqual(['gone-page']);
		expect(review.decided).toBe(0);
		expect(review.counts.approved).toBeUndefined();
	});

	it('finds the next undecided page without naming a retired one', () => {
		pagesStore.set([row('a'), row('gone-page'), row('b', 'approved'), row('c')]);
		expect(review.nextUndecided('a')).toBe('c');
		expect(review.nextUndecided('c')).toBe('a');
	});

	it('tells loaded apart from a corpus-only total', () => {
		expect(review.loaded).toBe(false);
		expect(review.total).toBe(3);
		pagesStore.set([row('a')]);
		expect(review.loaded).toBe(true);
	});

	it('follows both sources', () => {
		pagesStore.set([row('a', 'approved')]);
		expect(review.total).toBe(3);
		pageStore.pages = corpus('a', 'b');
		expect(review.total).toBe(2);
		pagesStore.set([row('a', 'approved'), row('b', 'approved')]);
		expect(review.decided).toBe(2);
	});
});
