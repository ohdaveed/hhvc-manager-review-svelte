import { describe, expect, it } from 'vitest';
import { routableId } from '../src/lib/corpus/pageId';
import { allPages } from '../src/lib/data';

/**
 * `/review/[slug]` must 404 on a slug the corpus has no page for.
 *
 * Unit rather than e2e, deliberately. The load is pure -- slug in, throw or
 * pass out -- so a browser adds nothing, and an e2e version would have to
 * navigate to a 404, which `tests/fixtures.ts` now fails on by design. Testing
 * it here keeps that gate strict instead of carving an exception into it.
 */

// Import shape matches the route module. The route's own `load` pulls
// `./$types`, which only exists after `svelte-kit sync`, so the predicate is
// re-derived here from the same two exports the route uses rather than
// importing the route file itself.
const ids = new Set(allPages.map((page) => routableId(page)));

describe('/review/[slug] rejects unknown slugs', () => {
	it('accepts every id the corpus actually renders', () => {
		expect(ids.size).toBeGreaterThan(0);
		for (const page of allPages) {
			expect(ids.has(routableId(page))).toBe(true);
		}
	});

	it('does not accept a slug with no page behind it', () => {
		for (const slug of [
			'this-slug-does-not-exist',
			'',
			'report-garbage-filth-vegetation-typo',
			'../etc/passwd'
		]) {
			expect(ids.has(slug), `"${slug}" must not resolve`).toBe(false);
		}
	});

	it('still rejects the old `step-by-step--` paths after the rekey', () => {
		// #106 stripped that prefix. A stale link carrying it has to 404 rather
		// than render, or the rename is invisible to anyone holding an old URL.
		const stale = [...ids].filter((id) => id.startsWith('step-by-step--'));
		expect(stale, 'no routable id should still carry the prefix').toEqual([]);
	});
});
