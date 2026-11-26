import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Page from '../src/lib/components/Page.svelte';
import { pageStore } from '../src/lib/stores/pageData.svelte';

/**
 * The corpus marks three "View Article 11" buttons `buttonStyle: 'secondary'`.
 * ButtonBlock ignored it, so every button drew as primary.
 */
describe('section buttonStyle', () => {
	const variants = (id: string) => {
		const page = pageStore.pages.find((p) => p.id === id)!;
		const { container, unmount } = render(Page, { page });
		const found = [...container.querySelectorAll<HTMLElement>('.button-block')].map(
			(el) => `${el.dataset.variant}: ${el.querySelector('.button-block-cta')?.textContent?.trim()}`
		);
		unmount();
		return found;
	};

	it('draws the secondary button secondary and the rest primary', () => {
		const found = variants('report-cockroaches-or-other-insects');
		expect(found).toContain('secondary: View Article 11');
		expect(found.filter((v) => v.startsWith('secondary'))).toEqual(['secondary: View Article 11']);
		expect(found.some((v) => v.startsWith('primary'))).toBe(true);
	});
});
