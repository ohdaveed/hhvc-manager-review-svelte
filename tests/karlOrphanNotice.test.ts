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

	it('words a Related card by what it links to', () => {
		const { container } = render(KarlOrphanNotice, {
			component: 'related',
			pageType: 'Resource Collection'
		});
		expect(container.textContent).toContain(
			'Karl’s Related section cannot link to a Resource Collection page.'
		);
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
	// 20s, not vitest's default 5s. This test mounts `Page.svelte` once per
	// corpus page -- 39 today, 29 when it was written -- so its cost grows with
	// the corpus while the default does not. Run alone the body takes ~1s; under
	// lefthook's pre-commit, where `verify` runs the suite beside eslint, knip
	// and a production build, it has been measured at 5.6s, 5.8s, 6.4s, 6.8s and
	// 7.1s, failing each time and passing on retry. A gate that fails on how busy
	// the machine is teaches people to re-run rather than to read it.
	//
	// Raised here rather than as a global `testTimeout` on purpose: this is the
	// one test whose work scales with content, and every other test keeps the
	// strict default, where a 5s unit test is a genuine problem worth reporting
	// fast. If a second corpus-wide render test appears, give it its own value
	// rather than loosening the default for all 750.
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
			'integrated-pest-management-education': ['callout', 'callout', 'related'],
			'report-health-code-article-11-plain-language': ['callout'],
			'information-integrated-pest-management-for-property-owners-and-managers': [
				'resources',
				'related',
				'contact'
			],
			'information--article-11-compliance-for-property-owners': ['related', 'contact']
		});
	}, 20_000);
});
