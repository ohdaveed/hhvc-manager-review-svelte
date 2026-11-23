/**
 * Paths for AI-drafted pages, which live in the same `pages.path` column as
 * corpus pages.
 *
 * The reserved prefix is the distinction, rather than a `kind` column:
 * `firstQueuePath` and `nextUndecidedPath` already return a `path` and every
 * caller links from it, so the path is the only value that has to carry it.
 *
 * `reviewHrefFor` is the one place a `pages.path` becomes a link. Drafts render
 * at `/review/draft/<id>` rather than `/review/<path>` so that
 * `src/routes/review/[slug]/+page.ts` keeps its pure, static 404 set computed
 * from `allPages`.
 *
 * `MAX_DESCRIPTION_CHARS` lives here rather than in the API route because a
 * `+server.ts` may only export HTTP verbs and route config, and a browser
 * component needs the same limit. This module is the client-safe leaf both can
 * import.
 */

export const DRAFT_PATH_PREFIX = 'draft:';

export const MAX_DESCRIPTION_CHARS = 2000;

export function draftPathFor(id: string): string {
	return `${DRAFT_PATH_PREFIX}${id}`;
}

export function isDraftPath(path: string): boolean {
	return path.startsWith(DRAFT_PATH_PREFIX);
}

export function draftIdFrom(path: string): string | undefined {
	return isDraftPath(path) ? path.slice(DRAFT_PATH_PREFIX.length) : undefined;
}

export function reviewHrefFor(path: string): string {
	const id = draftIdFrom(path);
	return id === undefined ? `/review/${path}` : `/review/draft/${id}`;
}
