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
 *
 * `fallback` is what to show when neither source knows the path. A queue row
 * or list entry is the only label its row has, so it falls back to the `path`
 * (`'path'`, the default): something identifying beats a blank. A subtitle
 * (a tooltip or "Next undecided" line) sits beside a link that is already
 * there, and `draft:9f1c...` is noise rather than a name, so it falls back to
 * `''` (`'empty'`).
 */
export function pageTitleFor(
	path: string,
	corpus: readonly { id: string; title: string }[],
	drafts: readonly { path: string; title: string }[],
	fallback: 'path' | 'empty' = 'path'
): string {
	return (
		corpus.find((p) => p.id === path)?.title ??
		drafts.find((d) => d.path === path)?.title ??
		(fallback === 'path' ? path : '')
	);
}
