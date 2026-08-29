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
import { withoutMarkdownLinks } from '$lib/corpus/markdown';

export type CopyKind = 'heading' | 'prose' | 'label' | 'url' | 'meta';
export type CopyEntry = { key: string; text: string; kind: CopyKind };

const META_KEYS = new Set(['seoTitle', 'metaDescription', 'topicTag', 'reportDate']);
const HEADING_PATTERNS = [/^title$/, /(^|\.)heading$/, /\.callout\.title$/, /\.steps\.\d+\.title$/, /^spotlight\.title$/, /\.facts\.\d+\.label$/, /^whatToKnow\.thingsToKnow\.\d+\.label$/];
const LABEL_PATTERNS = [/(^|\.)button$/, /\.cards\.\d+\.title$/, /^partnerAgencies\.\d+\.title$/];
const URL_PATTERNS = [/(^|\.)buttonUrl$/, /(^|\.)url$/, /^contact\.(email|phone)\.\d+$/];

export function classifyKey(key: string): CopyKind {
	if (META_KEYS.has(key)) return 'meta';
	if (URL_PATTERNS.some((re) => re.test(key))) return 'url';
	if (LABEL_PATTERNS.some((re) => re.test(key))) return 'label';
	if (HEADING_PATTERNS.some((re) => re.test(key))) return 'heading';
	return 'prose';
}

export type EditRow = { field_id: string; new_content: string; created_at?: string | null };

export function analyzableCopy(page: CorpusPage, edits: EditRow[] = []): CopyEntry[] {
	const copy = extractCopy(page);
	const ordered = edits.slice().sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));
	for (const edit of ordered) {
		if (typeof edit.new_content === 'string') copy[edit.field_id] = edit.new_content;
	}
	return Object.entries(copy)
		.filter(([, text]) => typeof text === 'string' && text.trim().length > 0)
		.map(([key, text]) => ({ key, text, kind: classifyKey(key) }));
}

export function readabilityTextFrom(entries: CopyEntry[]): string {
	return entries
		.filter((e) => e.kind === 'heading' || e.kind === 'prose')
		.map((e) => {
			const text = withoutMarkdownLinks(e.text);
			const step = e.key.match(/\.steps\.(\d+)\./);
			if (step) return `${Number(step[1]) + 1}. ${text}`;
			if (/\.bullets\.\d+\./.test(e.key)) return `- ${text}`;
			return text;
		})
		.join('\n\n');
}
