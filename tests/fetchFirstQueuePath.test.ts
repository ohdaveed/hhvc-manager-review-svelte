/**
 * The root redirect's lookup must stay light: one path, no `loadReview` side
 * effects. It used to call `loadReview()`, which opened a realtime channel,
 * fetched every edit and logged "No review found" a second time when signed out.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const tablesQueried: string[] = [];
const rows: Record<string, unknown[]> = {};
const channel = vi.fn();

vi.mock('$lib/supabase', () => {
	const builder = (table: string) => {
		const self: Record<string, unknown> = {
			then: (resolve: (v: unknown) => void) => resolve({ data: rows[table] ?? [], error: null })
		};
		for (const method of ['select', 'eq', 'order', 'limit']) self[method] = () => self;
		return self;
	};
	return {
		ensureDevSession: async () => {},
		supabase: {
			from: (table: string) => {
				tablesQueried.push(table);
				return builder(table);
			},
			channel
		}
	};
});

const { fetchFirstQueuePath } = await import('../src/lib/stores/reviewState.js');

describe('fetchFirstQueuePath', () => {
	beforeEach(() => {
		tablesQueried.length = 0;
		channel.mockClear();
		for (const k of Object.keys(rows)) delete rows[k];
	});

	it('names the queue-first row, reading only reviews and pages', async () => {
		rows.reviews = [{ id: 'r1' }];
		rows.pages = [
			{ path: 'decided', status: 'approved' },
			{ path: 'todo', status: 'needs-review' }
		];

		expect(await fetchFirstQueuePath()).toBe('todo');
		expect(tablesQueried).toEqual(['reviews', 'pages']);
		expect(channel).not.toHaveBeenCalled();
	});

	it('returns undefined quietly when no review is visible (signed out)', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});

		expect(await fetchFirstQueuePath()).toBeUndefined();
		expect(tablesQueried).toEqual(['reviews']);
		expect(error).not.toHaveBeenCalled();
		error.mockRestore();
	});
});
