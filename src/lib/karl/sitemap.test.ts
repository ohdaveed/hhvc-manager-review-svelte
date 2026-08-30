import { describe, it, expect } from 'vitest';
import { allPages } from '$lib/data';
import { deriveFieldKey } from '$lib/corpus/fieldKey';
import { routableId } from '$lib/corpus/pageId';
import {
	buildSitemap,
	findOrphans,
	findRelatedTypeViolations,
	RELATED_PERMITTED_TYPES,
	typeBreakdown
} from './sitemap';

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
			'16 Transaction · 7 Information · 4 Resource Collection · 3 Campaign · 3 Step by step · 2 Report · 1 About us · 1 Agency · 1 Location · 1 Topic'
		);
	});
});

describe('findRelatedTypeViolations', () => {
	const link = (component: string, type: string, live = true) => ({
		target: 't',
		live,
		id: 'dest',
		title: 'Dest',
		type,
		cardTitle: '',
		sectionHeading: '',
		component,
		publishes: 'title-only' as const
	});
	const entry = (id: string, outgoing: ReturnType<typeof link>[]) => ({
		id,
		title: id,
		type: 'Transaction',
		slug: id,
		outgoing,
		incoming: 0
	});

	it('accepts the four permitted types', () => {
		const entries = [
			entry(
				'a',
				RELATED_PERMITTED_TYPES.map((type) => link('related', type))
			)
		];

		expect(findRelatedTypeViolations(entries)).toEqual([]);
	});

	it('flags a Related card pointing outside them', () => {
		const entries = [entry('a', [link('related', 'Resource Collection')])];

		expect(findRelatedTypeViolations(entries)).toHaveLength(1);
	});

	it('ignores the same type in a non-Related panel, since O3 is Related-only', () => {
		const entries = [entry('a', [link('services', 'Resource Collection')])];

		expect(findRelatedTypeViolations(entries)).toEqual([]);
	});

	// A dead target has no type to judge. Reporting it as O3 would file a
	// broken link under another defect's name.
	it('ignores a card whose target is not a page in the corpus', () => {
		const entries = [entry('a', [link('related', '', false)])];

		expect(findRelatedTypeViolations(entries)).toEqual([]);
	});
});

describe('findOrphans', () => {
	const page = (id: string, type: string, targets: string[] = []) => ({
		id,
		title: id,
		type,
		slug: id,
		incoming: 0,
		outgoing: targets.map((t) => ({
			target: t,
			live: true,
			id: t,
			title: t,
			type: 'Transaction',
			cardTitle: '',
			sectionHeading: '',
			component: 'related',
			publishes: 'title-only' as const
		}))
	});

	it('reaches pages linked from a hub, and those linked on from there', () => {
		const entries = [
			page('hub', 'Topic', ['a']),
			page('a', 'Transaction', ['b']),
			page('b', 'Transaction')
		];

		expect(findOrphans(entries)).toEqual([]);
	});

	it('reports a page no hub reaches', () => {
		const entries = [
			page('hub', 'Topic', ['a']),
			page('a', 'Transaction'),
			page('lost', 'Transaction')
		];

		expect(findOrphans(entries).map((e) => e.id)).toEqual(['lost']);
	});

	// The whole reason this is a reachability pass rather than `incoming === 0`:
	// two unreachable pages pointing at each other each have an incoming link.
	it('catches a mutually-linked pair that no hub reaches, which incoming counts miss', () => {
		const entries = [
			page('hub', 'Topic'),
			page('x', 'Transaction', ['y']),
			page('y', 'Transaction', ['x'])
		];

		expect(findOrphans(entries).map((e) => e.id)).toEqual(['x', 'y']);
	});
});

describe('the real corpus', () => {
	const entries = buildSitemap(allPages.map((p) => ({ ...p, id: routableId(p) })));

	it('has three Related cards outside the four permitted types', () => {
		const targets = findRelatedTypeViolations(entries).map(
			(v) => `${v.link.target}:${v.link.type}`
		);

		expect(targets).toEqual([
			'ownerHub:Resource Collection',
			'ownerHub:Resource Collection',
			'pestsTopic:Agency'
		]);
	});

	// Pinned so a corpus change cannot quietly move the figure the UI quotes.
	// Seven of these carry inbound links and are still unreachable from a hub.
	// The weaker `incoming === 0` test reports nine pages and misses those
	// seven, which is why this is a reachability pass rather than a count.
	it('has fifteen pages unreachable from the Agency and Topic hubs', () => {
		expect(findOrphans(entries).map((e) => e.id)).toEqual([
			'get-ready-for-a-follow-up-inspection',
			'get-ready-for-a-housing-inspection',
			'departments--healthy-housing-and-vector-control--about',
			'tenant-steps-after-notice-of-violation',
			'information--article-11-compliance-for-property-owners',
			'step-by-step-report-a-pest-problem',
			'step-by-step-correct-a-violation-and-close-your-case',
			'step-by-step-prepare-your-unit-for-pest-treatment',
			'location-environmental-health-office',
			'information-who-to-call-about-a-housing-problem',
			'appeal-a-notice-of-violation',
			'pay-a-healthy-housing-citation',
			'resource-guides-in-other-languages',
			'rat-free-blocks',
			'report-healthy-housing-inspections-annual-summary'
		]);
	});

	it('finds seven orphans that inbound-link counting would miss', () => {
		const missed = findOrphans(entries).filter((e) => e.incoming > 0);

		expect(missed).toHaveLength(7);
	});
});
