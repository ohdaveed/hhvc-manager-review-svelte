/**
 * The walkthrough's deep link: `?view=walkthrough` on a review URL opens that
 * page with the Karl walkthrough already running.
 *
 * The URL is kept in step with the view both ways (the review layout does
 * that): entering the walkthrough adds the parameter, so the address bar is a
 * link to the walkthrough someone can bookmark or send; leaving it strips the
 * parameter, so a reload after Exit lands on the mockup rather than back in
 * the drawer -- the stranding the view was kept out of storage to avoid.
 *
 * A query parameter rather than a route: the walkthrough is a view of the
 * review page, not a page of its own, and `/review/[slug]`'s static 404 guard
 * should not have to learn a second shape of URL.
 */

export const WALKTHROUGH_PARAM = 'view';
export const WALKTHROUGH_VALUE = 'walkthrough';

/** Whether `url` asks for the walkthrough. Only the exact value counts. */
export function wantsWalkthrough(url: URL): boolean {
	return url.searchParams.get(WALKTHROUGH_PARAM) === WALKTHROUGH_VALUE;
}

/**
 * `url` with the parameter set (`on`) or removed, as a new URL. Every other
 * parameter and the hash are kept. Removing it when it holds some other value
 * is left alone: that value is not this module's to clear.
 */
export function withWalkthrough(url: URL, on: boolean): URL {
	const next = new URL(url);
	if (on) next.searchParams.set(WALKTHROUGH_PARAM, WALKTHROUGH_VALUE);
	else if (wantsWalkthrough(next)) next.searchParams.delete(WALKTHROUGH_PARAM);
	return next;
}

/** The query string that opens a review link in the walkthrough. */
export const WALKTHROUGH_QUERY = `?${WALKTHROUGH_PARAM}=${WALKTHROUGH_VALUE}`;
