/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/svelte';
import RethinkPanel from '../src/lib/components/workspace/RethinkPanel.svelte';
import { pageStore } from '../src/lib/stores/pageData.svelte.js';

const requestGeneration = vi.fn();
const updatePageNotes = vi.fn();

vi.mock('$lib/ai/generate', () => ({
	requestGeneration: (payload: unknown, signal?: AbortSignal) => requestGeneration(payload, signal)
}));

const session = vi.hoisted(() => ({ knownSignedOut: false }));
vi.mock('$lib/stores/session.svelte', () => ({ sessionStore: session }));

vi.mock('$lib/supabase', () => ({ ensureDevSession: async () => {}, supabase: {} }));

const { pagesStore } = await import('../src/lib/stores/reviewState.js');

vi.spyOn(await import('../src/lib/stores/reviewState.js'), 'updatePageNotes').mockImplementation(
	(...args: unknown[]) => updatePageNotes(...args)
);

const pageData = {
	id: 'topic-x--about',
	title: 'About vector control',
	sections: [{ fieldKey: 'what-we-do', heading: 'What we do', paragraphs: ['Our work covers:'] }]
};

const sampleReply = {
	task: 'page-suggestions',
	model: 'gemini-3.1-flash-lite',
	disclosure: 'AI-assisted draft.',
	result: {
		plainLanguage: 'Shorten the opening paragraph to two short sentences.',
		structure: 'Lead with what tenants should do before listing staff roles.',
		codeAndScope: 'Map this section to an Information body block in Karl.'
	}
};

describe('RethinkPanel', () => {
	beforeEach(() => {
		requestGeneration.mockReset();
		updatePageNotes.mockReset();
		updatePageNotes.mockResolvedValue(true);
		session.knownSignedOut = false;
		pageStore.pageSuggestions = {};
		pageStore.enterPage('topic-x--about');
		pagesStore.set([
			{
				id: 'row-1',
				review_id: 'r1',
				path: 'topic-x--about',
				status: 'needs-review',
				manager_notes: 'Existing note.',
				page_checks: null
			}
		]);
	});

	it('prompts to sign in when signed out without calling the AI endpoint', () => {
		session.knownSignedOut = true;
		render(RethinkPanel, { props: { pageData } });
		expect(requestGeneration).not.toHaveBeenCalled();
		expect(screen.getByText(/Sign in for AI Rethink suggestions/i)).toBeTruthy();
	});

	it('auto-generates the three categorized suggestion cards and caches them per page', async () => {
		requestGeneration.mockResolvedValueOnce(sampleReply);
		const { unmount } = render(RethinkPanel, { props: { pageData } });

		expect(await screen.findByText('Plain language')).toBeTruthy();
		expect(screen.getByText('Structure')).toBeTruthy();
		expect(screen.getByText('Code & scope')).toBeTruthy();
		expect(screen.getByText(/Shorten the opening paragraph/)).toBeTruthy();
		expect(requestGeneration).toHaveBeenCalledTimes(1);

		unmount();
		render(RethinkPanel, { props: { pageData } });
		expect(screen.getByText(/Shorten the opening paragraph/)).toBeTruthy();
		expect(requestGeneration).toHaveBeenCalledTimes(1);
	});

	it('sends a suggestion to Decision notes and marks the card as sent', async () => {
		requestGeneration.mockResolvedValueOnce(sampleReply);
		render(RethinkPanel, { props: { pageData } });

		const sendButtons = await screen.findAllByRole('button', { name: 'Send to Decision notes' });
		await fireEvent.click(sendButtons[0]);

		expect(updatePageNotes).toHaveBeenCalledWith(
			'row-1',
			'Existing note.\n\n[Plain language] Shorten the opening paragraph to two short sentences.'
		);
		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'Sent to Decision notes' })).toBeTruthy();
		});
	});

	it('shows an error and allows retrying when generation fails', async () => {
		requestGeneration.mockRejectedValueOnce(new Error('Generation timed out.'));
		render(RethinkPanel, { props: { pageData } });

		expect((await screen.findByRole('alert')).textContent).toContain('Generation timed out.');

		requestGeneration.mockResolvedValueOnce(sampleReply);
		await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
		expect(await screen.findByText('Plain language')).toBeTruthy();
	});

	it('invokes onGoToDecision from the footer button', async () => {
		requestGeneration.mockResolvedValueOnce(sampleReply);
		const onGoToDecision = vi.fn();
		render(RethinkPanel, { props: { pageData, onGoToDecision } });

		await fireEvent.click(screen.getByRole('button', { name: /Go to Decision/i }));
		expect(onGoToDecision).toHaveBeenCalledTimes(1);
	});
});
