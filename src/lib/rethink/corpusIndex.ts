/**
 * The 29-page index the Rethink prompt grounds link proposals on.
 *
 * Compact on purpose: the whole thing shares an 8,000-character prompt with
 * the rubric, the target section and its Karl note. Measured at 6,040
 * characters over the current corpus.
 */

/** The share of the prompt budget this index may take. */
export const CORPUS_INDEX_MAX_CHARS = 7_000;

type IndexedPage = { type?: unknown; title?: unknown; summary?: unknown };

const str = (value: unknown): string => (typeof value === 'string' ? value : '');

export function buildCorpusIndex(pages: Record<string, unknown>): string {
	return Object.entries(pages)
		.map(([key, raw]) => {
			const page = (raw ?? {}) as IndexedPage;
			const head = `${key} | ${str(page.type)} | ${str(page.title)}`;
			const summary = str(page.summary);
			// An em dash only when there is something after it. Without this a page
			// with no summary renders a trailing dash, which reads to the model as
			// a truncated line rather than a page without one.
			return summary ? `${head} — ${summary}` : head;
		})
		.join('\n');
}
