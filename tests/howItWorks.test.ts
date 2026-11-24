/**
 * @vitest-environment jsdom
 *
 * `How it works` is a disclosure, and its DEFAULT state is the behaviour worth
 * pinning. The page decides it and passes `startOpen`: open for a signed-out
 * visitor and for a reviewer who has decided nothing yet, closed for a
 * returning reviewer, and `undefined` -- closed -- until that is known, so the
 * returning case never flashes open and collapses.
 *
 * All four steps stay in the DOM either way -- a `<details>` hides its content
 * visually but keeps it findable by in-page search, which is the reason for
 * using the native element rather than mounting the list conditionally.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';

const { default: HowItWorks } = await import('../src/lib/components/landing/HowItWorks.svelte');
const panel = () => document.querySelector('details');

describe('HowItWorks', () => {
	it('is closed while it is not yet known who is looking', () => {
		render(HowItWorks, { startOpen: undefined });
		expect(panel()?.open).toBe(false);
	});

	it('is closed for a returning reviewer', () => {
		render(HowItWorks, { startOpen: false });
		expect(panel()?.open).toBe(false);
	});

	it('is open for a newcomer', () => {
		render(HowItWorks, { startOpen: true });
		expect(panel()?.open).toBe(true);
	});

	it('settles once, so a later change does not reopen it under the reader', async () => {
		const view = render(HowItWorks, { startOpen: undefined });
		await view.rerender({ startOpen: false });
		expect(panel()?.open).toBe(false);
		await view.rerender({ startOpen: true });
		expect(panel()?.open).toBe(false);
	});

	it('keeps every step in the DOM when collapsed', () => {
		render(HowItWorks, { startOpen: false });
		expect(panel()?.open).toBe(false);
		expect(screen.getAllByRole('listitem')).toHaveLength(4);
		expect(screen.getByText(/Record a decision/)).toBeTruthy();
	});

	it('names the disclosure with the heading, which stays a heading', () => {
		render(HowItWorks, { startOpen: undefined });
		const heading = screen.getByRole('heading', { level: 2, name: 'How it works' });
		expect(heading).toBeTruthy();
		expect(heading.closest('summary')).not.toBeNull();
	});
});
