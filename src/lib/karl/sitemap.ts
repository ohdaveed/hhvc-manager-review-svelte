/**
 * The site map: every page in the corpus and what it links to.
 *
 * The design links this from the queue footer in every frame, and the reason it
 * is worth building is NOT that it draws a diagram. It is that Karl decides
 * what a card publishes, and the referring page usually does not get a say:
 *
 *   - a Related panel prints the destination page's TITLE only
 *   - an Agency or Topic services listing prints its title AND summary
 *   - only Table blocks, Title-and-text blocks, Campaign `related_links` and
 *     External link entries print the words you actually wrote
 *
 * So card copy written on the referring page is, in most panels, discarded --
 * and a reviewer approving it has approved something that will never appear.
 * That is what makes this a copy tool. The classification is not re-derived
 * here: `classifySection` in `$lib/legacy-core/card-inheritance.js` is the
 * single place that decides, precisely so the renderer and the audit cannot
 * come to disagree, and this consumes it.
 */
import { classifySection } from '$lib/legacy-core/card-inheritance.js';
import { pagesByKey } from '$lib/data';

/** How a card's words reach the published page -- `classifySection`'s own vocabulary. */
export type Publishes = 'authored' | 'title-only' | 'inherits' | 'unknown';

export type SitemapLink = {
	/** The corpus key the card points at, e.g. `afterReport`. */
	target: string;
	/** Whether that key names one of the pages in this corpus. */
	live: boolean;
	/** Routable id of the destination, when live. */
	id?: string;
	/** The destination's own title -- what a title-only or inheriting card shows. */
	title: string;
	type: string;
	/** What the referring page wrote on the card. Often discarded; see `publishes`. */
	cardTitle: string;
	/** The section the card sits in, for locating it on the page. */
	sectionHeading: string;
	publishes: Publishes;
};

export type SitemapEntry = {
	/** Routable id, taken from the hydrated page rather than re-derived. */
	id: string;
	title: string;
	type: string;
	slug: string;
	outgoing: SitemapLink[];
	/** How many other pages point here. */
	incoming: number;
};

/* eslint-disable-next-line @typescript-eslint/no-explicit-any --
   corpus modules are plain untyped objects; same scoped boundary as
   fieldResolver.ts. */
type AnyPage = Record<string, any>;

/**
 * Build the whole map.
 *
 * `pages` must be the HYDRATED pages from `pageStore`, not the raw modules --
 * the routable `id` is assigned there, and re-deriving it here would put a
 * second copy of that rule in play, free to drift from the router's.
 */
export function buildSitemap(pages: AnyPage[]): SitemapEntry[] {
	// A card's `target` names a corpus KEY -- the export name in
	// `$lib/data/index.ts`, which is the AI backend's link vocabulary and is
	// neither the routable id nor the slug. `pagesByKey` IS that vocabulary, and
	// the hydrated pages do not carry it, so a key is resolved through the module
	// and matched to its hydrated page by slug, which is unique across the corpus.
	const bySlug = new Map<string, AnyPage>();
	for (const page of pages) {
		if (typeof page?.slug === 'string') bySlug.set(page.slug, page);
	}
	const byKey = new Map<string, AnyPage>();
	for (const [key, mod] of Object.entries(pagesByKey as unknown as Record<string, AnyPage>)) {
		const hydrated = bySlug.get(String(mod?.slug ?? ''));
		if (hydrated) byKey.set(key, hydrated);
	}

	const incoming = new Map<string, number>();
	const entries: SitemapEntry[] = pages.map((page) => {
		const outgoing: SitemapLink[] = [];

		for (const section of page.sections ?? []) {
			const publishes = classifySection(section) as Publishes;
			for (const card of section.cards ?? []) {
				const target = typeof card?.target === 'string' ? card.target : '';
				if (!target) continue;

				const dest = byKey.get(target);
				incoming.set(target, (incoming.get(target) ?? 0) + 1);
				outgoing.push({
					target,
					live: Boolean(dest),
					id: dest?.id,
					// The destination's title is what actually publishes for every
					// panel except the authored few, so it is the primary label.
					title: String(dest?.title ?? card.title ?? target),
					type: String(dest?.type ?? ''),
					cardTitle: String(card.title ?? ''),
					sectionHeading: String(section.heading ?? ''),
					publishes
				});
			}
		}

		return {
			id: String(page.id ?? ''),
			title: String(page.title ?? ''),
			type: String(page.type ?? ''),
			slug: String(page.slug ?? ''),
			outgoing,
			incoming: 0
		};
	});

	// Second pass: incoming counts are only known once every page has been read.
	const incomingById = new Map<string, number>();
	for (const [key, page] of byKey) {
		incomingById.set(String(page.id), incoming.get(key) ?? 0);
	}
	for (const entry of entries) {
		entry.incoming = incomingById.get(entry.id) ?? 0;
	}

	return entries;
}

/** `14 Transaction · 6 Information · …`, for the site map header. */
export function typeBreakdown(pages: AnyPage[]): string {
	const counts = new Map<string, number>();
	for (const page of pages) {
		const type = String(page?.type ?? 'Unknown');
		counts.set(type, (counts.get(type) ?? 0) + 1);
	}
	return [...counts.entries()]
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
		.map(([type, n]) => `${n} ${type}`)
		.join(' · ');
}
