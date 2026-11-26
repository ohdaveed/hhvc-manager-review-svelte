/**
 * Batch B moved both callouts (a section's and a step's) into CalloutBlock and
 * relabelled the type pill. Field ids and panel names are identity -- edits are
 * stored and folded by them -- so this pins them to the strings the two callers
 * produced before the move.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import Page from '../src/lib/components/Page.svelte';
import { sessionStore } from '../src/lib/stores/session.svelte.js';

const page = {
	id: 'x',
	type: 'Transaction',
	title: 'Report a pest',
	sections: [
		{
			heading: 'Before you start',
			fieldKey: 'before',
			callout: { title: 'Track your case.', text: 'You get a number.' }
		},
		{
			heading: 'What to do',
			fieldKey: 'what',
			steps: [
				{ title: 'Call 311', callout: { title: 'Keep it.', text: 'Step note.' } },
				// The corpus carries a literal `false` title in one place.
				{ title: 'Wait', callout: { title: false, text: 'No title here.' } }
			]
		}
	]
};

const fields = (c: HTMLElement) =>
	[...c.querySelectorAll<HTMLElement>('.callout [data-rewrite-field]')].map((el) => [
		el.dataset.rewriteField,
		// The field name is the button's description; its name is the copy.
		el.ownerDocument.getElementById(el.getAttribute('aria-describedby')?.split(' ')[0] ?? '')
			?.textContent ?? null
	]);

describe('CalloutBlock', () => {
	beforeEach(() => {
		sessionStore.signedIn = true;
	});

	it('keeps every callout field id and panel name', () => {
		const { container } = render(Page, { props: { page: structuredClone(page) } });
		expect(fields(container)).toEqual([
			['sections.before.callout.title', 'Callout Title'],
			['sections.before.callout.text', 'Callout Text'],
			['sections.what.steps.0.callout.title', 'Section [2] Step [1] Callout Title'],
			['sections.what.steps.0.callout.text', 'Section [2] Step [1] Callout Text'],
			['sections.what.steps.1.callout.text', 'Section [2] Step [2] Callout Text']
		]);
	});

	it('runs the title on as a bold lead-in, not a heading', () => {
		const { container } = render(Page, { props: { page: structuredClone(page) } });
		const first = container.querySelector('.callout')!;
		expect(first.querySelector('h3, h4')).toBeNull();
		expect(first.querySelector('p.callout-body > b.callout-title')).not.toBeNull();
	});
});

describe('type pill', () => {
	it.each([
		['Transaction', 'Service'],
		['Information', 'Info Page'],
		['Step by step', 'Step-by-step'],
		['Campaign', 'Campaign']
	])('labels %s as %s', (type, label) => {
		const { container } = render(Page, { props: { page: { ...structuredClone(page), type } } });
		expect(container.querySelector('.page-type-eyebrow')?.textContent).toBe(label);
	});
});
