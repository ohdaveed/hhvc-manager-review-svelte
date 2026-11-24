/**
 * `queueOrder` is what the toolbar's previous/next buttons step through, so it
 * has to match the order the queue renders: status groups in
 * `QUEUE_STATUS_ORDER`, store order inside each group. A mismatch would send
 * "next" to a row that is not the one below the current row in the sidebar.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('$lib/supabase', () => ({ ensureDevSession: async () => {}, supabase: {} }));

const { queueOrder, firstQueuePath } = await import('../src/lib/stores/reviewState.js');

type Status = import('../src/lib/stores/reviewState.js').ReviewPage['status'];
const row = (path: string, status: Status) => ({
	id: `id-${path}`,
	review_id: 'r1',
	path,
	status,
	manager_notes: null,
	page_checks: null
});

describe('queueOrder', () => {
	it('groups by queue status order, keeping store order inside a group', () => {
		const pages = [
			row('a', 'approved'),
			row('b', 'needs-review'),
			row('c', 'blocked'),
			row('d', 'needs-review'),
			row('e', 'revise')
		];
		expect(queueOrder(pages)).toEqual(['b', 'd', 'a', 'e', 'c']);
	});

	it('starts with the row firstQueuePath names', () => {
		const pages = [row('a', 'approved'), row('b', 'revise')];
		expect(queueOrder(pages)[0]).toBe(firstQueuePath(pages));
	});

	it('is empty when no review is loaded', () => {
		expect(queueOrder([])).toEqual([]);
	});
});
