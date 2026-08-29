import { describe, it, expect } from 'vitest';
import { allPages } from '$lib/data';
import { deriveFieldKey } from '$lib/corpus/fieldKey';
import { routableId } from '$lib/corpus/pageId';
import { buildSitemap, typeBreakdown } from './sitemap';

/**
 * Hydrate the way `pageData.svelte.ts` does, because `buildSitemap` documents
 * that it takes hydrated pages -- through the same `routableId` helper the
 * store uses, never a second copy of that rule. A test that re-derived the id
 * would keep passing while the router disagreed with it.
 */
const hydrate = () =>
	allPages.map((p) => ({
		...p,
		id: routableId(p),
		sections: (p.sections ?? []).map((s, i) => ({ ...s, fieldKey: deriveFieldKey(s, i) }))
	}));

describe('buildSitemap', () => {
	it('covers every page and resolves every card target', () => {
		const map = buildSitemap(hydrate());
		expect(map).toHaveLength(allPages.length);

		// A dead target is a card pointing at a page key that does not exist. The
		// AI backend's card schema forbids inventing one, so any dead target here
		// is a corpus defect rather than an expected state.
		const dead = map.flatMap((e) => e.outgoing).filter((l) => !l.live);
		expect(dead.map((l) => l.target)).toEqual([]);
	});

	it('gives every live link a routable id, so the map can navigate', () => {
		for (const entry of buildSitemap(hydrate())) {
			for (const link of entry.outgoing) {
				if (link.live) expect(link.id, `${entry.title} -> ${link.target}`).toBeTruthy();
			}
		}
	});

	it('labels a link with the destination title, not the referring card text', () => {
		// This is the point of the whole view: for every panel except the authored
		// few, Karl prints the DESTINATION's title and discards what the referring
		// page wrote. Showing the card's own words as the label would tell the
		// reviewer the opposite of what publishes.
		const map = buildSitemap(hydrate());
		const byId = new Map(map.map((e) => [e.id, e]));

		for (const entry of map) {
			for (const link of entry.outgoing) {
				if (!link.live) continue;
				expect(link.title).toBe(byId.get(link.id!)!.title);
			}
		}
	});

	it('classifies how each card publishes, using the shared classifier', () => {
		const links = buildSitemap(hydrate()).flatMap((e) => e.outgoing);
		const kinds = new Set(links.map((l) => l.publishes));
		for (const kind of kinds) {
			expect(['authored', 'title-only', 'inherits', 'unknown']).toContain(kind);
		}
		// Most card copy is discarded by Karl. If this ever inverts, either the
		// corpus changed shape or the classifier regressed -- both worth a look.
		const authored = links.filter((l) => l.publishes === 'authored').length;
		expect(authored).toBeLessThan(links.length / 2);
	});

	it('counts incoming links symmetrically with outgoing ones', () => {
		const map = buildSitemap(hydrate());
		const out = map.reduce((n, e) => n + e.outgoing.length, 0);
		const inc = map.reduce((n, e) => n + e.incoming, 0);
		expect(inc).toBe(out);
	});
});

describe('typeBreakdown', () => {
	it('reads back the corpus composition, commonest type first', () => {
		expect(typeBreakdown(hydrate())).toBe(
			'14 Transaction · 6 Information · 3 Resource Collection · 2 Campaign · 1 About us · 1 Agency · 1 Report · 1 Topic'
		);
	});
});
