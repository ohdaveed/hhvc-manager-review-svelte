/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import AnalysisPanel from '../src/lib/components/workspace/AnalysisPanel.svelte';
import { pageStore } from '../src/lib/stores/pageData.svelte.js';

vi.mock('$lib/supabase', () => ({ ensureDevSession: async () => {}, supabase: {} }));

const { pagesStore, editsStore } = await import('../src/lib/stores/reviewState.js');

const PAGE_ID = 'report-rats-or-mice';

const shownPage = () => ({
	id: PAGE_ID,
	slug: 'sf.gov/report-rats-or-mice',
	type: 'Information',
	title: 'Report rats or mice',
	summary:
		'See [CDC guidance](https://www.cdc.gov/rodents/index.html) or [SF.gov housing](https://sf.gov/housing).',
	sections: [
		{
			fieldKey: 'report-online',
			heading: 'Report online',
			paragraphs: [
				'Use the online form to tell us where you saw the infestation in your building.'
			],
			button: 'Report online',
			buttonUrl: 'https://sf311.org/report'
		}
	]
});

describe('AnalysisPanel', () => {
	beforeEach(() => {
		pageStore.highlight = null;
		editsStore.set([]);
		pagesStore.set([
			{
				id: 'row-1',
				review_id: 'r1',
				path: PAGE_ID,
				status: 'needs-review',
				manager_notes: null,
				page_checks: null
			},
			{
				id: 'row-2',
				review_id: 'r1',
				path: 'pay-your-annual-healthy-housing-fee-apartment-buildings',
				status: 'needs-review',
				manager_notes: null,
				page_checks: null
			}
		]);
	});

	it('renders Reading Level with Highlight on page trigger', async () => {
		render(AnalysisPanel, { pageData: shownPage() });
		expect(screen.getByRole('heading', { name: 'Reading Level' })).toBeTruthy();
		expect(screen.getByText(/^Grade \d/)).toBeTruthy();

		await fireEvent.click(screen.getByRole('button', { name: 'Highlight on page' }));
		expect(pageStore.highlight).toMatchObject({ kind: 'readability', target: 'page' });
	});

	it('lists Link Targets, filters by All / External / Internal, and inspects a link', async () => {
		render(AnalysisPanel, { pageData: shownPage() });
		expect(screen.getByRole('heading', { name: 'Link Targets' })).toBeTruthy();
		expect(screen.getByText('3 checked · 2 external')).toBeTruthy();

		await fireEvent.click(screen.getByRole('button', { name: /External/i }));
		expect(screen.getByText('cdc.gov/rodents/index.html')).toBeTruthy();
		expect(screen.queryByText('sf.gov/housing')).toBeNull();

		await fireEvent.click(screen.getByRole('button', { name: /Internal/i }));
		expect(screen.getByText('sf.gov/housing')).toBeTruthy();
		expect(screen.queryByText('cdc.gov/rodents/index.html')).toBeNull();

		await fireEvent.click(screen.getByRole('button', { name: 'Inspect sf.gov/housing' }));
		expect(pageStore.highlight).toMatchObject({ kind: 'link', target: 'summary' });
	});

	it('renders the Next undecided page footer link when another undecided page exists', () => {
		render(AnalysisPanel, { pageData: shownPage() });
		const link = screen.getByRole('link', { name: /Next undecided page/i });
		expect(link.getAttribute('href')).toContain('/review/');
	});
});
