/**
 * Batch C: a component Karl cannot build on the page's type gets an amber
 * notice beside it in the mockup. The rule comes from componentSupport; these
 * pin when the notice appears, that it is inert, and where it lands on the
 * real corpus.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import KarlOrphanNotice from '../src/lib/components/KarlOrphanNotice.svelte';
import Page from '../src/lib/components/Page.svelte';
import { pageStore } from '../src/lib/stores/pageData.svelte';

beforeEach(() => pageStore.enterPage(undefined));

const notices = (c: HTMLElement) =>
	[...c.querySelectorAll<HTMLElement>('[data-karl-orphan]')].map((el) => el.dataset.karlOrphan);

describe('KarlOrphanNotice', () => {
	it('shows for a type Karl does not offer the component on', () => {
		const { container } = render(KarlOrphanNotice, { component: 'callout', pageType: 'Campaign' });
		expect(container.textContent).toContain('No Karl Callout on this Campaign page.');
		expect(container.textContent).toContain('body copy instead');
		expect(container.textContent).toContain('Components › Callout');
	});

	it('is inert: no link, nothing focusable', () => {
		const { container } = render(KarlOrphanNotice, { component: 'callout', pageType: 'Report' });
		expect(notices(container)).toEqual(['callout']);
		expect(container.querySelector('a[href], button, [tabindex]')).toBeNull();
	});

	it.each([
		['callout', 'Transaction'], // yes
		['resources', 'Agency'], // unknown
		['callout', undefined] // no page on screen
	] as const)('shows nothing for %s on %s', (component, pageType) => {
		const { container } = render(KarlOrphanNotice, { component, pageType });
		expect(notices(container)).toEqual([]);
	});
});

describe('CardsBlock', () => {
	const cards = [{ title: 'A card' }];
	const page = {
		id: 'batch-c-cards',
		type: 'Information',
		title: 'Cards',
		sections: [
			{ heading: 'Res', fieldKey: 'res', component: 'resources', cards },
			{ heading: 'Svc', fieldKey: 'svc', component: 'services', cards },
			{ heading: 'Plain', fieldKey: 'plain', cards },
			// No fieldKey: Section keys it `section-3`, and so must the lookup.
			{ heading: 'Res2', component: 'resources', cards }
		]
	};

	it('flags only resources card sets, once each, above the cards', () => {
		pageStore.addPage(page as never);
		try {
			pageStore.enterPage(page.id);
			const { container } = render(Page, { page });
			expect(notices(container)).toEqual(['resources', 'resources']);
			for (const el of container.querySelectorAll('[data-karl-orphan]')) {
				expect(el.nextElementSibling?.classList.contains('cards-block')).toBe(true);
			}
		} finally {
			// The store is a singleton; the corpus test below walks its pages.
			pageStore.pages = pageStore.pages.filter((p) => p.id !== page.id);
		}
	});
});

describe('the corpus', () => {
	it('flags exactly the expected pages', () => {
		const found: Record<string, string[]> = {};
		for (const p of pageStore.pages) {
			pageStore.enterPage(p.id);
			const { container, unmount } = render(Page, { page: p });
			const n = notices(container);
			if (n.length) found[p.id] = n as string[];
			unmount();
		}
		expect(found).toEqual({
			'mosquito-education-workshop': ['callout', 'callout'],
			'integrated-pest-management-education': ['callout', 'callout'],
			'report-health-code-article-11-plain-language': ['callout'],
			'information-integrated-pest-management-for-property-owners-and-managers': ['resources']
		});
	});
});
