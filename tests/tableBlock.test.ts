/**
 * @vitest-environment jsdom
 *
 * The table block's contract is its field ids. `extractCopy` emits
 * `sections.<key>.table.<r>.<c>` and `corpus.lock` hashes that set, so if the
 * renderer's `data-rewrite-field` drifts from it, edits still save but land
 * under a key nothing reads -- the same silent failure `inlineEditFieldId`
 * guards for paragraphs and bullets.
 *
 * Row 0 is the header row. That is a property of the corpus, not an assumption
 * of this component: all seven tables in the corpus are uniform and every one
 * has a genuine label row at index 0.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Page from '../src/lib/components/Page.svelte';
import { pageStore } from '../src/lib/stores/pageData.svelte.js';
import { sessionStore } from '../src/lib/stores/session.svelte.js';
import { extractCopy } from '../src/lib/corpus/fields.js';
import { deriveFieldKey } from '../src/lib/corpus/fieldKey.js';

const fixture = {
	id: 'topic-x--about',
	title: 'Article 11',
	summary: 'Plain-language translations.',
	audience: ['Residents'],
	sections: [
		{
			heading: 'Sections at a glance',
			// Derived, never hardcoded: `extractCopy` and `pageData` both key
			// sections through `deriveFieldKey`, so a literal here can silently
			// disagree with the id the corpus hashes -- which is the exact drift
			// this file exists to catch.
			fieldKey: deriveFieldKey({ heading: 'Sections at a glance' }, 0),
			table: [
				['Health code', 'In plain language'],
				['**Sec. 581(a)**', 'Do not allow a public health nuisance.'],
				['**Sec. 596**', 'HHVC can require correction after a finding.']
			]
		}
	]
};

const renderPage = () => render(Page, { props: { page: structuredClone(fixture) } });

beforeEach(() => {
	pageStore.clearSelection();
	// Deterministic: the store resolves getSession() asynchronously, so without
	// this the component can flip branches mid-test.
	sessionStore.signedIn = true;
});

describe('TableBlock', () => {
	it('emits exactly the field ids extractCopy produces for the same table', () => {
		const { container } = renderPage();

		const rendered = [...container.querySelectorAll('[data-rewrite-field]')]
			.map((n) => n.getAttribute('data-rewrite-field'))
			.filter((id) => id?.includes('.table.'))
			.sort();

		const expected = Object.keys(extractCopy(fixture))
			.filter((id) => id.includes('.table.'))
			.sort();

		expect(expected.length).toBe(6);
		expect(rendered).toEqual(expected);
	});

	it('marks row 0 as column headers and the rest as data cells', () => {
		const { container } = renderPage();

		const headers = [...container.querySelectorAll('th')];
		expect(headers).toHaveLength(2);
		expect(headers.every((th) => th.getAttribute('scope') === 'col')).toBe(true);
		expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
		expect(container.querySelectorAll('tbody td')).toHaveLength(4);
	});

	it('renders corpus bold as <strong>, not as literal asterisks', () => {
		const { container } = renderPage();

		expect(container.querySelector('tbody strong')?.textContent).toBe('Sec. 581(a)');
		expect(container.querySelector('table')?.textContent).not.toContain('**');
	});

	it('gives the scroll container an accessible name so it is keyboard reachable', () => {
		renderPage();

		const region = screen.getByRole('region', { name: /table/i });
		expect(region.getAttribute('tabindex')).toBe('0');
	});
});
