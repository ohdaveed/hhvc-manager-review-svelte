/**
 * `loadReview` must hydrate from `latest_edits`, not from `edits`.
 *
 * The table is append-only and unbounded, and PostgREST truncates a response at
 * `max_rows` (1000) without erroring. The old query ordered `created_at`
 * ascending and the reader folds last-write-wins, so past the cap the rows
 * silently dropped were the newest ones -- stale copy, clean console. The view
 * returns one row per (page_id, field_id), which is bounded by field count.
 *
 * This asserts the source, because the failure it guards has no other visible
 * symptom: a test of the fold alone passes either way.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const tablesQueried: string[] = [];

vi.mock('$lib/supabase', () => {
	const rows: Record<string, unknown[]> = {
		reviews: [{ id: 'r1' }],
		pages: [{ id: 'p1', review_id: 'r1', path: 'topic-x--about', status: 'needs-review' }],
		latest_edits: [{ id: 'e1', page_id: 'p1', field_id: 'f1', new_content: 'newest' }],
		edits: [{ id: 'e0', page_id: 'p1', field_id: 'f1', new_content: 'oldest' }]
	};

	const builder = (table: string) => {
		const self: Record<string, unknown> = {
			then: (resolve: (v: unknown) => void) => resolve({ data: rows[table] ?? [], error: null })
		};
		for (const method of ['select', 'eq', 'in', 'order', 'limit']) self[method] = () => self;
		return self;
	};

	return {
		ensureDevSession: async () => {},
		supabase: {
			from: (table: string) => {
				tablesQueried.push(table);
				return builder(table);
			},
			channel: () => ({ on: () => {}, subscribe: () => {}, unsubscribe: () => {} })
		}
	};
});

const { loadReview, editsStore } = await import('../src/lib/stores/reviewState.js');
const { get } = await import('svelte/store');

describe('loadReview edit hydration', () => {
	beforeEach(() => {
		tablesQueried.length = 0;
		editsStore.set([]);
	});

	it('reads the latest_edits view rather than the edits table', async () => {
		await loadReview();
		expect(tablesQueried).toContain('latest_edits');
		expect(tablesQueried).not.toContain('edits');
	});

	it('puts what the view returned into the store', async () => {
		await loadReview();
		expect(get(editsStore)).toEqual([
			{ id: 'e1', page_id: 'p1', field_id: 'f1', new_content: 'newest' }
		]);
	});
});
