/**
 * The routable id of a corpus page: what `/review/[slug]` matches.
 *
 * `sf.gov/topic-x--about` becomes `topic-x--about` — the `sf.gov/` prefix is
 * dropped and any remaining slashes become dashes, because a slash would split
 * into a second route segment that `[slug]` cannot match.
 *
 * Extracted from `pageData.svelte.ts`, which derived it inline, because a
 * second caller now needs the same answer: an internal markdown link names a
 * `pagesByKey` key and has to reach the route that key's page renders at. Two
 * copies of this expression would drift the first time the rule changes, and
 * the symptom would be a link that 404s rather than an error anyone sees.
 */
export function routableId(page: { slug?: unknown; title?: unknown }): string {
	if (typeof page.slug === 'string' && page.slug) {
		return page.slug.replace('sf.gov/', '').replace(/\//g, '-');
	}
	if (typeof page.title === 'string' && page.title) {
		return page.title.replace(/\s+/g, '-').toLowerCase();
	}
	return '';
}
