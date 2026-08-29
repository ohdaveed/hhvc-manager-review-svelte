/**
 * What the analysis actually measures, and why it is not the DOM.
 *
 * Karl Jr. scrapes the rendered page, because on a live SF.gov page the DOM is
 * the whole of the content. Here it is not. `Section.svelte` renders `heading`,
 * `paragraphs`, `bullets` and `callout` — and nothing else. A Transaction page's
 * `steps` array, which on `report-rats-mice-four-legged-problems` carries the
 * entire "What to do" body, never reaches the DOM at all; `RethinkPanel` says as
 * much to the reviewer ("Steps and cards not shown").
 *
 * So a faithful DOM port would have scored a fraction of each page and reported
 * it as the page's reading level, with no symptom — the number would simply have
 * been wrong, and wrong in the flattering direction, since steps are the densest
 * copy on the page. Reading the corpus instead measures what the reviewer is
 * actually approving. `extractCopy` already resolves every reader-visible string
 * (it feeds `content_hash`), so this module classifies its output rather than
 * walking the page a third time.
 *
 * Heading nesting, alt text, tables and videos stay on the DOM — see
 * `domChecks.ts`. Those are properties of markup, not of copy.
 */

import { extractCopy, type CorpusPage } from '$lib/corpus/fields';
import { withoutMarkdownLinks } from './markdown';

/**
 * What a string is for, which decides whether it is scored as prose.
 *
 * - `heading` — counted as prose, and terminated like a sentence. Karl Jr.'s
 *   text walk gives `h1`–`h6` block breaks for the same reason.
 * - `prose` — body copy.
 * - `label` — button and link text. Excluded from the score (the extension skips
 *   `button` elements), but this is what the vague-link-text check reads.
 * - `url` — a link destination. Never scored; checked for shape only.
 * - `meta` — SEO and routing strings a page reader never sees.
 */
export type CopyKind = 'heading' | 'prose' | 'label' | 'url' | 'meta';

export type CopyEntry = {
	/** The `extractCopy` key. Matches `edits.field_id` for the subset that are edit targets. */
	key: string;
	text: string;
	kind: CopyKind;
};

const META_KEYS = new Set(['seoTitle', 'metaDescription', 'topicTag', 'reportDate']);

const HEADING_PATTERNS = [
	/^title$/,
	/(^|\.)heading$/,
	/\.callout\.title$/,
	/\.steps\.\d+\.title$/,
	/^spotlight\.title$/,
	/\.facts\.\d+\.label$/,
	/^whatToKnow\.thingsToKnow\.\d+\.label$/
];

const LABEL_PATTERNS = [/(^|\.)button$/, /\.cards\.\d+\.title$/, /^partnerAgencies\.\d+\.title$/];

const URL_PATTERNS = [/(^|\.)buttonUrl$/, /(^|\.)url$/, /^contact\.(email|phone)\.\d+$/];

/** Classify one `extractCopy` key. Order matters: URL and label beat heading. */
export function classifyKey(key: string): CopyKind {
	if (META_KEYS.has(key)) return 'meta';
	if (URL_PATTERNS.some((re) => re.test(key))) return 'url';
	if (LABEL_PATTERNS.some((re) => re.test(key))) return 'label';
	if (HEADING_PATTERNS.some((re) => re.test(key))) return 'heading';
	return 'prose';
}

/**
 * One `edits` row, narrowed to what this module needs. Matches the shape
 * `HelpPanel` folds, so the two readers cannot drift on what an edit means.
 */
export type EditRow = { field_id: string; new_content: string; created_at?: string | null };

/**
 * The page's copy with the reviewer's saved edits applied.
 *
 * `edits` is append-only and last-write-wins — the same fold `HelpPanel` does,
 * and for the same reason: the table has no UPDATE policy, so a field can carry
 * several rows and only the newest is current. Rows are sorted by `created_at`
 * explicitly rather than trusting PostgREST's return order.
 *
 * An edit whose `field_id` is not a key of the corpus copy is still applied. It
 * would otherwise vanish from the score while being visible on the page, which
 * is the failure this whole module exists to avoid.
 */
export function analyzableCopy(page: CorpusPage, edits: EditRow[] = []): CopyEntry[] {
	const copy = extractCopy(page);

	const ordered = edits
		.slice()
		.sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));
	for (const edit of ordered) {
		if (typeof edit.new_content === 'string') copy[edit.field_id] = edit.new_content;
	}

	return Object.entries(copy)
		.filter(([, text]) => typeof text === 'string' && text.trim().length > 0)
		.map(([key, text]) => ({ key, text, kind: classifyKey(key) }));
}

/**
 * The text handed to the readability scorer.
 *
 * Joined with a blank line because the scorer treats `\n\n` as a sentence
 * boundary — that is how a heading with no terminal punctuation stops running
 * into the paragraph beneath it and inflating words-per-sentence.
 */
export function readabilityTextFrom(entries: CopyEntry[]): string {
	return entries
		.filter((e) => e.kind === 'heading' || e.kind === 'prose')
		.map((e) => withoutMarkdownLinks(e.text))
		.join('\n\n');
}
