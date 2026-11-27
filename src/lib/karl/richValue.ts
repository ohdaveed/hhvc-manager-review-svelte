/**
 * A Karl value, read as the formatted text it stands for.
 *
 * The transcript hands the Build in Karl view each value as the corpus wrote
 * it: markdown in a plain string. Shown raw, an editor was reading and copying
 * `[Health Code](https://…)`, `**What you saw:**` and `- ` into Karl. This
 * turns the string into blocks, once, so the view can draw it as text, put a
 * clean copy on the clipboard, and say which links Karl needs.
 *
 * The constructs are the ones a survey of every panel value in the corpus
 * found (2026-11-27), and no others: paragraphs split by blank lines, `- `
 * bullets, `1. ` numbered items, and the two inline forms `tokenizeMarkdown`
 * already reads (`**bold**`, `[label](target)`). No headings, tables or
 * nesting occur; a line that is none of these stays a paragraph line, so an
 * unknown construct shows as its own text rather than vanishing.
 *
 * Links keep their DESTINATION KIND, because Karl's link tool asks for it:
 * "Internal link if the page you are linking to is on SF.gov", "External link
 * if you're linking to a page on another website" (Karl help centre, "Body,
 * Main body, Text and title"). An internal link is a page picked in Karl's
 * chooser, so no clipboard can carry it; an external one is a URL, which can.
 */
import { resolveLinkTarget, type LinkDestination } from '$lib/corpus/links';
import { tokenizeMarkdown } from '$lib/corpus/markdown';

export type RichInline =
	| { kind: 'text'; text: string }
	| { kind: 'strong'; text: string }
	| { kind: 'link'; text: string; to: LinkDestination };

export type RichBlock =
	/** One paragraph; more than one entry in `lines` is a soft line break. */
	{ kind: 'p'; lines: RichInline[][] } | { kind: 'ul' | 'ol'; items: RichInline[][] };

const BULLET = /^- +(.*)$/;
const NUMBERED = /^\d+\. +(.*)$/;

const inline = (text: string): RichInline[] =>
	tokenizeMarkdown(text).map((token) =>
		token.kind === 'link'
			? { kind: 'link', text: token.text, to: resolveLinkTarget(token.target) }
			: token
	);

/** Split a value into paragraphs and lists, each line read for bold and links. */
export function parseRichValue(value: string): RichBlock[] {
	const blocks: RichBlock[] = [];
	let open: RichBlock | null = null;
	const push = (kind: RichBlock['kind'], content: RichInline[]) => {
		if (open?.kind !== kind) {
			open = kind === 'p' ? { kind, lines: [] } : { kind, items: [] };
			blocks.push(open);
		}
		if (open.kind === 'p') open.lines.push(content);
		else open.items.push(content);
	};

	for (const raw of String(value ?? '').split('\n')) {
		const line = raw.trim();
		if (!line) {
			open = null;
			continue;
		}
		const bullet = BULLET.exec(line);
		const numbered = bullet ? null : NUMBERED.exec(line);
		if (bullet) push('ul', inline(bullet[1]));
		else if (numbered) push('ol', inline(numbered[1]));
		else push('p', inline(line));
	}
	return blocks;
}

const rows = (block: RichBlock) => (block.kind === 'p' ? block.lines : block.items);

/**
 * The value as plain text: the words only, one paragraph or list item per
 * line. No list markers, because Karl makes a list from selected lines ("Select
 * your text, and then click the insert bulleted list button"), and a pasted
 * dash would have to be deleted from each one. Single newlines, not blank
 * lines, which would paste as empty paragraphs between the real ones.
 */
export function plainTextOf(blocks: readonly RichBlock[]): string {
	return blocks
		.flatMap((block) => rows(block).map((row) => row.map((part) => part.text).join('')))
		.join('\n');
}

const escapeHtml = (text: string) =>
	text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const inlineHtml = (row: readonly RichInline[]) =>
	row
		.map((part) => {
			const text = escapeHtml(part.text);
			if (part.kind === 'strong') return `<strong>${text}</strong>`;
			// Only an external link is an anchor. An internal one would have to
			// point somewhere, and the only address this tool has for the page is
			// its own review URL, which must never be pasted into SF.gov.
			if (part.kind === 'link' && part.to.kind === 'external')
				return `<a href="${escapeHtml(part.to.href)}">${text}</a>`;
			return text;
		})
		.join('');

/**
 * The value as bare semantic HTML for the clipboard's `text/html` flavour:
 * `<p>`, `<ul>`/`<ol>`, `<strong>` and external `<a href>`, with no classes or
 * styles, so a rich text field receives structure and nothing of this tool's
 * look. Every string is escaped; nothing here is ever parsed back into the DOM.
 */
export function clipboardHtmlOf(blocks: readonly RichBlock[]): string {
	return blocks
		.map((block) =>
			block.kind === 'p'
				? `<p>${block.lines.map(inlineHtml).join('<br>')}</p>`
				: `<${block.kind}>${block.items.map((item) => `<li>${inlineHtml(item)}</li>`).join('')}</${block.kind}>`
		)
		.join('');
}

/** Every link in the value, in reading order, with where it goes. */
export function linksOf(blocks: readonly RichBlock[]): { text: string; to: LinkDestination }[] {
	return blocks.flatMap((block) =>
		rows(block).flatMap((row) =>
			row.flatMap((part) => (part.kind === 'link' ? [{ text: part.text, to: part.to }] : []))
		)
	);
}

/**
 * Whether the value carries any formatting at all. A plain one-line value (a
 * title, a page name) needs no `text/html` flavour, and giving it one would
 * paste a `<p>` into a single-line field.
 */
export function isFormatted(blocks: readonly RichBlock[]): boolean {
	if (blocks.length !== 1) return blocks.length > 1;
	const [only] = blocks;
	if (only.kind !== 'p' || only.lines.length > 1) return true;
	return only.lines[0].some((part) => part.kind !== 'text');
}
