export type StatusFilter = 'all' | 'needs-review' | 'revise' | 'blocked' | 'approved';

/**
 * The search rule: a trimmed, lowercased query matches when it is a substring
 * of the title or of the path. An empty or whitespace-only query matches
 * everything. This is the rule `ReviewQueue`'s `shown` applies.
 */
export function matchesQuery(query: string, title: string, path: string): boolean {
	const needle = query.trim().toLowerCase();
	return (
		needle === '' || title.toLowerCase().includes(needle) || path.toLowerCase().includes(needle)
	);
}

/**
 * Filters `paths` by search query AND review status, preserving input order.
 *
 * **A path whose `statusOf` returns `undefined` has no review row, and that is
 * not the same as `needs-review`.** Such a path matches only `status: 'all'`.
 * Do not "simplify" this to `statusOf(path) ?? 'needs-review'`: that invents a
 * decision state for a page the database holds no row for. The corpus and the
 * seeded `pages` rows have been out of step before (modules annotated
 * `PROPOSED PAGE -- not in the current 29`), and a defaulted status would list
 * those pages as awaiting a decision nobody can record.
 *
 * `status: 'all'` short-circuits, so `statusOf` is not called for it.
 */
export function filterPages(opts: {
	paths: readonly string[];
	query: string;
	status: StatusFilter;
	statusOf: (path: string) => string | undefined;
	titleOf: (path: string) => string;
}): string[] {
	const { paths, query, status, statusOf, titleOf } = opts;
	return paths.filter(
		(path) =>
			matchesQuery(query, titleOf(path), path) && (status === 'all' || statusOf(path) === status)
	);
}
