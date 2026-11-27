/**
 * Phase D of the findings.csv audit: the ten corpus tables had no `<caption>`.
 *
 * The fix reuses the section heading rather than adding a corpus field, so the
 * thing worth pinning is that the caption is REAL (in the accessibility tree,
 * not `display: none`), that it names the scroll region too, and that it does
 * not print the heading a second time for a sighted reader.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import Page from '../src/lib/components/Page.svelte';
import { sessionStore } from '../src/lib/stores/session.svelte.js';

const page = {
	id: 'x',
	type: 'Report',
	title: 'Inspections summary',
	sections: [
		{
			heading: 'Inspections by outcome',
			fieldKey: 'outcome',
			table: [
				['Outcome', 'Count'],
				['No violation found', '12']
			]
		},
		// No heading: the positional label is the documented fallback.
		{
			fieldKey: 'bare',
			table: [['A', 'B']]
		}
	]
};

const render_ = () => render(Page, { props: { page: structuredClone(page) } }).container;

describe('table caption', () => {
	beforeEach(() => {
		sessionStore.signedIn = true;
	});

	it('gives each table a caption taken from its section heading', () => {
		const caps = [...render_().querySelectorAll('table.sfgov-table > caption')].map(
			(c) => c.textContent
		);
		expect(caps).toEqual(['Inspections by outcome', 'Section 2 table']);
	});

	it('names the scrollable region with the same text', () => {
		const regions = [...render_().querySelectorAll('.table-scroll[role="region"]')].map((r) =>
			r.getAttribute('aria-label')
		);
		expect(regions).toEqual(['Inspections by outcome', 'Section 2 table']);
	});

	it('hides the caption visually without removing it from the accessibility tree', () => {
		const caption = render_().querySelector('table.sfgov-table > caption')!;
		expect(caption.classList.contains('sr-only')).toBe(true);
		// `display: none` or `visibility: hidden` would drop it from the
		// accessibility tree, which is the defect being fixed.
		expect(caption.getAttribute('style')).toBeNull();
		expect(caption.hasAttribute('aria-hidden')).toBe(false);
	});
});
