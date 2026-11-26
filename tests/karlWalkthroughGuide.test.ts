/**
 * @vitest-environment jsdom
 *
 * The landing page's pointer to the Karl walkthrough. It is a disclosure that
 * starts open once a page is approved and closed until then, so five steps for
 * a job the reviewer cannot do yet do not push All pages down the screen. What
 * closes it depends on the review: a direct walkthrough link per approved page,
 * a nudge when there are none, nothing while no review is loaded.
 */
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';

const { default: KarlWalkthroughGuide } =
	await import('../src/lib/components/landing/KarlWalkthroughGuide.svelte');

const pages = (n: number) =>
	Array.from({ length: n }, (_, i) => ({ path: `page-${i}`, title: `Page ${i}` }));

describe('KarlWalkthroughGuide', () => {
	it('is a named section that names the toolbar button it points at', () => {
		render(KarlWalkthroughGuide, { approved: undefined, onShowApproved: () => {} });
		expect(screen.getByRole('heading', { level: 2, name: 'Move a page into Karl' })).toBeTruthy();
		expect(screen.getByRole('region', { name: 'Move a page into Karl' })).toBeTruthy();
		expect(screen.getByText('Karl walkthrough')).toBeTruthy();
	});

	it('says nothing about approved pages while no review is loaded', () => {
		render(KarlWalkthroughGuide, { approved: undefined, onShowApproved: () => {} });
		expect(screen.queryByRole('link')).toBeNull();
		expect(screen.queryByText(/approved yet/)).toBeNull();
	});

	it('deep-links each approved page straight into its walkthrough', () => {
		render(KarlWalkthroughGuide, {
			approved: [
				{ path: 'report-rats-or-mice', title: 'Report rats or mice' },
				{ path: 'draft:abc', title: 'A drafted page' }
			],
			onShowApproved: () => {}
		});
		const rats = screen.getByRole('link', { name: 'Open walkthrough: Report rats or mice' });
		expect(rats.getAttribute('href')).toMatch(/\/review\/report-rats-or-mice\?view=walkthrough$/);
		// Through reviewHrefFor, so a draft goes to its own route, not /review/draft:abc.
		const draft = screen.getByRole('link', { name: /A drafted page/ });
		expect(draft.getAttribute('href')).toMatch(/\/review\/draft\/abc\?view=walkthrough$/);
	});

	it('links at most five, and offers the filtered list for the rest', async () => {
		const onShowApproved = vi.fn();
		render(KarlWalkthroughGuide, { approved: pages(7), onShowApproved });
		expect(screen.getAllByRole('link')).toHaveLength(5);
		await fireEvent.click(screen.getByRole('button', { name: 'Show all 7 approved pages' }));
		expect(onShowApproved).toHaveBeenCalledOnce();
	});

	it('has no "show all" when every approved page is already linked', () => {
		render(KarlWalkthroughGuide, { approved: pages(2), onShowApproved: () => {} });
		expect(screen.getAllByRole('link')).toHaveLength(2);
		expect(screen.queryByRole('button')).toBeNull();
	});

	const details = () => document.querySelector('details') as HTMLDetailsElement;

	it('starts closed while nothing is approved, keeping its name', () => {
		render(KarlWalkthroughGuide, { approved: [], onShowApproved: () => {} });
		expect(details().open).toBe(false);
		expect(screen.getByRole('region', { name: 'Move a page into Karl' })).toBeTruthy();
	});

	it('starts closed while no review is loaded', () => {
		render(KarlWalkthroughGuide, { approved: undefined, onShowApproved: () => {} });
		expect(details().open).toBe(false);
	});

	it('starts open once there is a page to move', () => {
		render(KarlWalkthroughGuide, { approved: pages(1), onShowApproved: () => {} });
		expect(details().open).toBe(true);
	});

	it('nudges instead when nothing is approved', () => {
		render(KarlWalkthroughGuide, { approved: [], onShowApproved: () => {} });
		expect(screen.queryByRole('link')).toBeNull();
		expect(screen.getByText(/No page is approved yet/)).toBeTruthy();
	});
});
