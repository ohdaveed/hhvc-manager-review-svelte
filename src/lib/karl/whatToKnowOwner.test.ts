/**
 * `whatToKnow` (Cost + Things to know) is a Transaction-only concept in Karl:
 * both panels sit under Transaction's "What to know before you start" grouping
 * and exist on no other verified type. A page of any other type carrying it
 * has content with nowhere to land on export.
 *
 * U23 (docs/karl-export-field-map.md) was the one instance — an Information
 * page — closed 2026-11-21 by moving its content into an `information_section`.
 * This keeps a new page from reopening it.
 */
import { describe, it, expect } from 'vitest';
import { allPages } from '$lib/data/index';

describe('whatToKnow owner', () => {
	it('appears only on Transaction pages', () => {
		const offenders = (allPages as { slug: string; type: string; whatToKnow?: unknown }[])
			.filter((p) => p.whatToKnow && p.type !== 'Transaction')
			.map((p) => `${p.type}: ${p.slug}`);
		expect(offenders).toEqual([]);
	});
});
