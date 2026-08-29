/**
 * The small amount of markdown the corpus writes inside otherwise-plain strings.
 *
 * `src/lib/data/*.ts` uses exactly two constructs, and a survey of all 29 pages
 * confirms there are no others — no italics, no `__bold__`, no `#` headings, and
 * the backticks in the tree are all inside `karl`/`editorNote` annotations,
 * which are never rendered as page copy:
 *
 * - `**bold**` emphasis, mostly as bullet lead-ins. 50 rendered fields carry it.
 * - `[label](target)` links. 37 in all, 30 of them in fields the page renders.
 *
 * Everything that reads corpus copy has to agree on how these are read, so the
 * reading lives here rather than being re-implemented per consumer: the
 * renderer shows the label, the readability scorer measures the label, the
 * link-text check judges the label, and the bare-URL check must not fire on a
 * URL that is already properly labelled.
 *
 * The link pattern is deliberately the same one `karl-legacy-core`'s
 * `extractInlineLinks` has always used — `\(([^)]+)\)`, permitting any
 * character but the closing paren. An earlier, narrower version here excluded
 * whitespace, which agreed with it on every target in the corpus but was a
 * second definition of the same thing, and the Karl transcript is the older
 * and more authoritative one.
 */

/** `[label](target)`. Global, so `matchAll` and `replace` both work. */
export const MARKDOWN_LINK = /\[([^\]]+)\]\(([^)]+)\)/g;

/** `**bold**`. Non-greedy over a run with no asterisk, so `**a** and **b**` is two spans. */
export const MARKDOWN_STRONG = /\*\*([^*]+)\*\*/g;

/** Both constructs, alternated, for a single left-to-right pass. */
const MARKDOWN_TOKEN = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;

/** Body copy as a reader sees it: markdown links reduced to their label text. */
export function withoutMarkdownLinks(text: string): string {
	return text.replace(MARKDOWN_LINK, '$1');
}

/** Every markdown link in a string, as label/URL pairs. */
export function markdownLinksIn(text: string): { label: string; url: string }[] {
	const links: { label: string; url: string }[] = [];
	for (const match of text.matchAll(MARKDOWN_LINK)) {
		links.push({ label: match[1], url: match[2] });
	}
	return links;
}

/**
 * A label reduced for comparison against the vague-text lists: emphasis markers
 * dropped, trimmed, lowercased, trailing punctuation removed. "Learn more." and
 * "**Learn more**" both have to reach the list as `learn more`.
 */
export function normalizeLabel(text: string): string {
	return text
		.replace(/\*\*/g, '')
		.trim()
		.toLowerCase()
		.replace(/[.:!?]+$/, '');
}

/**
 * One piece of a parsed string.
 *
 * Flat by design: the corpus contains no nested constructs today — no bold
 * inside a link label, no link inside a bold span — and both were checked
 * across all 29 pages. A nested construct would render as literal text, which
 * is what the corpus already does today, rather than silently dropping it.
 */
export type MarkdownToken =
	| { kind: 'text'; text: string }
	| { kind: 'strong'; text: string }
	| { kind: 'link'; text: string; target: string };

/**
 * Split a corpus string into renderable tokens.
 *
 * Returns a single `text` token for a string with no markdown, which is the
 * common case — the renderer then produces exactly the text node it produced
 * before this existed.
 */
export function tokenizeMarkdown(text: string): MarkdownToken[] {
	const tokens: MarkdownToken[] = [];
	let cursor = 0;

	// `matchAll` on a fresh iterator each call; `MARKDOWN_TOKEN` is module-level
	// and global, but `matchAll` clones the regex internally, so `lastIndex` is
	// never shared between calls.
	for (const match of text.matchAll(MARKDOWN_TOKEN)) {
		const start = match.index ?? 0;
		if (start > cursor) tokens.push({ kind: 'text', text: text.slice(cursor, start) });

		if (match[1] !== undefined) tokens.push({ kind: 'link', text: match[1], target: match[2] });
		else tokens.push({ kind: 'strong', text: match[3] });

		cursor = start + match[0].length;
	}

	if (cursor < text.length) tokens.push({ kind: 'text', text: text.slice(cursor) });
	return tokens;
}
