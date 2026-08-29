<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * The field-level error line. Exported separately because Svelte is one
	 * component per file; in the JSX this lives inside TextField.jsx.
	 *
	 * Rules:
	 * - Errors are 2px, not colour. The field border doubles in width, a solid
	 *   glyph appears, and the message says what to do. "Invalid" is not a
	 *   message.
	 *
	 * WCAG 2.1 AA:
	 * - 1.4.1 Use of Colour. The 2px border and the filled glyph are the
	 *   non-colour carriers; red alone would fail.
	 * - 4.1.3 Status Messages. The host field wires `aria-describedby` and
	 *   `aria-invalid`; this element carries no live region of its own, because
	 *   an error that appears on submit is announced by the field taking focus,
	 *   and a live region would double-announce it.
	 * - The glyph is `aria-hidden` — it repeats the message, which is text.
	 */
	interface Props {
		id?: string;
		children: Snippet;
	}

	let { id, children }: Props = $props();
</script>

<span {id} class="ds-error flex items-start gap-2 text-sm leading-5 font-bold">
	<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" class="flex-none">
		<circle cx="10" cy="10" r="8" fill="currentColor" />
		<rect x="9" y="4.5" width="2" height="8" fill="#FFFFFF" />
		<rect x="9" y="13.5" width="2" height="2" fill="#FFFFFF" />
	</svg>
	{@render children()}
</span>

<style>
	.ds-error {
		font-family: var(--site-font-body);
		color: var(--color-site-danger, #ac0000);
	}
</style>
