/**
 * Signed out, RLS hides every review, so `loadReview` sees no rows and no error.
 * That is the normal state, not a failure, and must not reach `console.error`;
 * a real query error still must.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

const result: { data: unknown[] | null; error: unknown } = { data: [], error: null };

vi.mock('$lib/supabase', () => {
	const self: Record<string, unknown> = {
		then: (resolve: (v: unknown) => void) => resolve(result)
	};
	for (const method of ['select', 'eq', 'in', 'order', 'limit']) self[method] = () => self;
	return { ensureDevSession: async () => {}, supabase: { from: () => self } };
});

const { loadReview } = await import('../src/lib/stores/reviewState.js');

describe('loadReview logging', () => {
	afterEach(() => vi.restoreAllMocks());

	it('does not log an error when no review is visible', async () => {
		result.data = [];
		result.error = null;
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(console, 'info').mockImplementation(() => {});
		await loadReview();
		expect(error).not.toHaveBeenCalled();
	});

	it('logs an error and rejects when the reviews query fails', async () => {
		result.data = null;
		result.error = { code: '42501', message: 'permission denied' };
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		// Rejecting, not resolving, is what lets a caller tell a failed load from
		// an empty one: the landing page shows "didn't load" only on a rejection.
		await expect(loadReview()).rejects.toThrow('Could not load the review');
		expect(error).toHaveBeenCalledWith('No review found:', result.error);
	});

	it('resolves when no review is visible', async () => {
		result.data = [];
		result.error = null;
		vi.spyOn(console, 'info').mockImplementation(() => {});
		await expect(loadReview()).resolves.toBeTypeOf('function');
	});
});
