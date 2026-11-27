/**
 * Paths for AI-drafted pages, which live in the same `pages.path` column as
 * corpus pages.
 *
 * The reserved prefix is the distinction, rather than a `kind` column:
 * `queueOrder` and `nextUndecidedPath` already return a `path` and every
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

/**
 * The id a draft path carries, or `undefined` when the path is not a draft.
 *
 * An empty id is deliberately NOT a draft. `draft:` on its own is malformed,
 * and treating it as a draft would make `reviewHrefFor` emit a dangling
 * `/review/draft/` link. Falling through to the corpus branch instead lets it
 * 404 at `/review/[slug]`, which is the honest outcome. Do not "fix" this back
 * to a prefix check: `isDraftPath` and `draftIdFrom` must agree on it.
 */
export function draftIdFrom(path: string): string | undefined {
	if (!path.startsWith(DRAFT_PATH_PREFIX)) return undefined;
	const id = path.slice(DRAFT_PATH_PREFIX.length);
	return id === '' ? undefined : id;
}

export function isDraftPath(path: string): boolean {
	return draftIdFrom(path) !== undefined;
}

export function reviewHrefFor(path: string): `/review/${string}` {
	const id = draftIdFrom(path);
	return id === undefined ? `/review/${path}` : `/review/draft/${id}`;
}

/**
 * The `pages.path` a route's params name: `[slug]` carries one directly and
 * `draft/[id]` carries the bare id of a draft. The review layout and the queue
 * both highlight and scope by this value, so they must agree on it.
 */
export function routePathFor(params: { slug?: string; id?: string }): string | undefined {
	return params.id === undefined ? params.slug : draftPathFor(params.id);
}

/**
 * What the proposer picked beside the description: a landing section, a Karl
 * template and a path. All optional, and all hints to the drafter rather than
 * stored facts -- `draft_pages` has no column for them, so they travel as
 * labelled lines after the description.
 */
export type DraftHints = { section?: string; template?: string; path?: string };

/** The hint lines, or `''` when nothing was picked. */
export function draftHintLines(hints: DraftHints): string {
	const path = hints.path?.trim().replace(/^\/+/, '');
	return [
		hints.section && `Section: ${hints.section}`,
		hints.template && `Template: ${hints.template}`,
		path && `Suggested path: sf.gov/${path}`
	]
		.filter(Boolean)
		.join('\n');
}

/**
 * The text stored as `draft_pages.description` and sent to the drafter. The API
 * route and the browser both build it here, so the row the form waits for in
 * `draftsStore` is the row the server wrote.
 */
export function draftBrief(description: string, hintLines = ''): string {
	const text = description.trim();
	const lines = hintLines.trim();
	return lines ? `${text}\n\n${lines}` : text;
}
