/**
 * Deterministic field ids for label/input pairing.
 *
 * A module counter rather than `Math.random()` or `crypto.randomUUID()`: those
 * produce a different value on the server than in the browser, and SvelteKit
 * hydration then warns about an attribute mismatch on every field. The counter
 * increments in render order, which is identical on both sides.
 *
 * `$props.id()` supersedes this on Svelte 5.20+; this keeps the components
 * working on earlier 5.x without a version floor.
 */
let n = 0;

export function nextFieldId(prefix = 'ds'): string {
	n += 1;
	return `${prefix}-${n}`;
}

/** Test-only. Resets the counter so ids are stable across test cases. */
export function __resetFieldIds(): void {
	n = 0;
}
