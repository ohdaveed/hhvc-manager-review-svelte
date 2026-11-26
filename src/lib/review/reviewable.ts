import { derived } from 'svelte/store';
import { isDraftPath } from '$lib/corpus/draftPath';
import { pageStore } from '$lib/stores/pageData.svelte';
import { pagesStore } from '$lib/stores/reviewState';

/**
 * Whether a `pages` row names a page a reviewer can still open: a draft
 * (`draft:<uuid>`, routed by `reviewHrefFor`) or a page in the corpus.
 *
 * A row outlives its page when a page is retired or merged -- #244 and #245
 * left rows for "Who to call" and "Prepare your unit" in production. Those
 * rows can never be decided (their route 404s), so counting them meant the
 * review could never read as complete, and walking them sent prev/next and
 * "Next undecided" to a dead link. They are left in the database, not
 * deleted: the export still carries them, and a merge-time DELETE would take
 * any edits and comments with it.
 */
export function isReviewable(path: string): boolean {
	// `pageStore.pages`, the set the app actually renders, rather than a second
	// copy derived from the data modules -- two lists could disagree.
	return isDraftPath(path) || pageStore.pages.some((page) => page.id === path);
}

/**
 * `pagesStore` without the rows whose page is gone. Read this wherever rows
 * are COUNTED or WALKED (progress, queue, next/prev); a lookup of one known
 * path can keep reading `pagesStore`.
 */
export const reviewPagesStore = derived(pagesStore, (rows) =>
	rows.filter((row) => isReviewable(row.path))
);
