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
	/** The section's `component`, e.g. `related`, `services`. Needed because
	    the O3 restriction applies to Related panels only. */
	component: string;
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
					component: String(section.component ?? ''),
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

/**
 * The four content types a Related panel may point at (`O3`).
 *
 * From the Karl Help Center via `docs/karl-export-field-map.md`. The live
 * picker is *unrestricted* -- `KARL_PANELS` records the Related block as a
 * "page chooser, unrestricted", and a Campaign picker was observed returning a
 * Resource Collection page -- but the 2026-08-23 precedence reversal makes the
 * Help Center govern, so the four-type restriction stands and the permissive
 * form is a gap in the form. Do not "correct" this list against the picker.
 *
 * `Topic` is easy to delete from this list by mistake, so: it is a real
 * content type, and it is missing from the Help Center's "Choosing a content
 * type" page because that page is editorial guidance on which type to pick for
 * a new public page, not an inventory of the form. Topic is a **sitewide**
 * page -- "collects content around a common theme, across multiple
 * departments" -- and "only DS admin can add a new sitewide page" governs
 * whether it GOES LIVE, not whether it can be built: Karl offers Topic in the
 * add-page form like any other type, which is why `KARL_NAV` carries
 * `New: Topic -> Content` for it exactly as it does for Agency. A reviewer can
 * therefore design and walk through a Topic mockup; publishing is the step
 * that needs Digital Services.
 * It is listed under Sitewide pages on "Understanding content types":
 * https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/understanding-content-types
 */
export const RELATED_PERMITTED_TYPES = ['Transaction', 'Information', 'Campaign', 'Topic'];

/**
 * Related cards pointing at a type Karl's Related panel may not hold.
 *
 * Only `live` targets are judged: a card whose target names no page in the
 * corpus has no type to check, and is a broken link rather than an O3
 * violation. Reporting it here would file one defect under another's name.
 */
export function findRelatedTypeViolations(
	entries: SitemapEntry[]
): { from: string; link: SitemapLink }[] {
	const violations: { from: string; link: SitemapLink }[] = [];
	for (const entry of entries) {
		for (const link of entry.outgoing) {
			if (link.component !== 'related' || !link.live) continue;
			if (!RELATED_PERMITTED_TYPES.includes(link.type)) violations.push({ from: entry.id, link });
		}
	}
	return violations;
}

/**
 * Pages a reader cannot reach by walking out from the hubs.
 *
 * A hub is an Agency or Topic page -- the two SF.gov types whose job is to
 * route to other pages, and (measured on this corpus) exactly the two pages
 * carrying a `services` listing. The predicate is a parameter rather than a
 * constant so a corpus that grows a third routing type does not need this
 * function reopened.
 *
 * Reachability, not `incoming === 0`. The weaker test passes a page linked
 * only from another orphan: a pair of unreachable pages pointing at each other
 * both have an incoming link and neither can be found from anywhere a reader
 * starts. Walking out from the hubs is the question the UI actually asks --
 * "not linked from any hub".
 */
export function findOrphans(
	entries: SitemapEntry[],
	isHub: (entry: SitemapEntry) => boolean = (entry) =>
		entry.type === 'Agency' || entry.type === 'Topic'
): SitemapEntry[] {
	const byId = new Map(entries.map((entry) => [entry.id, entry]));
	const reached = new Set<string>();
	const queue = entries.filter(isHub);

	for (const hub of queue) reached.add(hub.id);
	while (queue.length) {
		const entry = queue.shift()!;
		for (const link of entry.outgoing) {
			if (!link.id || reached.has(link.id)) continue;
			reached.add(link.id);
			const next = byId.get(link.id);
			if (next) queue.push(next);
		}
	}

	return entries.filter((entry) => !reached.has(entry.id));
}
