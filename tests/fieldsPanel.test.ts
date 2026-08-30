/**
 * @vitest-environment jsdom
 *
 * The Fields tab is where a rewrite becomes a saved edit, so the things worth
 * pinning are the ones that lose a reviewer's work when they drift:
 *
 *  - `Save N edits` counts ACCEPTED suggestions, not selected fields. They look
 *    alike and are routinely different numbers.
 *  - Saving writes through `resolveField`, so the corpus actually changes.
 *  - A selected field with no confirmed source raises the unverified callout.
 *
 * `$lib/ai/generate` and `$lib/stores/reviewState` are mocked, which also keeps
 * `$lib/supabase` -- a `createClient` at module scope -- out of the run.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import FieldsPanel from '../src/lib/components/workspace/FieldsPanel.svelte';
import { pageStore } from '../src/lib/stores/pageData.svelte.js';

const requestGeneration = vi.fn();
const saveInlineEdit = vi.fn();

vi.mock('$lib/ai/generate', () => ({ requestGeneration: (p: unknown) => requestGeneration(p) }));
vi.mock('$lib/stores/reviewState', () => ({
	saveInlineEdit: (...args: unknown[]) => saveInlineEdit(...args)
}));

const fixture = () => ({
	id: 'topic-x--about',
	title: 'About vector control',
	summary: 'What the program does.',
	sections: [
		{
			heading: 'How to report',
			fieldKey: 'how-to-report',
			paragraphs: [
				'First paragraph.',
				{ text: 'Unsourced claim.', unverified: true, unverifiedReason: 'no tier-1 source' }
			]
		}
	]
});

describe('FieldsPanel', () => {
	beforeEach(() => {
		pageStore.clearSelection();
		// `clearSelection` deliberately KEEPS accepted suggestions -- they are
		// unsaved work, not selection chrome -- so it is not a reset. Without this
		// an accepted card from one test is still in the store for the next.
		pageStore.suggestions = {};
		pageStore.agentRec = { state: 'idle', text: '' };
		requestGeneration.mockReset();
		saveInlineEdit.mockReset();
		// The success path. `saveInlineEdit` returns whether the row reached the
		// database, and a bare `vi.fn()` returns undefined -- which the panel now
		// correctly reads as a failed save.
		saveInlineEdit.mockResolvedValue(true);
	});

	it('says what to do when nothing is selected', () => {
		render(FieldsPanel, { props: { pageData: fixture() } });
		expect(screen.getByText('No field selected')).toBeTruthy();
	});

	it('numbers the selection in the order it was picked', () => {
		pageStore.selectedFieldIds = ['summary', 'title'];
		render(FieldsPanel, { props: { pageData: fixture() } });

		const items = screen.getByLabelText('Selected fields').querySelectorAll('li');
		expect([...items].map((li) => li.textContent?.trim().replace(/\s+/g, ' '))).toEqual([
			'1 Summary',
			'2 Title'
		]);
	});

	it('raises the unverified callout for copy with no confirmed source', () => {
		pageStore.selectedFieldIds = ['sections.how-to-report.paragraphs.1'];
		render(FieldsPanel, { props: { pageData: fixture() } });

		expect(screen.getByText('Unverified copy')).toBeTruthy();
		expect(screen.getByText(/no tier-1 source/)).toBeTruthy();
	});

	it('counts accepted suggestions in the footer, not selected fields', async () => {
		pageStore.selectedFieldIds = ['title', 'summary'];
		pageStore.suggestions = {
			title: { pageId: 'topic-x--about', original: 'a', suggested: 'b', status: 'pending' },
			summary: { pageId: 'topic-x--about', original: 'c', suggested: 'd', status: 'pending' }
		};
		render(FieldsPanel, { props: { pageData: fixture() } });

		// Two fields selected, two suggestions, none decided.
		expect(screen.getByRole('button', { name: 'Save 0 edits' }).hasAttribute('disabled')).toBe(
			true
		);

		await fireEvent.click(screen.getAllByRole('button', { name: 'Accept' })[0]);

		expect(screen.getByRole('button', { name: 'Save 1 edit' })).toBeTruthy();
	});

	it('shows the old and new copy as separate blocks, never interleaved', () => {
		pageStore.selectedFieldIds = ['title'];
		pageStore.suggestions = {
			title: {
				pageId: 'topic-x--about',
				original: 'About vector control',
				suggested: 'About pest control',
				status: 'pending'
			}
		};
		render(FieldsPanel, { props: { pageData: fixture() } });

		const before = screen.getByText('About vector control');
		const after = screen.getByText('About pest control');
		expect(before).not.toBe(after);
		expect(before.contains(after)).toBe(false);
	});

	it('writes an accepted suggestion into the corpus and persists it', async () => {
		const page = fixture();
		pageStore.selectedFieldIds = ['sections.how-to-report.paragraphs.0'];
		pageStore.suggestions = {
			'sections.how-to-report.paragraphs.0': {
				pageId: 'topic-x--about',
				original: 'First paragraph.',
				suggested: 'Rewritten paragraph.',
				status: 'accepted'
			}
		};
		render(FieldsPanel, { props: { pageData: page, livePageId: 'live-1' } });

		await fireEvent.click(screen.getByRole('button', { name: 'Save 1 edit' }));

		expect(page.sections[0].paragraphs[0]).toBe('Rewritten paragraph.');
		expect(saveInlineEdit).toHaveBeenCalledWith(
			'live-1',
			'sections.how-to-report.paragraphs.0',
			'Rewritten paragraph.'
		);
		// Saved suggestions leave the panel: the footer count is unsaved work.
		expect(pageStore.suggestions['sections.how-to-report.paragraphs.0']).toBeUndefined();
	});

	it('keeps an entry that carries an unverified flag in that shape when saving', async () => {
		const page = fixture();
		const fieldId = 'sections.how-to-report.paragraphs.1';
		pageStore.selectedFieldIds = [fieldId];
		pageStore.suggestions = {
			[fieldId]: {
				pageId: 'topic-x--about',
				original: 'Unsourced claim.',
				suggested: 'Clearer claim.',
				status: 'accepted'
			}
		};
		render(FieldsPanel, { props: { pageData: page, livePageId: 'live-1' } });

		await fireEvent.click(screen.getByRole('button', { name: 'Save 1 edit' }));

		// A reviewer rewording the copy has not thereby verified it.
		expect(page.sections[0].paragraphs[1]).toEqual({
			text: 'Clearer claim.',
			unverified: true,
			unverifiedReason: 'no tier-1 source'
		});
	});

	it('marks a field over the proxy cap as an error rather than sending it', async () => {
		const page = fixture();
		page.title = 'x'.repeat(20_001);
		pageStore.selectedFieldIds = ['title'];
		render(FieldsPanel, { props: { pageData: page } });

		await fireEvent.click(screen.getByRole('button', { name: 'Plain language' }));

		expect(requestGeneration).not.toHaveBeenCalled();
		expect(pageStore.suggestions.title?.status).toBe('error');
	});

	it('keeps the other rewrites when one field fails', async () => {
		pageStore.selectedFieldIds = ['title', 'summary'];
		requestGeneration.mockImplementation((payload: { fieldText: string }) =>
			payload.fieldText.startsWith('About')
				? Promise.reject(new Error('API Error'))
				: Promise.resolve({ result: { rewrittenText: 'Rewritten.' } })
		);
		render(FieldsPanel, { props: { pageData: fixture() } });

		await fireEvent.click(screen.getByRole('button', { name: 'Plain language' }));
		await vi.waitFor(() => expect(Object.keys(pageStore.suggestions).length).toBe(2));

		expect(pageStore.suggestions.title?.status).toBe('error');
		expect(pageStore.suggestions.summary).toMatchObject({
			status: 'pending',
			suggested: 'Rewritten.'
		});
	});

	it('reverses a decision until save commits it', async () => {
		const page = fixture();
		pageStore.selectedFieldIds = ['title', 'summary'];
		requestGeneration.mockResolvedValue({ result: { rewrittenText: 'Rewritten.' } });
		render(FieldsPanel, { props: { pageData: page, livePageId: 'live-1' } });

		await fireEvent.click(screen.getByRole('button', { name: 'Plain language' }));
		await screen.findByRole('button', { name: 'Accept all' });

		await fireEvent.click(screen.getByRole('button', { name: 'Accept all' }));
		await screen.findByRole('button', { name: 'Save 2 edits' });

		// `Accept all` decides every card at once, so it is the easiest way to
		// reach a state there used to be no way out of: with nothing pending, the
		// per-card buttons were gone and `decideAll` only ever touched pending.
		await fireEvent.click(screen.getByRole('button', { name: 'Undo all' }));
		expect(await screen.findByRole('button', { name: 'Save 0 edits' })).toHaveProperty(
			'disabled',
			true
		);
		expect(Object.values(pageStore.suggestions).every((s) => s.status === 'pending')).toBe(true);
		// Nothing was written on the way through.
		expect(page.title).toBe('About vector control');
		expect(saveInlineEdit).not.toHaveBeenCalled();

		// And one card on its own.
		await fireEvent.click(screen.getAllByRole('button', { name: 'Accept' })[0]);
		await screen.findByRole('button', { name: 'Save 1 edit' });
		await fireEvent.click(screen.getByRole('button', { name: 'Undo accepting this rewrite' }));
		expect(await screen.findByRole('button', { name: 'Save 0 edits' })).toHaveProperty(
			'disabled',
			true
		);
	});

	it('offers no undo on an errored card, which has nothing to go back to', async () => {
		const page = fixture();
		page.title = 'x'.repeat(20_001);
		pageStore.selectedFieldIds = ['title'];
		render(FieldsPanel, { props: { pageData: page } });

		await fireEvent.click(screen.getByRole('button', { name: 'Plain language' }));
		await screen.findByRole('alert');

		expect(screen.queryByRole('button', { name: /^Undo/ })).toBeNull();
	});

	it('keeps an accepted suggestion whose edit did not persist', async () => {
		const page = fixture();
		const fieldId = 'sections.how-to-report.paragraphs.0';
		pageStore.selectedFieldIds = [fieldId];
		pageStore.suggestions = {
			[fieldId]: {
				pageId: 'topic-x--about',
				original: 'First paragraph.',
				suggested: 'Rewritten paragraph.',
				status: 'accepted'
			}
		};
		saveInlineEdit.mockResolvedValue(false);
		render(FieldsPanel, { props: { pageData: page, livePageId: 'live-1' } });

		await fireEvent.click(screen.getByRole('button', { name: 'Save 1 edit' }));

		// The corpus is not touched and the card is still there to retry. Before
		// `saveInlineEdit` returned a boolean this dropped the card and wrote the
		// rewrite in anyway, so the panel showed a save the database never had.
		await screen.findByText(/still here to retry/);
		expect(page.sections[0].paragraphs[0]).toBe('First paragraph.');
		expect(pageStore.suggestions[fieldId]?.status).toBe('accepted');
	});

	it('will not save a suggestion accepted for a different page', async () => {
		const page = fixture();
		pageStore.selectedFieldIds = [];
		pageStore.suggestions = {
			// `title` names a live field on every page in the corpus, so an id alone
			// cannot say which page it belongs to.
			title: {
				pageId: 'some-other-page',
				original: 'Elsewhere.',
				suggested: 'Rewritten elsewhere.',
				status: 'accepted'
			}
		};
		render(FieldsPanel, { props: { pageData: page, livePageId: 'live-1' } });

		expect(screen.getByRole('button', { name: 'Save 0 edits' })).toHaveProperty('disabled', true);
		await screen.findByText(/on other pages/);
		expect(saveInlineEdit).not.toHaveBeenCalled();
		expect(page.title).toBe('About vector control');
	});
});
