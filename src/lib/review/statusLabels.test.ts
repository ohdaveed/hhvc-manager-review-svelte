import { describe, it, expect, vi } from 'vitest';

// `reviewState` imports `$lib/supabase`, which calls `createClient` at module
// scope. Only `QUEUE_STATUS_ORDER` is wanted from it here.
vi.mock('$lib/supabase', () => ({ ensureDevSession: async () => {}, supabase: {} }));

const { QUEUE_STATUS_ORDER } = await import('$lib/stores/reviewState');
const { STATUS_LABELS } = await import('./statusLabels');

describe('STATUS_LABELS', () => {
	it.each(QUEUE_STATUS_ORDER)('gives %s every word and class it is rendered with', (status) => {
		const entry = STATUS_LABELS[status];
		for (const field of ['label', 'badge', 'bar'] as const) {
			expect(entry[field], `${status}.${field}`).toMatch(/\S/);
		}
	});

	it('has no status the queue does not order', () => {
		expect(Object.keys(STATUS_LABELS).sort()).toEqual([...QUEUE_STATUS_ORDER].sort());
	});

	it('uses the landing-page words from decision D3', () => {
		expect(QUEUE_STATUS_ORDER.map((s) => STATUS_LABELS[s].label)).toEqual([
			'Undecided',
			'Approved',
			'Needs revision',
			'Blocked'
		]);
	});

	// shadcn's `destructive` badge measures 3.98:1, below AA. See the module.
	it('states no badge in the shadcn destructive tone', () => {
		for (const status of QUEUE_STATUS_ORDER) {
			expect(STATUS_LABELS[status].badge).not.toContain('destructive');
		}
	});

	it('pairs each coloured badge ground with its own solid foreground', () => {
		for (const [status, tone] of [
			['approved', 'green'],
			['revise', 'amber'],
			['blocked', 'red']
		] as const) {
			expect(STATUS_LABELS[status].badge).toContain(`bg-sfds-${tone}-l1`);
			expect(STATUS_LABELS[status].badge).toContain(`text-sfds-${tone}`);
			expect(STATUS_LABELS[status].bar).toBe(`bg-sfds-${tone}`);
		}
	});
});
