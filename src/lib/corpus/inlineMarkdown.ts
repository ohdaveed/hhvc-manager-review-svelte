/**
 * The two inline constructs the corpus actually uses, tokenized.
 *
 * Measured across all 1290 string fields `extractCopy` emits: 94 `**bold**`
 * and 37 `[label](target)`. Zero italics, zero code spans, zero headings,
 * zero lists. So this is deliberately NOT a markdown parser -- a general one
 * would be more code, would need `{@html}` plus a sanitizer to be safe, and
 * would get the links wrong.
 *
 * Two properties are the whole point:
 *
 * 1. **No HTML is ever produced.** Callers render these tokens as real Svelte
 *    elements, so reviewer-authored edits and AI rewrites -- which flow back
 *    into these same fields and are re-rendered -- have no path to script
 *    execution. A `{@html}` pipeline here would be stored XSS on a signed-in
 *    tool.
 * 2. **A link target is not a URL.** The corpus writes `[What happens after
 *    you report...](afterReport)`, where `afterReport` is an internal page
 *    key from its own cross-reference vocabulary, not an href. Rendering it
 *    as `<a href="afterReport">` would be a broken relative link AND a second
 *    interactive element with nowhere to go, which is exactly what the axe
 *    pass flags as inert furniture (see ButtonBlock's note on the same call).
 *
 * Unmatched markers are left as literal text rather than throwing: a stray
 * `**` in copy should render as a stray `**`, not break the page.
 */

export type InlineToken =
	| { kind: 'text'; text: string }
	| { kind: 'bold'; text: string }
	| { kind: 'ref'; text: string; target: string };

/**
 * `**bold**` or `[label](target)`. Lazy inner match so `**a** and **b**` is
 * two tokens, not one spanning both. `[\s\S]` rather than `.` because a few
 * corpus strings wrap across lines.
 */
const INLINE = /\*\*([\s\S]+?)\*\*|\[([^\]]+)\]\(([^)]*)\)/g;

export function parseInline(source: unknown): InlineToken[] {
	if (typeof source !== 'string' || source === '') return [];

	const tokens: InlineToken[] = [];
	let cursor = 0;

	for (const match of source.matchAll(INLINE)) {
		const at = match.index ?? 0;
		if (at > cursor) tokens.push({ kind: 'text', text: source.slice(cursor, at) });

		if (match[1] !== undefined) {
			tokens.push({ kind: 'bold', text: match[1] });
		} else {
			tokens.push({ kind: 'ref', text: match[2], target: match[3] });
		}

		cursor = at + match[0].length;
	}

	if (cursor < source.length) tokens.push({ kind: 'text', text: source.slice(cursor) });
	return tokens;
}

/**
 * The visible text with markers removed -- what a reader sees, and what a
 * test should assert against. Not used for rendering (that walks the tokens
 * so bold stays bold); it exists so callers needing a plain string, like an
 * `aria-label` or a title attribute, do not re-implement the strip.
 */
export function plainText(source: unknown): string {
	return parseInline(source)
		.map((token) => token.text)
		.join('');
}
