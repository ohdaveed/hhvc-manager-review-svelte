/**
 * `reconcileReview` squares the `pages` table with the static corpus.
 *
 * The two drift apart in both directions, and both were measured on the local
 * stack: a corpus page added after the seed ran has no row (five pages from
 * #221), and a page retired from the corpus keeps its row (#244 and #245 shipped
 * no migration). The queue used to read the table alone, so it said "0 of 38
 * decided" over a 43-page corpus and listed two rows that link to a 404.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('$lib/supabase', () => ({ ensureDevSession: async () => {}, supabase: {} }));

const { reconcileReview } = await import('../src/lib/stores/reviewState.js');

type Status = import('../src/lib/stores/reviewState.js').ReviewPage['status'];
const row = (path: string, status: Status = 'needs-review') => ({
	id: `id-${path}`,
	review_id: 'r1',
	path,
	status,
	manager_notes: null,
	page_checks: null
});

const DRAFT = 'draft:6f1c2a7e-0000-4000-8000-000000000001';

describe('reconcileReview', () => {
	it('keeps rows for corpus pages and drafts, drafts last', () => {
		const rows = [row('b', 'approved'), row(DRAFT), row('a')];
		const { rows: kept } = reconcileReview(rows, ['a', 'b']);
		expect(kept.map((r) => r.path)).toEqual(['b', 'a', DRAFT]);
	});

	// Store order is heap order (`loadReview` has no ORDER BY), so it is
	// arbitrary and moves as rows are updated. Start and Next undecided read
	// `rows`, and in heap order they skipped to a page near the list's end.
	it('orders rows the way the page lists do, not the way the table returned them', () => {
		const heap = [
			row('location-environmental-health-office'),
			row('departments--healthy-housing-and-vector-control--about'),
			row('report-rats-or-mice')
		];
		const { rows: kept } = reconcileReview(
			heap,
			heap.map((r) => r.path)
		);
		expect(kept.map((r) => r.path)).toEqual([
			'report-rats-or-mice',
			'departments--healthy-housing-and-vector-control--about',
			'location-environmental-health-office'
		]);
	});

	it('flags corpus pages that have no row, in corpus order', () => {
		const { unreviewed } = reconcileReview([row('b')], ['a', 'b', 'c']);
		expect(unreviewed).toEqual(['a', 'c']);
	});

	it('leaves out rows whose page is neither in the corpus nor a draft', () => {
		const { rows: kept, retired } = reconcileReview([row('a'), row('gone', 'approved')], ['a']);
		expect(kept.map((r) => r.path)).toEqual(['a']);
		expect(retired.map((r) => r.path)).toEqual(['gone']);
	});

	it('counts every page a reviewer can open: kept rows plus unreviewed pages', () => {
		const result = reconcileReview([row('a'), row(DRAFT), row('gone')], ['a', 'b', 'c']);
		expect(result.total).toBe(4);
	});

	it('reports nothing to flag when the table and corpus agree', () => {
		const result = reconcileReview([row('a'), row('b')], ['a', 'b']);
		expect(result.unreviewed).toEqual([]);
		expect(result.retired).toEqual([]);
		expect(result.total).toBe(2);
	});
});
