/**
 * @vitest-environment jsdom
 *
 * The Fields tab is where a rewrite becomes a saved edit, so the things worth
 * pinning are the ones that lose a reviewer's work when they drift:
 *
 *  - `Save N changes` counts UNSAVED CHANGES, typed or accepted, not selected
 *    fields. They look alike and are routinely different numbers.
 *  - Accepting puts the rewrite on the mockup at once; Undo takes it off.
 *  - Saving writes through `resolveField`, so the corpus actually changes.
 *  - A selected field with no confirmed source raises the unverified callout.
 *
 * `$lib/ai/generate` and `$lib/stores/reviewState` are mocked, which also keeps
 * `$lib/supabase` -- a `createClient` at module scope -- out of the run.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import FieldsPanel from '../src/lib/components/workspace/FieldsPanel.svelte';
import { pageStore, changeKey } from '../src/lib/stores/pageData.svelte.js';

const requestGeneration = vi.fn();
const saveInlineEdit = vi.fn();

vi.mock('$lib/ai/generate', () => ({ requestGeneration: (p: unknown) => requestGeneration(p) }));
vi.mock('$lib/stores/reviewState', () => ({
	saveInlineEdit: (...args: unknown[]) => saveInlineEdit(...args)
}));
const session = vi.hoisted(() => ({ knownSignedOut: false }));
vi.mock('$lib/stores/session.svelte', () => ({ sessionStore: session }));

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

/**
 * Accepting writes through `pageStore`, which resolves against
 * `pageStore.pages` -- so the fixture is put there, fresh each call, and the
 * panel is handed that same object, as the layout does.
 */
const storePage = (id = 'topic-x--about') => {
	const fresh = { ...fixture(), id };
	const at = pageStore.pages.findIndex((p) => p.id === id);
	if (at < 0) pageStore.addPage(fresh as never);
	else Object.assign(pageStore.pages[at], fresh);
	return pageStore.pages.find((p) => p.id === id) as unknown as ReturnType<typeof fixture>;
};

describe('FieldsPanel', () => {
	beforeEach(() => {
		pageStore.clearSelection();
		// `clearSelection` deliberately KEEPS accepted suggestions -- they are
		// unsaved work, not selection chrome -- so it is not a reset. Without this
		// an accepted card from one test is still in the store for the next.
		pageStore.suggestions = {};
		pageStore.unsavedChanges = {};
		pageStore.agentRec = { state: 'idle', text: '' };
		requestGeneration.mockReset();
		saveInlineEdit.mockReset();
		// The success path. `saveInlineEdit` returns whether the row reached the
		// database, and a bare `vi.fn()` returns undefined -- which the panel now
		// correctly reads as a failed save.
		saveInlineEdit.mockResolvedValue(true);
		session.knownSignedOut = false;
	});

	it('disables Save signed out and says why, even with an accepted change', async () => {
		session.knownSignedOut = true;
		const page = storePage();
		pageStore.selectedFieldIds = ['title'];
		pageStore.suggestions = {
			title: { pageId: 'topic-x--about', original: 'a', suggested: 'b', status: 'pending' }
		};
		render(FieldsPanel, { props: { pageData: page, livePageId: 'live-1' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Accept' }));

		expect(screen.getByRole('button', { name: 'Save 1 change' }).hasAttribute('disabled')).toBe(
			true
		);
		expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/login');
		expect(screen.getByText(/to save changes/)).toBeTruthy();
	});

	it('says what to do when nothing is selected', () => {
		render(FieldsPanel, { props: { pageData: fixture() } });
		expect(screen.getByText('No field selected')).toBeTruthy();
	});

	it('numbers the selection in the order it was picked', () => {
		pageStore.selectedFieldIds = ['summary', 'title'];
		render(FieldsPanel, { props: { pageData: fixture() } });

		const items = screen.getByLabelText('Selected fields').querySelectorAll('li > label');
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

	it('counts unsaved changes in the footer, not selected fields', async () => {
		const page = storePage();
		pageStore.selectedFieldIds = ['title', 'summary'];
		pageStore.suggestions = {
			title: { pageId: 'topic-x--about', original: 'a', suggested: 'b', status: 'pending' },
			summary: { pageId: 'topic-x--about', original: 'c', suggested: 'd', status: 'pending' }
		};
		render(FieldsPanel, { props: { pageData: page } });

		// Two fields selected, two suggestions, none decided.
		expect(screen.getByRole('button', { name: 'Save 0 changes' }).hasAttribute('disabled')).toBe(
			true
		);

		await fireEvent.click(screen.getAllByRole('button', { name: 'Accept' })[0]);

		expect(screen.getByRole('button', { name: 'Save 1 change' })).toBeTruthy();
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

	it('shows an accepted suggestion on the mockup at once, and Save persists it', async () => {
		const page = storePage();
		const fieldId = 'sections.how-to-report.paragraphs.0';
		pageStore.selectedFieldIds = [fieldId];
		pageStore.suggestions = {
			[fieldId]: {
				pageId: 'topic-x--about',
				original: 'First paragraph.',
				suggested: 'Rewritten paragraph.',
				status: 'pending'
			}
		};
		render(FieldsPanel, { props: { pageData: page, livePageId: 'live-1' } });

		await fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
		// Accepting makes it an unsaved change: on the mockup, not yet recorded.
		expect(page.sections[0].paragraphs[0]).toBe('Rewritten paragraph.');
		expect(saveInlineEdit).not.toHaveBeenCalled();

		await fireEvent.click(screen.getByRole('button', { name: 'Save 1 change' }));

		await vi.waitFor(() =>
			expect(saveInlineEdit).toHaveBeenCalledWith('live-1', fieldId, 'Rewritten paragraph.')
		);
		// Saved work leaves the panel: the footer count is unsaved work.
		await vi.waitFor(() => expect(pageStore.suggestions[fieldId]).toBeUndefined());
		expect(pageStore.getChange('topic-x--about', fieldId)).toBeUndefined();
		expect(page.sections[0].paragraphs[0]).toBe('Rewritten paragraph.');
	});

	it('keeps an entry that carries an unverified flag in that shape when saving', async () => {
		const page = storePage();
		const fieldId = 'sections.how-to-report.paragraphs.1';
		pageStore.selectedFieldIds = [fieldId];
		pageStore.suggestions = {
			[fieldId]: {
				pageId: 'topic-x--about',
				original: 'Unsourced claim.',
				suggested: 'Clearer claim.',
				status: 'pending'
			}
		};
		render(FieldsPanel, { props: { pageData: page, livePageId: 'live-1' } });

		await fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Save 1 change' }));

		// A reviewer rewording the copy has not thereby verified it.
		await vi.waitFor(() => expect(saveInlineEdit).toHaveBeenCalled());
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
		const page = storePage();
		pageStore.selectedFieldIds = ['title', 'summary'];
		requestGeneration.mockResolvedValue({ result: { rewrittenText: 'Rewritten.' } });
		render(FieldsPanel, { props: { pageData: page, livePageId: 'live-1' } });

		await fireEvent.click(screen.getByRole('button', { name: 'Plain language' }));
		await screen.findByRole('button', { name: 'Accept all' });

		await fireEvent.click(screen.getByRole('button', { name: 'Accept all' }));
		await screen.findByRole('button', { name: 'Save 2 changes' });
		expect(page.title).toBe('Rewritten.');

		// `Accept all` decides every card at once, so it is the easiest way to
		// reach a state there used to be no way out of: with nothing pending, the
		// per-card buttons were gone and `decideAll` only ever touched pending.
		await fireEvent.click(screen.getByRole('button', { name: 'Undo all' }));
		expect(await screen.findByRole('button', { name: 'Save 0 changes' })).toHaveProperty(
			'disabled',
			true
		);
		expect(Object.values(pageStore.suggestions).every((s) => s.status === 'pending')).toBe(true);
		// Undo takes the rewrite back off the mockup, and nothing was recorded.
		expect(page.title).toBe('About vector control');
		expect(saveInlineEdit).not.toHaveBeenCalled();

		// And one card on its own.
		await fireEvent.click(screen.getAllByRole('button', { name: 'Accept' })[0]);
		await screen.findByRole('button', { name: 'Save 1 change' });
		await fireEvent.click(screen.getByRole('button', { name: 'Undo accepting this rewrite' }));
		expect(await screen.findByRole('button', { name: 'Save 0 changes' })).toHaveProperty(
			'disabled',
			true
		);
		expect(page.title).toBe('About vector control');
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
		const page = storePage();
		const fieldId = 'sections.how-to-report.paragraphs.0';
		pageStore.selectedFieldIds = [fieldId];
		pageStore.suggestions = {
			[fieldId]: {
				pageId: 'topic-x--about',
				original: 'First paragraph.',
				suggested: 'Rewritten paragraph.',
				status: 'pending'
			}
		};
		saveInlineEdit.mockResolvedValue(false);
		render(FieldsPanel, { props: { pageData: page, livePageId: 'live-1' } });

		await fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Save 1 change' }));

		// Still an unsaved change, still there to retry. Before `saveInlineEdit`
		// returned a boolean a failed save dropped the card as if it had landed.
		await screen.findByText(/1 change could not be saved/);
		expect(pageStore.suggestions[fieldId]?.status).toBe('accepted');
		expect(pageStore.hasUnsavedChange('topic-x--about', fieldId)).toBe(true);
		expect(screen.getByRole('button', { name: 'Save 1 change' })).toBeTruthy();
	});

	it('will not save an unsaved change that belongs to a different page', async () => {
		const page = storePage();
		pageStore.selectedFieldIds = [];
		// `title` names a live field on every page in the corpus, so a field id
		// alone cannot say which page a change belongs to.
		pageStore.unsavedChanges = {
			[changeKey('some-other-page', 'title')]: {
				pageId: 'some-other-page',
				fieldId: 'title',
				original: 'Elsewhere.',
				value: 'Rewritten elsewhere.'
			}
		};
		render(FieldsPanel, { props: { pageData: page, livePageId: 'live-1' } });

		expect(screen.getByRole('button', { name: 'Save 0 changes' })).toHaveProperty('disabled', true);
		await screen.findByText(/waiting on other pages/);
		expect(saveInlineEdit).not.toHaveBeenCalled();
		expect(page.title).toBe('About vector control');
	});
});

/**
 * Typing into a selected field edits the mockup copy directly. The change lives
 * in `pageStore`, which resolves against `pageStore.pages` -- so the fixture is
 * added there, and the panel is handed that same object, as the layout does.
 */
describe('FieldsPanel manual edits', () => {
	const PAGE_ID = 'manual-edit--fixture';
	const livePage = () => {
		let page = pageStore.pages.find((p) => p.id === PAGE_ID);
		if (!page) {
			pageStore.addPage({ ...fixture(), id: PAGE_ID } as never);
			page = pageStore.pages.find((p) => p.id === PAGE_ID)!;
		}
		page.title = 'About vector control';
		return page;
	};

	beforeEach(() => {
		pageStore.clearSelection();
		pageStore.suggestions = {};
		pageStore.unsavedChanges = {};
		saveInlineEdit.mockReset();
		saveInlineEdit.mockResolvedValue(true);
		session.knownSignedOut = false;
	});

	const renderTitle = (livePageId: string | null = 'live-1') => {
		const page = livePage();
		pageStore.selectedFieldIds = ['title'];
		render(FieldsPanel, { props: { pageData: page, livePageId: livePageId ?? undefined } });
		return { page, input: screen.getByRole('textbox', { name: /Title$/ }) as HTMLTextAreaElement };
	};

	it('shows the current copy in a labelled control', () => {
		const { input } = renderTitle();
		expect(input.value).toBe('About vector control');
		expect(screen.queryByRole('button', { name: /Save the edit/ })).toBeNull();
	});

	it('writes each keystroke to the mockup copy', async () => {
		const { page, input } = renderTitle();
		await fireEvent.input(input, { target: { value: 'About pest control' } });
		expect(page.title).toBe('About pest control');
		expect(saveInlineEdit).not.toHaveBeenCalled();
		expect(screen.getByRole('button', { name: 'Save the change to Title' })).toBeTruthy();
	});

	it('Cancel puts the original copy back', async () => {
		const { page, input } = renderTitle();
		await fireEvent.input(input, { target: { value: 'Changed' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Cancel the change to Title' }));
		expect(page.title).toBe('About vector control');
		expect(pageStore.getChange(PAGE_ID, 'title')).toBeUndefined();
	});

	it('Escape cancels too', async () => {
		const { page, input } = renderTitle();
		await fireEvent.input(input, { target: { value: 'Changed' } });
		await fireEvent.keyDown(input, { key: 'Escape' });
		expect(page.title).toBe('About vector control');
	});

	it('Save persists once, under the field id, and keeps the copy', async () => {
		const { page, input } = renderTitle();
		await fireEvent.input(input, { target: { value: 'Saved title' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Save the change to Title' }));
		await vi.waitFor(() => expect(pageStore.getChange(PAGE_ID, 'title')).toBeUndefined());
		expect(saveInlineEdit).toHaveBeenCalledTimes(1);
		expect(saveInlineEdit).toHaveBeenCalledWith('live-1', 'title', 'Saved title');
		expect(page.title).toBe('Saved title');
	});

	it('a failed save keeps the unsaved change and says so', async () => {
		saveInlineEdit.mockResolvedValue(false);
		const { page, input } = renderTitle();
		await fireEvent.input(input, { target: { value: 'Not saved' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Save the change to Title' }));
		expect(await screen.findByText(/could not be saved/)).toBeTruthy();
		expect(pageStore.getChange(PAGE_ID, 'title')?.value).toBe('Not saved');
		expect(page.title).toBe('Not saved');
	});

	it('does not save with no live review row, and keeps the unsaved change', async () => {
		const { input } = renderTitle(null);
		await fireEvent.input(input, { target: { value: 'Preview only' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Save the change to Title' }));
		expect(saveInlineEdit).not.toHaveBeenCalled();
		expect(screen.getByText(/can only be shown, not saved/)).toBeTruthy();
		expect(pageStore.getChange(PAGE_ID, 'title')?.value).toBe('Preview only');
	});

	it('disables Accept on a suggestion while the field has unsaved typing', async () => {
		pageStore.suggestions = {
			title: { pageId: PAGE_ID, original: 'a', suggested: 'b', status: 'pending' }
		};
		const { input } = renderTitle();
		const accept = screen.getByRole('button', { name: 'Accept' });
		expect(accept.hasAttribute('disabled')).toBe(false);
		await fireEvent.input(input, { target: { value: 'Typed' } });
		expect(accept.hasAttribute('disabled')).toBe(true);
	});

	it('Enter saves rather than adding a line break', async () => {
		const { page, input } = renderTitle();
		await fireEvent.input(input, { target: { value: 'Saved with Enter' } });
		await fireEvent.keyDown(input, { key: 'Enter' });
		await vi.waitFor(() => expect(pageStore.getChange(PAGE_ID, 'title')).toBeUndefined());
		expect(saveInlineEdit).toHaveBeenCalledWith('live-1', 'title', 'Saved with Enter');
		expect(page.title).toBe('Saved with Enter');
	});

	it('Cancel on an accepted suggestion restores the copy and puts the card back to waiting', async () => {
		const { page } = renderTitle();
		pageStore.suggestions = {
			title: {
				pageId: PAGE_ID,
				original: 'About vector control',
				suggested: 'About pests',
				status: 'pending'
			}
		};
		await fireEvent.click(await screen.findByRole('button', { name: 'Accept' }));
		expect(page.title).toBe('About pests');

		await fireEvent.click(screen.getByRole('button', { name: 'Cancel the change to Title' }));

		expect(page.title).toBe('About vector control');
		expect(pageStore.suggestions.title?.status).toBe('pending');
		expect(pageStore.getChange(PAGE_ID, 'title')).toBeUndefined();
	});

	it('an accepted suggestion typed back to the original goes back to waiting', async () => {
		renderTitle();
		pageStore.suggestions = {
			title: {
				pageId: PAGE_ID,
				original: 'About vector control',
				suggested: 'About pests',
				status: 'pending'
			}
		};
		await fireEvent.click(await screen.findByRole('button', { name: 'Accept' }));
		pageStore.setChange(PAGE_ID, 'title', 'About vector control');

		pageStore.select('summary');

		expect(pageStore.getChange(PAGE_ID, 'title')).toBeUndefined();
		expect(pageStore.suggestions.title?.status).toBe('pending');
	});

	it('says when someone else saved the field during the typing, and still saves', async () => {
		const { input } = renderTitle();
		await fireEvent.input(input, { target: { value: 'Mine' } });
		pageStore.stampChangeBases(() => 'row-1');
		pageStore.markSavedElsewhere(PAGE_ID, 'title', 'row-2');

		expect(await screen.findByText(/Someone else saved this field after you started/)).toBeTruthy();
		await fireEvent.click(screen.getByRole('button', { name: 'Save the change to Title' }));
		await vi.waitFor(() => expect(saveInlineEdit).toHaveBeenCalledWith('live-1', 'title', 'Mine'));
	});

	it('turns pasted line breaks into spaces', async () => {
		const { page, input } = renderTitle();
		await fireEvent.input(input, { target: { value: 'Two\n\nlines' } });
		expect(page.title).toBe('Two lines');
		expect(input.value).toBe('Two lines');
	});

	it('keeps typing when the selection moves, and lists it to save or discard', async () => {
		const { page, input } = renderTitle();
		await fireEvent.input(input, { target: { value: 'Parked' } });
		pageStore.select('summary');
		await vi.waitFor(() => expect(screen.getByText('1 unsaved change')).toBeTruthy());
		expect(page.title).toBe('Parked');

		await fireEvent.click(screen.getByRole('button', { name: 'Discard the change to Title' }));
		expect(page.title).toBe('About vector control');
		expect(screen.queryByText('1 unsaved change')).toBeNull();
	});

	it('a parked edit can be saved from the list', async () => {
		const { input } = renderTitle();
		await fireEvent.input(input, { target: { value: 'Parked then saved' } });
		pageStore.select('summary');
		// Wait for the list: until the re-render lands, the Save button on screen
		// is the selected field's own, which the re-render then removes.
		await screen.findByText('1 unsaved change');
		await fireEvent.click(screen.getByRole('button', { name: 'Save the change to Title' }));
		await vi.waitFor(() => expect(pageStore.getChange(PAGE_ID, 'title')).toBeUndefined());
		expect(saveInlineEdit).toHaveBeenCalledWith('live-1', 'title', 'Parked then saved');
	});

	it('a saved edit drops the suggestion it replaced', async () => {
		pageStore.suggestions = {
			title: { pageId: PAGE_ID, original: 'a', suggested: 'b', status: 'pending' }
		};
		const { input } = renderTitle();
		await fireEvent.input(input, { target: { value: 'Mine' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Save the change to Title' }));
		await vi.waitFor(() => expect(pageStore.suggestions.title).toBeUndefined());
	});
});
