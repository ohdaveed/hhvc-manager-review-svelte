/**
 * How the Karl outline reaches the mockup's components.
 *
 * Placements need the review record, which only the review layout has, while
 * the elements that carry them -- `EditTarget`, `Section` -- sit several
 * components down inside the route's `Page`. Context rather than props, so no
 * block component between them changes its signature.
 *
 * `placements` is `null` whenever the outline is off, on a draft route, or
 * outside the review layout (the design-system specimen page renders the same
 * components with no layout above it).
 */
import { getContext, setContext } from 'svelte';
import type { PagePlacements } from './placement';

const KEY = Symbol('karl-outline');

export type OutlineContext = {
	readonly placements: PagePlacements | null;
	/**
	 * The same placements whether the outline is on or off (still `null` on a
	 * draft). Read only for the section pill beside Rethink, which flags a
	 * Karl-mapping gap without the reviewer opening the outline.
	 */
	readonly always?: PagePlacements | null;
};

export const setOutlineContext = (context: OutlineContext): OutlineContext =>
	setContext(KEY, context);

export const outlineContext = (): OutlineContext | undefined =>
	getContext<OutlineContext | undefined>(KEY);
