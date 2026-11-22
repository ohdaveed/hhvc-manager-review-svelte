/**
 * @vitest-environment jsdom
 *
 * Partner agencies, Related and Contact us are judged by their field ids:
 * `extractCopy` emits `partnerAgencies.<i>.*`, `sections.<key>.cards.<i>.*`
 * and `contact.<channel>.<i>`, and `corpus.lock` hashes that set. A renderer
 * whose `data-rewrite-field` drifts from it saves edits under a key nothing
 * reads. They are also mockup furniture, so nothing may render as a live
 * `<a href>`, signed in or out.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import Page from '../src/lib/components/Page.svelte';
import LinkGrid from '../src/lib/components/blocks/LinkGrid.svelte';
import ContactSection from '../src/lib/components/blocks/ContactSection.svelte';
import { pageStore } from '../src/lib/stores/pageData.svelte.js';
import { sessionStore } from '../src/lib/stores/session.svelte.js';
import { extractCopy } from '../src/lib/corpus/fields.js';
import { deriveFieldKey } from '../src/lib/corpus/fieldKey.js';

const fixture = {
	id: 'topic-x--about',
	title: 'Healthy housing',
	sections: [
		{
			heading: 'Related',
			component: 'related',
			fieldKey: deriveFieldKey({ heading: 'Related' }, 0),
			cards: [
				{ title: 'Report rats', target: 'report-rats' },
				{ title: 'Report insects', target: 'report-insects' },
				{ title: 'Pay your fee', target: 'pay', text: 'A description' }
			]
		}
	],
	partnerAgencies: [
		{ title: '311 Customer Service Center', url: 'https://www.sf.gov/departments--311' },
		{ title: 'Environmental Health', url: 'https://www.sf.gov/departments--eh' }
	],
	contact: {
		phone: ['311 (call or text)', '415-252-3800'],
		email: ['healthyhousing@sf.gov'],
		other: ['Environmental Health — Healthy Housing and Vector Control']
	}
};

const OWNED = /^(partnerAgencies\.|contact\.|sections\.[^.]+\.cards\.)/;

const renderedIds = (container: HTMLElement) =>
	[...container.querySelectorAll('[data-rewrite-field]')]
		.map((n) => n.getAttribute('data-rewrite-field') ?? '')
		.filter((id) => OWNED.test(id))
		.sort();

beforeEach(() => {
	pageStore.clearSelection();
});

describe.each([
	['signed in', true],
	['signed out', false]
])('Partner agencies, Related, Contact us (%s)', (_, signedIn) => {
	beforeEach(() => {
		sessionStore.signedIn = signedIn;
	});

	it('emits exactly the field ids extractCopy produces', () => {
		const { container } = render(Page, { props: { page: structuredClone(fixture) } });
		const expected = Object.keys(extractCopy(structuredClone(fixture)))
			.filter((id) => OWNED.test(id))
			.sort();

		expect(expected.length).toBe(12);
		expect(renderedIds(container)).toEqual(expected);
	});

	it('renders no live anchors', () => {
		const { container } = render(Page, { props: { page: structuredClone(fixture) } });
		expect(container.querySelectorAll('a[href]')).toHaveLength(0);
	});

	it('renders Related as a link grid, not cards', () => {
		const { container } = render(Page, { props: { page: structuredClone(fixture) } });
		expect(container.querySelector('.cards-block')).toBeNull();
		expect(container.querySelectorAll('.link-grid .cols-3 .link-grid-cell')).toHaveLength(3);
		expect(container.querySelectorAll('.link-grid .cols-2 .link-grid-cell')).toHaveLength(2);
	});
});

describe('empty or absent data renders nothing', () => {
	it.each([undefined, []])('LinkGrid with items=%j', (items) => {
		const { container } = render(LinkGrid, {
			props: {
				items,
				fieldPrefix: 'partnerAgencies',
				label: 'Partner agency',
				heading: 'Partner agencies'
			}
		});
		expect(container.textContent?.trim()).toBe('');
	});

	it.each([undefined, {}, { phone: [], email: [], other: [] }, { phone: [42] }])(
		'ContactSection with contact=%j',
		(contact) => {
			const { container } = render(ContactSection, { props: { contact } });
			expect(container.textContent?.trim()).toBe('');
		}
	);

	it('ContactSection renders only the channels that exist', () => {
		const { container } = render(ContactSection, {
			props: { contact: { email: ['healthyhousing@sf.gov'] } }
		});
		const channels = [...container.querySelectorAll('[data-channel]')].map((n) =>
			n.getAttribute('data-channel')
		);
		expect(channels).toEqual(['email']);
	});

	it('a page with neither block renders no partner agencies or contact heading', () => {
		const { container } = render(Page, {
			props: { page: { id: 'x', title: 'Bare', sections: [] } }
		});
		expect(container.querySelector('.link-grid')).toBeNull();
		expect(container.querySelector('.contact-section')).toBeNull();
	});
});
