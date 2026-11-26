import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Page from '../src/lib/components/Page.svelte';
import { toStorePage } from '../src/lib/stores/pageData.svelte';
import { gapPages } from '../src/lib/karl/gapFixtures';

/**
 * The corpus used to mark its "View Article 11" buttons `buttonStyle: 'secondary'`,
 * and ButtonBlock ignored it, so every button drew as primary. Those buttons are
 * now inline links (a Transaction custom_section has no Button link block), so
 * the corpus no longer carries the style; the rats-report gap fixture puts one
 * back so the renderer stays covered.
 */
describe('section buttonStyle', () => {
	const variants = (page: object) => {
		const { container, unmount } = render(Page, { page: toStorePage(page) });
		const found = [...container.querySelectorAll<HTMLElement>('.button-block')].map(
			(el) => `${el.dataset.variant}: ${el.querySelector('.button-block-cta')?.textContent?.trim()}`
		);
		unmount();
		return found;
	};

	it('draws the secondary button secondary and the rest primary', () => {
		const found = variants(gapPages.rodentsReport);
		expect(found).toContain('secondary: View Article 11');
		expect(found.filter((v) => v.startsWith('secondary'))).toEqual(['secondary: View Article 11']);
		expect(found.some((v) => v.startsWith('primary'))).toBe(true);
	});
});
