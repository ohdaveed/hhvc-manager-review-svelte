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
		pageStore.agentRec = { state: 'idle', text: '' };
		requestGeneration.mockReset();
		saveInlineEdit.mockReset();
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
			title: { original: 'a', suggested: 'b', status: 'pending' },
			summary: { original: 'c', suggested: 'd', status: 'pending' }
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
			[fieldId]: { original: 'Unsourced claim.', suggested: 'Clearer claim.', status: 'accepted' }
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
});
