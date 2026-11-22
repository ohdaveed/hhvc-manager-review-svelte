/**
 * A rolled-back decision has to be reportable.
 *
 * `updatePageStatus` updates `pagesStore` optimistically, so the queue row
 * moves into its new group the instant a reviewer clicks. When the write then
 * fails the store is restored -- and before this, that was the whole of it:
 * the function logged to the console and returned `undefined`, so the panel
 * had nothing to surface and the reviewer saw a row that moved and moved back
 * with no explanation. `updatePageNotes` already returned a boolean for
 * exactly this reason; this asserts status now matches it.
 *
 * The rollback itself is asserted too, because the return value is only
 * useful if the store and the answer agree.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

let failNextWrite = false;

vi.mock('$lib/supabase', () => {
	const builder = () => {
		const self: Record<string, unknown> = {
			then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null })
		};
		for (const method of ['select', 'eq', 'in', 'order', 'limit']) self[method] = () => self;
		self.update = () => ({
			eq: async () => ({ error: failNextWrite ? { message: 'rls denied' } : null })
		});
		return self;
	};

	return {
		ensureDevSession: async () => {},
		supabase: {
			from: () => builder(),
			channel: () => ({ on: () => {}, subscribe: () => {}, unsubscribe: () => {} })
		}
	};
});

const { updatePageStatus, pagesStore } = await import('../src/lib/stores/reviewState.js');
const { get } = await import('svelte/store');

const seed = () =>
	pagesStore.set([
		{
			id: 'p1',
			review_id: 'r1',
			path: 'topic-x--about',
			status: 'needs-review',
			manager_notes: null,
			page_checks: null
		}
	] as never);

describe('updatePageStatus', () => {
	beforeEach(() => {
		failNextWrite = false;
		seed();
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it('reports success and keeps the optimistic status', async () => {
		const saved = await updatePageStatus('p1', 'approved');

		expect(saved).toBe(true);
		expect(get(pagesStore)[0].status).toBe('approved');
	});

	it('reports failure and rolls the status back', async () => {
		failNextWrite = true;

		const saved = await updatePageStatus('p1', 'approved');

		expect(saved).toBe(false);
		// The row the reviewer is looking at must not be left claiming a
		// decision the database refused.
		expect(get(pagesStore)[0].status).toBe('needs-review');
	});

	it('can move a page back to needs-review', async () => {
		await updatePageStatus('p1', 'blocked');
		expect(get(pagesStore)[0].status).toBe('blocked');

		// The undo path the decision control now offers. `needs-review` is a
		// writable status like any other, not an absence of one.
		const saved = await updatePageStatus('p1', 'needs-review');

		expect(saved).toBe(true);
		expect(get(pagesStore)[0].status).toBe('needs-review');
	});
});
