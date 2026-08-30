<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ButtonVariant, DemoState } from './types';

	/**
	 * The public site's button. 40px tall, 4px radius, four variants.
	 *
	 * Rules the frames settle:
	 * - Two control heights exist site-wide — 40px buttons, 48px fields. A third
	 *   height means a component that should have been one of these two.
	 * - One primary button per page. It is the loudest thing at its level, and
	 *   two of them makes both ordinary.
	 * - Sentence case. "Mark copied · next", not "Mark Copied".
	 *
	 * WCAG 2.1 AA:
	 * - 1.4.11 Non-text Contrast. The focus ring is two stops — 4px of ground
	 *   colour, then 3px #386EBF. The first stop assumes the page (#FCFCFC); on
	 *   the navy footer or a filled card `onDark` swaps it to #FFFFFF.
	 *   Measured: #386EBF is 3.90:1 against #000925 and would pass on its own,
	 *   but only 1.53:1 against the #1B519E fill of the button it wraps — and
	 *   1.4.11 asks for contrast against what is ADJACENT, which includes the
	 *   component's own edge. #FFFFFF is 7.53:1 against that fill and 19.2:1
	 *   against the navy, so the white stop is what makes the ring visible.
	 * - 4.1.2 Name, Role, Value. An `iconOnly` button has no text node, so
	 *   `label` is required by the type when `iconOnly` is set.
	 * - 1.4.3 Contrast. Disabled controls are exempt from contrast minimums, and
	 *   #AAABAB on #E9EAEA is below 4.5:1 by design — matching SFDS. Never use
	 *   the disabled skin for a control that is actually operable.
	 */
	interface Base {
		variant?: ButtonVariant;
		disabled?: boolean;
		onDark?: boolean;
		type?: 'button' | 'submit' | 'reset';
		/** Specimen only — see DemoState. Never set this in application code. */
		demoState?: DemoState;
		class?: string;
		onclick?: (event: MouseEvent) => void;
		children: Snippet;
	}

	type Props = Base & ({ iconOnly: true; label: string } | { iconOnly?: false; label?: string });

	let {
		variant = 'primary',
		disabled = false,
		onDark = false,
		iconOnly = false,
		type = 'button',
		label,
		demoState,
		class: className = '',
		onclick,
		children
	}: Props = $props();
</script>

<button
	{type}
	{disabled}
	{onclick}
	aria-label={iconOnly ? label : undefined}
	data-variant={variant}
	data-demo-state={demoState}
	data-on-dark={onDark ? 'true' : undefined}
	class="ds-btn inline-flex flex-none items-center justify-center gap-2 rounded-[4px] border
	       text-sm leading-5 font-medium whitespace-nowrap {className}"
	class:icon-only={iconOnly}
>
	{@render children()}
</button>

<style>
	/* Height, padding and the colour ramps are here rather than in utilities:
	   40px is a token (--site-control-height), and the four variants each need a
	   rest and a hover skin that Tailwind would spell as sixteen arbitrary
	   values. */
	.ds-btn {
		height: var(--site-control-height, 40px);
		padding: 0 16px;
		font-family: var(--site-font-body);
		cursor: pointer;
	}

	.ds-btn.icon-only {
		width: var(--site-control-height, 40px);
		padding: 0;
	}

	.ds-btn[data-variant='primary'] {
		background: var(--color-site-action, #1b519e);
		border-color: var(--color-site-action, #1b519e);
		color: #fcfcfc;
	}
	.ds-btn[data-variant='primary']:hover:not(:disabled),
	.ds-btn[data-variant='primary'][data-demo-state]:not(:disabled) {
		background: var(--color-site-action-hover, #001d4e);
		border-color: var(--color-site-action-hover, #001d4e);
	}

	.ds-btn[data-variant='secondary'] {
		background: var(--color-site-action-soft, #dfebfd);
		border-color: var(--color-site-action-soft, #dfebfd);
		color: var(--color-site-action-dark, #043578);
	}
	.ds-btn[data-variant='secondary']:hover:not(:disabled),
	.ds-btn[data-variant='secondary'][data-demo-state]:not(:disabled) {
		background: var(--color-site-action-soft-strong, #afccf7);
		border-color: var(--color-site-action-soft-strong, #afccf7);
		color: #000925;
	}

	.ds-btn[data-variant='tertiary'] {
		background: transparent;
		border-color: var(--color-site-action, #1b519e);
		color: var(--color-site-action, #1b519e);
	}
	.ds-btn[data-variant='tertiary']:hover:not(:disabled),
	.ds-btn[data-variant='tertiary'][data-demo-state]:not(:disabled) {
		background: var(--color-site-action-soft, #dfebfd);
		border-color: var(--color-site-action-dark, #043578);
		color: var(--color-site-action-dark, #043578);
	}

	.ds-btn[data-variant='ghost'] {
		background: transparent;
		border-color: transparent;
		color: var(--color-site-action, #1b519e);
	}
	.ds-btn[data-variant='ghost']:hover:not(:disabled),
	.ds-btn[data-variant='ghost'][data-demo-state]:not(:disabled) {
		background: var(--color-site-action-soft, #dfebfd);
		color: var(--color-site-action-dark, #043578);
	}

	/* The app's global focus rule (src/app.css) sets `outline-style: solid` on
	   every focusable element and is deliberately unlayered so it outranks the
	   shadcn utilities. That rule paints the REVIEW TOOL's ring, in --ring.
	   These components belong to the public site and carry the site's own
	   two-stop ring, so the outline is suppressed here and replaced. This is the
	   one place a site component overrides tool chrome, and it is scoped to
	   .ds-btn so nothing else is affected. */
	.ds-btn:focus-visible,
	.ds-btn[data-demo-state='focus'] {
		outline: none;
		box-shadow: var(--site-focus-ring, 0 0 0 4px #fcfcfc, 0 0 0 7px #386ebf);
	}

	/* White first stop on dark grounds: the focus blue is only 1.53:1 against a
	   #1B519E button fill, so the white is what carries 1.4.11. */
	.ds-btn[data-on-dark]:focus-visible,
	.ds-btn[data-on-dark][data-demo-state='focus'] {
		box-shadow: var(--site-focus-ring-dark, 0 0 0 4px #ffffff, 0 0 0 7px #386ebf);
	}

	.ds-btn:disabled {
		cursor: default;
	}
	.ds-btn[data-variant='primary']:disabled,
	.ds-btn[data-variant='secondary']:disabled {
		background: #e9eaea;
		border-color: #e9eaea;
		color: #aaabab;
	}
	.ds-btn[data-variant='tertiary']:disabled {
		background: transparent;
		border-color: #c9caca;
		color: #c9caca;
	}
	.ds-btn[data-variant='ghost']:disabled {
		background: transparent;
		border-color: transparent;
		color: #c9caca;
	}
</style>
