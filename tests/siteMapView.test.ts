/**
 * @vitest-environment jsdom
 *
 * The site map's filter lives under a window-level Escape handler (the review
 * layout) that closes the whole view. Escape in the filter must clear the
 * query first and only leave the view when there is nothing left to clear --
 * the same layering as FieldsPanel and the landing page.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

const { default: SiteMapView } = await import('../src/lib/components/workspace/SiteMapView.svelte');

describe('SiteMapView filter', () => {
	it('clears a non-empty query on Escape and prevents the event reaching the window handler', async () => {
		render(SiteMapView, { onExit: vi.fn() });
		const input = screen.getByRole('searchbox') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'bed bugs' } });
		expect(input.value).toBe('bed bugs');

		const event = new KeyboardEvent('keydown', {
			key: 'Escape',
			bubbles: true,
			cancelable: true
		});
		input.dispatchEvent(event);
		await Promise.resolve();

		expect(event.defaultPrevented).toBe(true);
		expect(input.value).toBe('');
	});

	it('lets Escape on an empty query propagate so the site map can close', () => {
		render(SiteMapView, { onExit: vi.fn() });
		const input = screen.getByRole('searchbox') as HTMLInputElement;

		const event = new KeyboardEvent('keydown', {
			key: 'Escape',
			bubbles: true,
			cancelable: true
		});
		input.dispatchEvent(event);

		expect(event.defaultPrevented).toBe(false);
	});
});
