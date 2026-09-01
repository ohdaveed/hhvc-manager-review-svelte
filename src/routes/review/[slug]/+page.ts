import { error } from '@sveltejs/kit';
import { routableId } from '$lib/corpus/pageId';
import { allPages } from '$lib/data';
import type { PageLoad } from './$types';

/**
 * Reject a slug the corpus has no page for, with a real 404.
 *
 * `[slug]` matches anything, and before this the route answered every slug
 * with HTTP 200 -- the component rendered a "Page not found" alert inside a
 * successful response. That reads correctly to a person and wrongly to
 * everything else: a crawler indexes the miss, a link checker passes it, and a
 * monitor watching status codes sees a healthy page. `/definitely-not-a-route`
 * already 404s because SvelteKit has no route for it, so the two ways of
 * asking for a page that does not exist disagreed.
 *
 * `routableId` rather than a comparison written here, for the reason its own
 * doc comment gives: the store and the markdown link resolver already share
 * that rule, and a third copy would drift into a slug that resolves in one
 * place and 404s in another.
 */
const ids = new Set(allPages.map((page) => routableId(page)));

export const load: PageLoad = ({ params }) => {
	if (!ids.has(params.slug)) {
		throw error(404, `No mockup page at /review/${params.slug}`);
	}

	return { slug: params.slug };
};
