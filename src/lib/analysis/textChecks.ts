/**
 * The copy-level half of Karl Jr.'s accessibility tests: link text, buttons, and
 * URLs pasted into prose.
 *
 * The word lists are the extension's, transcribed verbatim from v0.6.0 so the
 * two tools flag the same strings. They are lists rather than heuristics on
 * purpose — "more" is vague as a whole link label and perfectly fine inside one,
 * which is why every comparison below is against the TRIMMED, LOWERCASED WHOLE
 * label and never a substring search.
 *
 * These run over corpus copy rather than the DOM (see `pageCopy.ts`), which is
 * what lets them see a `steps[].button` label — markup the mockup renderer never
 * emits, and therefore something the extension could not check here even if it
 * could run on this app at all.
 */

import type { CopyEntry } from './pageCopy';
import { markdownLinksIn, normalizeLabel, withoutMarkdownLinks } from '$lib/corpus/markdown';

/** Link labels the extension treats as uninformative. */
const VAGUE_LINK_TEXT = [
	'click here',
	'read more',
	'more',
	'here',
	'info',
	'link',
	'this',
	'continue',
	'learn more'
];

/** Button labels the extension treats as uninformative. */
const VAGUE_BUTTON_TEXT = [
	'click',
	'click here',
	'submit',
	'go',
	'ok',
	'yes',
	'no',
	'button',
	'press',
	'continue',
	'next',
	'back',
	'more'
];

/** A pasted web address. Global: a field can carry more than one. */
const RAW_URL_ALL = /(?:https?:\/\/|www\.)\S+/gi;
const EMAIL_ONLY = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The corpus writes links as markdown inside body copy, which matters twice and
 * fails in both directions if ignored. Scanning for bare URLs without reducing
 * them first reports every properly-labelled link as a URL pasted into text —
 * nine such false positives across three pages on the corpus as it stands. And
 * the labels inside them are the only real link text most of these pages have,
 * since `section.button` is a call to action rather than a link, so a vague-text
 * check that skips them checks almost nothing. See `markdown.ts`.
 */

/** How many labels a page has to check — link labels plus button labels. */
export function labelCount(entries: CopyEntry[]): number {
	let total = 0;
	for (const entry of entries) {
		if (entry.kind === 'label') total += 1;
		else if (entry.kind === 'prose' || entry.kind === 'heading') {
			total += markdownLinksIn(entry.text).length;
		}
	}
	return total;
}

export type TextIssue = {
	/** The `extractCopy` key the issue was found on — addressable, so the panel can name the field. */
	key: string;
	/** The offending string, trimmed for display. */
	text: string;
	/** Extra context the panel renders under the finding, when there is any. */
	detail?: string;
};

/**
 * A label a screen-reader user would hear out of context and learn nothing from.
 *
 * `label` entries are `button`, `steps[].button`, `cards[].title` and
 * `partnerAgencies[].title` — everything in the corpus that becomes a link or a
 * button. The comparison strips markdown emphasis first, because the corpus
 * writes `**Notify your landlord:**` inline and a label carrying it would never
 * match a bare list entry.
 */
export function vagueLabels(entries: CopyEntry[]): TextIssue[] {
	const issues: TextIssue[] = [];
	for (const entry of entries) {
		if (entry.kind === 'label') {
			const normalized = normalizeLabel(entry.text);
			if (normalized === '') {
				issues.push({
					key: entry.key,
					text: '(empty)',
					detail: 'This control has no label at all.'
				});
				continue;
			}
			const isButton = /(^|\.)button$/.test(entry.key);
			const list = isButton ? VAGUE_BUTTON_TEXT : VAGUE_LINK_TEXT;
			if (list.includes(normalized)) {
				issues.push({
					key: entry.key,
					text: entry.text.trim(),
					detail: isButton
						? 'Say what the button does, not how to operate it.'
						: 'Say where the link goes.'
				});
			}
			continue;
		}

		// Markdown links inside body copy. Checked against the LINK list, never
		// the button list: these render as links, and "continue" reads very
		// differently as a link label than on a button.
		if (entry.kind !== 'prose' && entry.kind !== 'heading') continue;
		for (const link of markdownLinksIn(entry.text)) {
			const normalized = normalizeLabel(link.label);
			if (normalized === '') {
				issues.push({
					key: entry.key,
					text: '(empty)',
					detail: `Empty link label on ${link.url}.`
				});
			} else if (VAGUE_LINK_TEXT.includes(normalized)) {
				issues.push({
					key: entry.key,
					text: link.label.trim(),
					detail: `Links to ${link.url}. Say where the link goes.`
				});
			}
		}
	}
	return issues;
}

/**
 * A URL written out in body copy instead of being attached to descriptive text.
 *
 * Bare email addresses are exempt: `contact.email.*` is a URL-kind entry and a
 * mailto is how you are meant to publish one. Only prose and headings are
 * scanned, so a `buttonUrl` — which is supposed to be a URL — is never flagged.
 */
export function rawUrlsInProse(entries: CopyEntry[]): TextIssue[] {
	const issues: TextIssue[] = [];
	for (const entry of entries) {
		if (entry.kind !== 'prose' && entry.kind !== 'heading') continue;
		const trimmed = withoutMarkdownLinks(entry.text).trim();
		if (EMAIL_ONLY.test(trimmed)) continue;
		// Every match, not just the first. The panel derives both its count and
		// its item list from what this returns, so stopping at one URL per field
		// would understate the finding AND leave the later addresses with no
		// actionable item -- a paragraph with three pasted URLs would report one.
		for (const match of trimmed.matchAll(RAW_URL_ALL)) {
			issues.push({
				key: entry.key,
				text: match[0],
				detail: 'Link descriptive text to this address instead of printing it.'
			});
		}
	}
	return issues;
}

/**
 * Paragraphs over the length Karl's plain-language guidance allows.
 *
 * "Use less than 3 sentences per paragraph" is the rule on *How to write in
 * plain language*; the extension flags at more than 3. The stricter published
 * rule is used here, and the finding says which number it applied so a reviewer
 * comparing the two tools is not left guessing.
 *
 * Headings are exempt — a heading is not a paragraph, and one long enough to
 * trip a sentence count is its own, different problem.
 */
export function longParagraphs(entries: CopyEntry[], maxSentences = 3): TextIssue[] {
	const issues: TextIssue[] = [];
	for (const entry of entries) {
		if (entry.kind !== 'prose') continue;
		// Measured on the rendered reading, so a long URL inside a markdown link
		// does not read as a sentence boundary at every dot in the hostname.
		const sentences = withoutMarkdownLinks(entry.text)
			.split(/[.!?]+/)
			.map((s) => s.trim())
			.filter((s) => s.length > 0);
		if (sentences.length > maxSentences) {
			issues.push({
				key: entry.key,
				text: entry.text.trim(),
				detail: `${sentences.length} sentences — aim for ${maxSentences} or fewer.`
			});
		}
	}
	return issues;
}
