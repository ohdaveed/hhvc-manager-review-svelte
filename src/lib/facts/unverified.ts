/**
 * Every corpus entry flagged `unverified: true`, with the address an open
 * question in `./registry` uses to point at it.
 *
 * The address is the raw object path (`sections.3.bullets.1`), not a field id.
 * Field ids key sections by heading and only cover reader-visible copy, while a
 * flag can sit on a step bullet or a top-fact; the raw path reaches all of them
 * and is what `registry.test.ts` compares against.
 */

/* eslint-disable-next-line @typescript-eslint/no-explicit-any --
   corpus modules are plain untyped objects; same scoped boundary as
   $lib/analysis/karlComponentChecks.ts. */
type AnyNode = any;

export type UnverifiedEntry = {
	slug: string;
	path: string;
	text: string;
	reason: string;
};

/** Annotations quote copy; walking them would report the same flag twice. */
const SKIP = new Set(['karl', 'editorNote']);

export function findUnverified(pages: readonly AnyNode[]): UnverifiedEntry[] {
	const out: UnverifiedEntry[] = [];
	const walk = (node: AnyNode, path: string[], slug: string) => {
		if (Array.isArray(node)) {
			node.forEach((v, i) => walk(v, [...path, String(i)], slug));
			return;
		}
		if (!node || typeof node !== 'object') return;
		if (node.unverified === true) {
			out.push({
				slug,
				path: path.join('.'),
				text: String(node.text ?? node.title ?? node.label ?? ''),
				reason: String(node.unverifiedReason ?? '')
			});
		}
		for (const [key, value] of Object.entries(node)) {
			if (!SKIP.has(key)) walk(value, [...path, key], slug);
		}
	};
	for (const page of pages) walk(page, [], String(page?.slug ?? ''));
	return out;
}
