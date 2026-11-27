/**
 * @vitest-environment jsdom
 *
 * The Analysis panel judges the copy as shown: what the mockup beside it
 * displays, the reviewer's unsaved changes included. It used to lay the saved
 * edits back over the page it was handed -- a page that already carried them,
 * and the typing on top -- so while a reviewer typed into a field with a saved
 * edit, Analysis judged the saved wording and the Karl outline judged the
 * typing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import AnalysisPanel from '../src/lib/components/workspace/AnalysisPanel.svelte';
import { extractCopy } from '../src/lib/corpus/fields';

vi.mock('$lib/supabase', () => ({ ensureDevSession: async () => {}, supabase: {} }));

const { pagesStore, editsStore } = await import('../src/lib/stores/reviewState.js');

const PAGE_ID = 'report-rats-or-mice';

/** A page as the mockup shows it: the reviewer has typed a vague button label. */
const shownPage = () => ({
	id: PAGE_ID,
	slug: 'sf.gov/report-rats-or-mice',
	type: 'Information',
	title: 'Report rats or mice',
	summary: 'Tell us about rats or mice in your building.',
	sections: [
		{
			heading: 'Report online',
			paragraphs: ['Use the online form to tell us where you saw them.'],
			button: 'Click here',
			buttonUrl: 'https://sf.gov/report'
		}
	]
});

describe('AnalysisPanel', () => {
	beforeEach(() => {
		const buttonField = Object.keys(extractCopy(shownPage() as never)).find((k) =>
			k.endsWith('.button')
		)!;
		pagesStore.set([
			{
				id: 'row-1',
				review_id: 'r1',
				path: PAGE_ID,
				status: 'needs-review',
				manager_notes: null,
				page_checks: null
			}
		]);
		// The saved wording, which the unsaved typing replaces on screen.
		editsStore.set([
			{
				id: 'e1',
				page_id: 'row-1',
				field_id: buttonField,
				new_content: 'Report rats online',
				created_at: '2026-11-26T00:00:00Z'
			}
		]);
	});

	it('flags a vague button label (control: no saved edit on the field)', () => {
		editsStore.set([]);
		render(AnalysisPanel, { pageData: shownPage() });
		expect(screen.getAllByText(/Click here/).length).toBeGreaterThan(0);
	});

	it('judges the copy as shown, not the saved edit under the typing', () => {
		render(AnalysisPanel, { pageData: shownPage() });
		expect(screen.getAllByText(/Click here/).length).toBeGreaterThan(0);
	});
});
