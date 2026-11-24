/**
 * @vitest-environment jsdom
 *
 * The docblock is load-bearing. A `.test.ts` under `src/` belongs to the node
 * project (see `vite.config.ts`), and this spec needs a DOM for one reason: the
 * `badge` prop is a snippet, and `createRawSnippet` builds one with
 * `document.createElement` -- measured, it throws `document is not defined`
 * there even under `svelte/server`. `statusBar.test.ts` beside it takes no
 * snippet and stays DOM-free.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createRawSnippet } from 'svelte';
import { cleanup, render } from '@testing-library/svelte';
import PageRow from './PageRow.svelte';

afterEach(cleanup);

const badge = createRawSnippet(() => ({ render: () => '<span>Approved</span>' }));

describe.each(['compact', 'comfortable'] as const)('PageRow (%s)', (density) => {
	const row = (props: Record<string, unknown> = {}) =>
		render(PageRow, {
			props: { path: 'topic-x--about', title: 'About vector control', density, ...props }
		}).container;

	it('is exactly one anchor, and nothing else that takes focus', () => {
		const el = row({ meta: 'Information', badge });

		expect(el.querySelectorAll('a')).toHaveLength(1);
		expect(el.querySelectorAll('a, button, input, select, textarea, [tabindex]')).toHaveLength(1);
		// The anchor IS the row: title, meta and badge are all inside it.
		const a = el.querySelector('a')!;
		expect(el.firstElementChild).toBe(a);
		expect(a.textContent).toContain('About vector control');
		expect(a.textContent).toContain('Information');
		expect(a.textContent).toContain('Approved');
	});

	it('links a corpus path to its review page', () => {
		expect(row().querySelector('a')!.getAttribute('href')).toBe('/review/topic-x--about');
	});

	it('links a draft path through reviewHrefFor, not by interpolation', () => {
		const id = '3f2b8c1e-0000-4000-8000-000000000000';

		expect(
			row({ path: `draft:${id}` })
				.querySelector('a')!
				.getAttribute('href')
		).toBe(`/review/draft/${id}`);
	});

	it('renders the badge inside the link when given one', () => {
		const slot = row({ badge }).querySelector('a [data-slot="page-row-badge"]');

		expect(slot?.tagName).toBe('SPAN');
		expect(slot?.textContent).toBe('Approved');
	});

	it('renders no badge wrapper when given none', () => {
		expect(row().querySelector('[data-slot="page-row-badge"]')).toBeNull();
	});

	it('renders the meta line when there is one', () => {
		const meta = row({ meta: 'Information · has notes' }).querySelector(
			'a [data-slot="page-row-meta"]'
		);

		expect(meta?.textContent?.trim()).toBe('Information · has notes');
	});

	it.each([undefined, ''])('omits the meta line when it is %j', (meta) => {
		expect(row({ meta }).querySelector('[data-slot="page-row-meta"]')).toBeNull();
	});

	it('marks only the current row with aria-current', () => {
		expect(row({ current: true }).querySelector('a')!.getAttribute('aria-current')).toBe('page');
		expect(row().querySelector('a')!.hasAttribute('aria-current')).toBe(false);
	});

	it('has a focus-visible cue, not hover alone', () => {
		expect(row().querySelector('a')!.className).toMatch(/focus-visible:outline-/);
	});
});
