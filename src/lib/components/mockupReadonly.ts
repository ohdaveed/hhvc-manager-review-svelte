/**
 * A mockup rendered for reading only.
 *
 * The Blueprint draws the page beside its Karl form so a reviewer can see what
 * the public sees while copying it into Karl. Edit targets there would be a
 * second place to change the copy, one whose unsaved work the review view never
 * shows -- so under this context `EditTarget` and `Section` render as they do
 * signed out: copy, with `data-rewrite-field` kept for locating it, and no
 * controls. Context rather than a prop for the reason `outlineContext` gives:
 * the targets sit several components down inside `Page`.
 */
import { getContext, setContext } from 'svelte';

const KEY = Symbol('mockup-readonly');

export const setMockupReadonly = (): boolean => setContext(KEY, true);

export const isMockupReadonly = (): boolean => getContext<boolean | undefined>(KEY) === true;
