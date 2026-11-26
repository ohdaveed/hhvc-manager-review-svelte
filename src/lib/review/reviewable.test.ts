import { describe, it, expect, vi } from 'vitest';
import { get } from 'svelte/store';

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
const { isReviewable, reviewPagesStore } = await import('./reviewable');

const row = (path: string) => ({
	id: path,
	review_id: 'r1',
	path,
	status: 'needs-review' as const,
	manager_notes: null,
	page_checks: null
});

describe('reviewable rows', () => {
	it('keeps corpus pages and drafts', () => {
		expect(isReviewable('report-garbage-clutter-or-overgrown-plants')).toBe(true);
		expect(isReviewable('draft:3f1c0f0e-1111-4222-8333-444455556666')).toBe(true);
	});

	it('drops rows whose page was retired', () => {
		// Retired in #244 and #245; production still holds both rows.
		expect(isReviewable('information-who-to-call-about-a-housing-problem')).toBe(false);
		expect(isReviewable('step-by-step-prepare-your-unit-for-pest-treatment')).toBe(false);
	});

	it('filters the store without touching pagesStore', () => {
		pagesStore.set([
			row('report-garbage-clutter-or-overgrown-plants'),
			row('step-by-step-prepare-your-unit-for-pest-treatment')
		]);
		expect(get(reviewPagesStore).map((r) => r.path)).toEqual([
			'report-garbage-clutter-or-overgrown-plants'
		]);
		expect(get(pagesStore)).toHaveLength(2);
	});
});
