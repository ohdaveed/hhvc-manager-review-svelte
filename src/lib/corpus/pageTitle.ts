/**
 * The name to show for a `pages.path`. `ReviewPage` has no `title`: the
 * database cannot keep that promise, so a name is resolved from two sources.
 *
 * A ready draft has a corpus entry (keyed by `draft.path`) with the model's
 * real title. A drafting or failed one has none -- `mergeDraftPages` skips
 * anything not ready -- so the reviewer's own words in `draft_pages.title` are
 * the only source. Neither, and the raw path is all there is.
 *
 * Takes both lists as arguments, so a caller reading `$draftsStore` stays
 * reactive.
 */
export function pageTitleFor(
	path: string,
	corpus: readonly { id: string; title: string }[],
	drafts: readonly { path: string; title: string }[]
): string {
	return (
		corpus.find((p) => p.id === path)?.title ?? drafts.find((d) => d.path === path)?.title ?? path
	);
}
