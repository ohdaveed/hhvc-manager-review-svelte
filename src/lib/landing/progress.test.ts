import { describe, it, expect } from 'vitest';
import { reviewProgress } from './progress';
import type { ReviewPage } from '$lib/stores/reviewState';

const p = (status: ReviewPage['status'], path = `page-${Math.random()}`): ReviewPage => ({
	id: `id-${path}`,
	review_id: 'r1',
	path,
	status,
	manager_notes: null,
	page_checks: null
});

describe('reviewProgress', () => {
	it('counts every decided status, not just approved', () => {
		expect(
			reviewProgress([p('approved'), p('revise'), p('blocked'), p('needs-review')]).decided
		).toBe(3);
	});

	it('includes drafts in the denominator', () => {
		expect(reviewProgress([p('needs-review'), p('needs-review', 'draft:abc')]).total).toBe(2);
	});

	it('points at the first undecided page when nothing is decided', () => {
		expect(reviewProgress([p('needs-review', 'a'), p('needs-review', 'b')]).nextHref).toBe(
			'/review/a'
		);
	});

	it('skips decided pages when choosing where to continue', () => {
		expect(reviewProgress([p('approved', 'a'), p('needs-review', 'b')]).nextHref).toBe('/review/b');
	});

	it('routes a draft through reviewHrefFor, never /review/draft:<id>', () => {
		expect(reviewProgress([p('needs-review', 'draft:abc')]).nextHref).toBe('/review/draft/abc');
	});

	it('names the next path as well as its href', () => {
		expect(reviewProgress([p('approved', 'a'), p('needs-review', 'draft:b')]).nextPath).toBe(
			'draft:b'
		);
	});

	it('has no next href once every page is decided', () => {
		expect(reviewProgress([p('approved'), p('blocked')]).nextHref).toBeUndefined();
	});

	it('reports nothing for an empty review', () => {
		expect(reviewProgress([])).toEqual({
			decided: 0,
			total: 0,
			nextPath: undefined,
			nextHref: undefined
		});
	});
});
