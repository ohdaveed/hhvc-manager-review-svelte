/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';

const retryDraft = vi.fn();
vi.mock('$lib/stores/draftPages', async (orig) => ({
	...(await orig<typeof import('../src/lib/stores/draftPages')>()),
	retryDraft: (...a: unknown[]) => retryDraft(...a)
}));
vi.mock('$lib/ai/generate', () => ({ requestGeneration: vi.fn() }));
vi.mock('$lib/supabase', () => ({
	supabase: {
		auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) },
		from: () => ({})
	}
}));

import DraftBanner from '../src/lib/components/workspace/DraftBanner.svelte';
import type { DraftPage } from '../src/lib/stores/draftPages';

const draft = (over: Partial<DraftPage> = {}): DraftPage => ({
	id: 'abc',
	path: 'draft:abc',
	title: 'Rat bait',
	description: 'A page about rat bait stations',
	state: 'ready',
	content: {},
	valid: true,
	issues: [],
	model: 'gemini-x',
	created_by: 'u1',
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
	...over
});

beforeEach(() => retryDraft.mockReset());

describe('DraftBanner', () => {
	it('names the description and model and says it is an AI draft', () => {
		render(DraftBanner, { draft: draft() });
		expect(screen.getByText(/AI draft/i)).toBeTruthy();
		expect(screen.getByText(/A page about rat bait stations/)).toBeTruthy();
		expect(screen.getByText(/gemini-x/)).toBeTruthy();
	});

	it('lists each validation issue when the draft is invalid', () => {
		render(DraftBanner, {
			draft: draft({ valid: false, issues: ['Missing summary', 'Too long'] })
		});
		expect(screen.getByText('Missing summary')).toBeTruthy();
		expect(screen.getByText('Too long')).toBeTruthy();
	});

	it('does not offer a retry for a ready draft', () => {
		render(DraftBanner, { draft: draft() });
		expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
	});

	it('shows progress, not a retry, for a fresh drafting row', () => {
		render(DraftBanner, { draft: draft({ state: 'drafting', content: null }) });
		expect(screen.getByRole('status')).toBeTruthy();
		expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
	});

	it('shows a retry instead of a spinner for a drafting row abandoned past the stale window', () => {
		const old = new Date(Date.now() - 120_000).toISOString();
		render(DraftBanner, { draft: draft({ state: 'drafting', content: null, updated_at: old }) });
		expect(screen.queryByRole('status')).toBeNull();
		expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy();
	});

	it('offers a retry for a failed draft and retries that same row', async () => {
		const failed = draft({ state: 'failed', content: null });
		retryDraft.mockResolvedValue(failed);
		render(DraftBanner, { draft: failed });
		await fireEvent.click(screen.getByRole('button', { name: /retry/i }));
		expect(retryDraft).toHaveBeenCalledWith(failed);
	});

	it('says "requested by you" only for the signed-in author', async () => {
		const { unmount } = render(DraftBanner, { draft: draft() });
		expect(await screen.findByText(/requested by you/i)).toBeTruthy();
		unmount();
		render(DraftBanner, { draft: draft({ created_by: 'someone-else' }) });
		await new Promise((r) => setTimeout(r, 0));
		expect(screen.queryByText(/requested by/i)).toBeNull();
	});
});
