/**
 * Rendered with `svelte/server`, on purpose. A `.test.ts` under `src/` runs in
 * the node project (see `vite.config.ts`), which has no DOM and resolves
 * Svelte's server build -- so this asserts on the markup the component emits
 * rather than mounting it. Everything asserted here is static markup.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import StatusBar from './StatusBar.svelte';

const segments = (html: string) =>
	[...html.matchAll(/data-status="([^"]+)"[^>]*style="width: ([\d.]+)%"/g)].map(
		([, status, width]) => ({ status, width: Number(width) })
	);
const label = (html: string) => html.match(/aria-label="([^"]*)"/)?.[1];

describe('StatusBar', () => {
	it('sizes each segment as its share of every page, in queue order', () => {
		const { body } = render(StatusBar, {
			props: { total: 40, counts: { 'needs-review': 28, approved: 8, revise: 3, blocked: 1 } }
		});

		expect(segments(body)).toEqual([
			{ status: 'approved', width: 20 },
			{ status: 'revise', width: 7.5 },
			{ status: 'blocked', width: 2.5 }
		]);
	});

	it('draws no segment for needs-review: the grey track is the remainder', () => {
		const { body } = render(StatusBar, {
			props: { total: 4, counts: { 'needs-review': 3, approved: 1 } }
		});

		expect(segments(body).map((s) => s.status)).toEqual(['approved']);
		expect(body).not.toContain('data-status="needs-review"');
	});

	it('is an image with a sentence that names the parts', () => {
		const { body } = render(StatusBar, {
			props: { total: 39, counts: { 'needs-review': 27, approved: 8, revise: 3, blocked: 1 } }
		});

		expect(body).toContain('role="img"');
		expect(body).not.toContain('progressbar');
		expect(label(body)).toBe(
			'12 of 39 pages decided, 31 percent: 8 approved, 3 need revision, 1 blocked'
		);
	});

	it('leaves zero counts out of the sentence, and agrees in number', () => {
		const { body } = render(StatusBar, {
			props: { total: 4, counts: { 'needs-review': 3, revise: 1, blocked: 0 } }
		});

		expect(label(body)).toBe('1 of 4 pages decided, 25 percent: 1 needs revision');
	});

	it('renders no segments at all when nothing is decided', () => {
		const { body } = render(StatusBar, { props: { total: 39, counts: { 'needs-review': 39 } } });

		expect(segments(body)).toEqual([]);
		expect(body).not.toContain('data-status');
		expect(label(body)).toBe('0 of 39 pages decided, 0 percent');
	});

	it('separates adjacent segments with a hairline, and not the first from the track', () => {
		const { body } = render(StatusBar, {
			props: { total: 4, counts: { approved: 1, revise: 1, blocked: 1 } }
		});

		expect(body.match(/border-l border-white/g)).toHaveLength(2);
	});

	it('states the sum alone when nothing is decided, with no empty colon', () => {
		const { body } = render(StatusBar, {
			props: { total: 2, counts: { 'needs-review': 2 } }
		});

		expect(label(body)).toBe('0 of 2 pages decided, 0 percent');
	});

	it('is taller at lg', () => {
		const sm = render(StatusBar, { props: { total: 1, counts: {} } }).body;
		const lg = render(StatusBar, { props: { total: 1, counts: {}, size: 'lg' } }).body;

		expect(sm).toContain('h-1.5');
		expect(lg).toContain('h-3');
		expect(lg).not.toContain('h-1.5');
	});
});
