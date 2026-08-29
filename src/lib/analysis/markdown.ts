/**
 * The small amount of markdown the corpus writes inside otherwise-plain copy.
 *
 * `src/lib/data/*.ts` uses `[label](url)` for links and `**text**` for emphasis
 * — see `integrated-pest-management-property-managers.ts`, which carries five
 * markdown links. Every analysis in this directory has to agree on how to read
 * them, so the reading lives here rather than being re-implemented per check:
 * the readability scorer measures the label a reader sees, the link-text check
 * reads the same label, and the bare-URL check must not fire on a URL that is
 * already properly labelled.
 */

/** `[label](url)`. Global, so `matchAll` and `replace` both work. */
export const MARKDOWN_LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

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
