/**
 * `queueOrder` is the one order the review queue has. The sidebar renders its
 * rows under the landing page's themed headings (`groupPaths`), and the
 * toolbar's previous/next, "next undecided" and the landing page's resume
 * point all step through the same order. Before this, the sidebar grouped by
 * theme while the rest still grouped by status, so Next landed on a row that
 * was not the one below the current row.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('$lib/supabase', () => ({ ensureDevSession: async () => {}, supabase: {} }));

const { queueOrder, nextUndecidedPath } = await import('../src/lib/stores/reviewState.js');
const { groupPaths } = await import('../src/lib/landing/groups.js');
const { reviewProgress } = await import('../src/lib/landing/progress.js');

type Status = import('../src/lib/stores/reviewState.js').ReviewPage['status'];
const row = (path: string, status: Status) => ({
	id: `id-${path}`,
	review_id: 'r1',
	path,
	status,
	manager_notes: null,
	page_checks: null
});

// Real routable ids from three themes, so the order is the themes' order rather
// than store order: `report` comes first, `about` last.
const RATS = 'report-rats-or-mice';
const BED_BUGS = 'report-bed-bugs';
const ABOUT = 'departments--healthy-housing-and-vector-control--about';
const DRAFT = 'draft:00000000-0000-4000-8000-000000000001';

describe('queueOrder', () => {
	it('is the order the sidebar renders: themed groups, whatever the decisions', () => {
		const pages = [
			row(ABOUT, 'needs-review'),
			row(BED_BUGS, 'approved'),
			row(DRAFT, 'needs-review'),
			row(RATS, 'blocked')
		];
		const sidebar = groupPaths(pages.map((p) => p.path)).flatMap((s) => s.paths);
		expect(queueOrder(pages)).toEqual(sidebar);
		expect(queueOrder(pages)).toEqual([RATS, BED_BUGS, ABOUT, DRAFT]);
	});

	it('does not move a row when its decision changes', () => {
		const before = [row(RATS, 'needs-review'), row(ABOUT, 'needs-review')];
		const after = [row(RATS, 'approved'), row(ABOUT, 'needs-review')];
		expect(queueOrder(after)).toEqual(queueOrder(before));
	});

	it('lists the pages not in the review yet after the rows, as the sidebar does', () => {
		expect(queueOrder([row(ABOUT, 'approved')], [RATS])).toEqual([ABOUT, RATS]);
	});

	it('is empty when no review is loaded', () => {
		expect(queueOrder([])).toEqual([]);
	});
});

describe('nextUndecidedPath follows the queue order, not store order', () => {
	it('names the row below the current one on screen', () => {
		// Store order puts ABOUT second; on screen BED_BUGS sits below RATS.
		const pages = [
			row(RATS, 'approved'),
			row(ABOUT, 'needs-review'),
			row(BED_BUGS, 'needs-review')
		];
		expect(nextUndecidedPath(pages, RATS)).toBe(BED_BUGS);
	});
});

describe('reviewProgress resumes at the first undecided row on screen', () => {
	it('skips a page that is only earlier in store order', () => {
		const pages = [row(ABOUT, 'needs-review'), row(BED_BUGS, 'needs-review')];
		expect(reviewProgress(pages).nextPath).toBe(BED_BUGS);
	});
});
