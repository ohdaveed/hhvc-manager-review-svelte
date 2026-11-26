/**
 * @vitest-environment jsdom
 *
 * The landing page's pointer to the Karl walkthrough. It is always open (the
 * walkthrough used to be discoverable only by opening a toolbar disclosure),
 * and its closing line depends on the review: a shortcut to the approved
 * pages when there are some, a nudge when there are none, nothing at all
 * while no review is loaded.
 */
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';

const { default: KarlWalkthroughGuide } =
	await import('../src/lib/components/landing/KarlWalkthroughGuide.svelte');

describe('KarlWalkthroughGuide', () => {
	it('is a named section that names the toolbar button it points at', () => {
		render(KarlWalkthroughGuide, { approved: undefined, onShowApproved: () => {} });
		expect(screen.getByRole('heading', { level: 2, name: 'Move a page into Karl' })).toBeTruthy();
		expect(screen.getByRole('region', { name: 'Move a page into Karl' })).toBeTruthy();
		expect(screen.getByText('Karl walkthrough')).toBeTruthy();
		expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(4);
	});

	it('says nothing about approved pages while no review is loaded', () => {
		render(KarlWalkthroughGuide, { approved: undefined, onShowApproved: () => {} });
		expect(screen.queryByRole('button')).toBeNull();
		expect(screen.queryByText(/approved yet/)).toBeNull();
	});

	it('offers a shortcut to the approved pages, and calls back on it', async () => {
		const onShowApproved = vi.fn();
		render(KarlWalkthroughGuide, { approved: 3, onShowApproved });
		const button = screen.getByRole('button', { name: 'Show the 3 approved pages' });
		await fireEvent.click(button);
		expect(onShowApproved).toHaveBeenCalledOnce();
	});

	it('uses the singular for one page', () => {
		render(KarlWalkthroughGuide, { approved: 1, onShowApproved: () => {} });
		expect(screen.getByRole('button', { name: 'Show the 1 approved page' })).toBeTruthy();
	});

	it('nudges instead when nothing is approved', () => {
		render(KarlWalkthroughGuide, { approved: 0, onShowApproved: () => {} });
		expect(screen.queryByRole('button')).toBeNull();
		expect(screen.getByText(/No page is approved yet/)).toBeTruthy();
	});
});
