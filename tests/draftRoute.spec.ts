import { describe, it, expect, vi } from 'vitest';

// The Sentry Vite plugin rewrites every `+page.ts` to import
// `wrapLoadWithSentry`, and the real package drags in `$app/*` client code
// that a node test cannot resolve. An identity wrapper keeps the `load`
// under test the one this route actually exports.
vi.mock('@sentry/sveltekit', () => ({ wrapLoadWithSentry: (fn: unknown) => fn }));

import { load, ssr } from '../src/routes/review/draft/[id]/+page.js';

describe('/review/draft/[id] load', () => {
	it('404s an id that is not a uuid', () => {
		expect(() => load({ params: { id: 'not-a-uuid' } } as never)).toThrow(
			expect.objectContaining({ status: 404 })
		);
	});

	it('404s a draft path pasted where the bare id belongs', () => {
		expect(() =>
			load({ params: { id: 'draft:9f1c2b3a-0000-4000-8000-000000000000' } } as never)
		).toThrow(expect.objectContaining({ status: 404 }));
	});

	it('passes a uuid through', () => {
		const id = '9f1c2b3a-0000-4000-8000-000000000000';
		expect(load({ params: { id } } as never)).toEqual({ id });
	});

	it('opts out of SSR so the authenticated draft read happens in the browser', () => {
		expect(ssr).toBe(false);
	});
});
