/**
 * Where a markdown link's target points.
 *
 * The corpus writes three kinds of target, and they are exactly the three
 * `karl-transcript.js`'s `linkRepresentation` has always recognised — that
 * function is the older definition and this one agrees with it deliberately,
 * so the Karl transcript and the rendered page cannot disagree about what a
 * link means:
 *
 * | Target             | Count | Karl representation                    |
 * | ------------------ | ----- | -------------------------------------- |
 * | `pagesByKey` key   |    27 | rich text Link tool -> Internal link   |
 * | `https://…`        |     9 | rich text Link tool -> External link   |
 * | `#`                |     1 | inert sentinel; no destination yet     |
 *
 * `#` is not a broken link and must not render as one: the mockups use it where
 * a destination is known to be needed but has not been decided. It renders as
 * plain label text, which is what an editor would see before choosing a page in
 * Karl's link chooser.
 *
 * This module resolves to a SLUG rather than a URL. Building the path is the
 * component's job, through `resolve('/review/[slug]', …)`, so this stays free
 * of `$app` imports and testable in the node project.
 */

import { pagesByKey } from '$lib/data';
import { routableId } from './pageId';

export type LinkDestination =
	/** An `http(s)` address. Opens away from the review tool. */
	| { kind: 'external'; href: string }
	/** Another page in this corpus. `slug` feeds `/review/[slug]`. */
	| { kind: 'internal'; slug: string; title: string }
	/** The `#` sentinel: a link with no destination chosen yet. */
	| { kind: 'inert' }
	/** Neither a corpus page key nor an http(s) URL. Rendered as plain text and flagged. */
	| { kind: 'unresolved'; target: string };

export function resolveLinkTarget(target: string): LinkDestination {
	if (target === '#') return { kind: 'inert' };
	if (/^https?:\/\//.test(target)) return { kind: 'external', href: target };

	const page = (pagesByKey as Record<string, { slug?: unknown; title?: unknown }>)[target];
	if (page) {
		return {
			kind: 'internal',
			slug: routableId(page),
			title: typeof page.title === 'string' ? page.title : target
		};
	}

	return { kind: 'unresolved', target };
}
