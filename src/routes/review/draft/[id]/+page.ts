import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

/**
 * Drafts are `TO authenticated` and the session lives in the browser, so a
 * server render has no session and would 404 a perfectly good draft. Opting
 * only this route out keeps `/review/[slug]`'s pure static 404 intact.
 */
export const ssr = false;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const load: PageLoad = ({ params }) => {
	if (!UUID.test(params.id)) {
		throw error(404, `No draft at /review/draft/${params.id}`);
	}
	return { id: params.id };
};
