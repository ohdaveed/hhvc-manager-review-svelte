/**
 * @vitest-environment jsdom
 *
 * The Karl rebuild drawer's primary action. One clipboard write can serve a
 * step only when it has exactly one value, so the button branches on that:
 * Copy & next for one value, Done · next for several, Mark done · next for
 * none. A failed copy must neither mark the step nor advance -- an editor
 * moved on with nothing on the clipboard pastes the previous field into Karl.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import type { Walkthrough, WalkthroughStep } from '../src/lib/karl/walkthrough';
import { pageStore } from '../src/lib/stores/pageData.svelte';

const { default: WalkthroughDrawer } =
	await import('../src/lib/components/workspace/WalkthroughDrawer.svelte');

const step = (n: number, over: Partial<WalkthroughStep>): WalkthroughStep =>
	({
		n,
		id: `panel_${n}#${n - 1}`,
		uiLabel: 'Information section',
		rawName: 'information_section',
		outcome: 'TYPE',
		values: [],
		choices: [],
		links: [],
		notes: [],
		...over
	}) as WalkthroughStep;

const steps = [
	step(1, {
		uiLabel: 'Page title',
		rawName: 'title',
		values: [{ label: 'Page title', value: 'Report bed bugs' }]
	}),
	step(2, {
		heading: 'Who can report',
		sectionIndex: 0,
		values: [
			{ label: 'Title', value: 'Who can report' },
			{ label: 'Text', value: 'Tenants and owners.' }
		]
	}),
	step(3, { uiLabel: 'Related pages', rawName: 'related', outcome: 'CHOOSE' }),
	step(4, { heading: 'Fees', sectionIndex: 1, outcome: 'FLAG', severity: 'blocking' })
];

const walkthrough = {
	type: 'Transaction',
	title: 'Report bed bugs',
	navPath: 'New: Transaction → Content',
	formUrl: 'https://api.sf.gov/admin/',
	steps,
	gaps: [],
	copyableCount: 2,
	stale: [],
	markdown: ''
} as unknown as Walkthrough;

let pageId = '';
let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
	pageId = `drawer-test-${Math.random()}`;
	pageStore.stepIndex = 0;
	writeText = vi.fn().mockResolvedValue(undefined);
	Object.defineProperty(navigator, 'clipboard', {
		value: { writeText },
		configurable: true
	});
});

afterEach(() => {
	// No restoreMocks in this repo's vitest config: undo the stub by hand.
	Reflect.deleteProperty(navigator, 'clipboard');
	vi.restoreAllMocks();
});

describe('WalkthroughDrawer', () => {
	it('labels a section step by its heading, leaving the raw field name to the open card', async () => {
		render(WalkthroughDrawer, { walkthrough, pageId });
		const row = screen.getByRole('button', { name: /Who can report/ });
		expect(row.textContent).not.toContain('information_section');
		await fireEvent.click(row);
		await tick();
		const card = screen.getByRole('group', { name: 'Who can report' });
		expect(card.textContent).toContain('Information section');
		expect(card.textContent).toContain('information_section');
	});

	it('groups values that share a prefix under one heading', () => {
		const image = step(1, {
			values: [
				{ label: 'Then add an Image block — file', value: '/a.webp' },
				{ label: 'Then add an Image block — alt text', value: 'A bug' }
			]
		});
		render(WalkthroughDrawer, { walkthrough: { ...walkthrough, steps: [image] }, pageId });
		expect(screen.getAllByText('Then add an Image block')).toHaveLength(1);
		expect(screen.getByText('File')).toBeTruthy();
		expect(screen.getByText('Alt text')).toBeTruthy();
		// The accessible name keeps the full label.
		expect(
			screen.getByRole('button', { name: 'Copy Then add an Image block — file' })
		).toBeTruthy();
	});

	it('copies a one-value step, marks it and moves on in one click', async () => {
		render(WalkthroughDrawer, { walkthrough, pageId });
		await fireEvent.click(screen.getByRole('button', { name: 'Copy & next →' }));
		await tick();
		expect(writeText).toHaveBeenCalledWith('Report bed bugs');
		expect(pageStore.isCopied(pageId, steps[0].id)).toBe(true);
		expect(pageStore.stepIndex).toBe(1);
	});

	it('neither marks nor advances when the clipboard refuses', async () => {
		writeText.mockRejectedValue(new Error('denied'));
		render(WalkthroughDrawer, { walkthrough, pageId });
		await fireEvent.click(screen.getByRole('button', { name: 'Copy & next →' }));
		await tick();
		expect(pageStore.isCopied(pageId, steps[0].id)).toBe(false);
		expect(pageStore.stepIndex).toBe(0);
		expect(screen.getByRole('alert').textContent).toMatch(/clipboard/);
	});

	it('keeps a Copy per value on a several-value step, and Done · next copies nothing', async () => {
		pageStore.stepIndex = 1;
		render(WalkthroughDrawer, { walkthrough, pageId });
		expect(screen.getByRole('button', { name: 'Copy Title' })).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Copy Text' })).toBeTruthy();
		await fireEvent.click(screen.getByRole('button', { name: 'Done · next →' }));
		await tick();
		expect(writeText).not.toHaveBeenCalled();
		expect(pageStore.isCopied(pageId, steps[1].id)).toBe(true);
		expect(pageStore.stepIndex).toBe(2);
	});

	it('offers Mark done · next on a step with nothing to copy', () => {
		pageStore.stepIndex = 2;
		render(WalkthroughDrawer, { walkthrough, pageId });
		expect(screen.getByRole('button', { name: 'Mark done · next →' })).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'Copy & next →' })).toBeNull();
	});

	it('badges the no-value rows by what they ask for, never calling a gap empty', () => {
		render(WalkthroughDrawer, { walkthrough, pageId });
		expect(screen.getByRole('button', { name: /Related pages/ }).textContent).toContain('Choose');
		expect(screen.getByRole('button', { name: /Fees/ }).textContent).toContain('Blocking');
		expect(screen.getByRole('button', { name: /Who can report/ }).textContent).not.toMatch(
			/Empty|Choose|Blocking/
		);
	});
});
