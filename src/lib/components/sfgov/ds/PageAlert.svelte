<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { AlertKind } from './types';

	/**
	 * Page-level alert. An 8px colour bar, a solid glyph, a heading and a line.
	 *
	 * Rules the frames settle:
	 * - One page alert per page. It is the loudest thing at its level.
	 * - Colour never carries the meaning alone: the bar is always paired with a
	 *   glyph and a heading.
	 *
	 * The four filled status glyphs are drawn inline rather than loaded from
	 * `assets/icons/`. The SFDS set is outlines only, and an outline mark at
	 * 24px next to an 8px solid bar reads as a different component.
	 *
	 * WCAG 2.1 AA:
	 * - 4.1.3 Status Messages. `role="alert"` for danger (assertive — it
	 *   interrupts), `role="status"` for everything else (polite). An archive
	 *   notice that interrupts a screen reader mid-sentence is worse than one
	 *   that waits.
	 * - 1.4.1 Use of Colour. Bar + glyph + heading text; hue is the fourth
	 *   carrier, not the first.
	 * - 1.4.3 Contrast. Body copy is --site-ink on the tint, 15:1 or better in
	 *   all five kinds. The bar colours are decoration and carry no text.
	 * - 4.1.2. The dismiss control is a real button with an accessible name.
	 */
	interface Props {
		kind?: AlertKind;
		title?: string;
		dismissible?: boolean;
		onDismiss?: () => void;
		class?: string;
		children: Snippet;
	}

	let {
		kind = 'information',
		title,
		dismissible = false,
		onDismiss,
		class: className = '',
		children
	}: Props = $props();
</script>

<div
	role={kind === 'danger' ? 'alert' : 'status'}
	data-kind={kind}
	class="ds-alert flex items-stretch {className}"
>
	<div class="ds-bar flex-none" aria-hidden="true"></div>
	<div class="ds-body flex flex-1 items-start gap-3">
		<svg
			width="24"
			height="24"
			viewBox="0 0 20 20"
			fill="none"
			aria-hidden="true"
			class="ds-glyph flex-none"
		>
			{#if kind === 'success'}
				<path d="M2 11L7 16L18 4" stroke="currentColor" stroke-width="2" />
			{:else if kind === 'warning'}
				<path
					d="M11 15C11 15.5523 10.5523 16 10 16C9.44772 16 9 15.5523 9 15C9 14.4477 9.44772 14 10 14C10.5523 14 11 14.4477 11 15Z"
					fill="currentColor"
				/>
				<path
					fill-rule="evenodd"
					clip-rule="evenodd"
					d="M10.0002 0.875L19.6668 19H0.333496L10.0002 0.875ZM3.66683 17H16.3335L10.0002 5.125L3.66683 17Z"
					fill="currentColor"
				/>
				<path
					fill-rule="evenodd"
					clip-rule="evenodd"
					d="M9 13L9 9L11 9L11 13L9 13Z"
					fill="currentColor"
				/>
			{:else if kind === 'danger'}
				<circle cx="10" cy="10" r="8" fill="currentColor" />
				<rect x="9" y="4.5" width="2" height="8" fill="#FCFCFC" />
				<rect x="9" y="13.5" width="2" height="2" fill="#FCFCFC" />
			{:else if kind === 'archive'}
				<rect x="3" y="6" width="14" height="11" stroke="currentColor" stroke-width="2" />
				<path d="M2 3H18V6H2V3Z" fill="currentColor" />
				<path d="M8 10H12" stroke="currentColor" stroke-width="2" />
			{:else}
				<circle cx="10" cy="10" r="8" fill="currentColor" />
				<rect x="9" y="4.5" width="2" height="2" fill="#FCFCFC" />
				<rect x="9" y="7.5" width="2" height="8" fill="#FCFCFC" />
			{/if}
		</svg>

		<div class="flex min-w-0 flex-1 flex-col gap-2">
			{#if title}
				<h3 class="ds-title m-0 text-xl leading-7 font-bold">{title}</h3>
			{/if}
			<p class="ds-text m-0 text-base leading-6">{@render children()}</p>
		</div>

		{#if dismissible}
			<button type="button" class="ds-dismiss flex-none" aria-label="Dismiss" onclick={onDismiss}>
				<svg width="24" height="24" viewBox="0 0 20 20" fill="none" aria-hidden="true">
					<path d="M3 3L17 17M17 3L3 17" stroke="currentColor" stroke-width="2" />
				</svg>
			</button>
		{/if}
	</div>
</div>

<style>
	.ds-alert {
		font-family: var(--site-font-body);
	}

	.ds-bar {
		width: 8px;
	}

	.ds-body {
		padding: 28px;
	}

	.ds-title,
	.ds-text {
		color: var(--color-site-ink, #0b0c0c);
	}

	.ds-alert[data-kind='information'] .ds-bar {
		background: var(--color-site-info, #0046c2);
	}
	.ds-alert[data-kind='information'] .ds-body {
		background: var(--color-site-info-bg, #e5f1ff);
	}
	.ds-alert[data-kind='information'] .ds-glyph {
		color: var(--color-site-info, #0046c2);
	}

	.ds-alert[data-kind='success'] .ds-bar {
		background: var(--color-site-success, #026800);
	}
	.ds-alert[data-kind='success'] .ds-body {
		background: var(--color-site-success-bg, #e8f5e2);
	}
	.ds-alert[data-kind='success'] .ds-glyph {
		color: var(--color-site-success, #026800);
	}

	.ds-alert[data-kind='warning'] .ds-bar {
		background: var(--color-site-warning, #843f00);
	}
	.ds-alert[data-kind='warning'] .ds-body {
		background: var(--color-site-warning-bg, #faefe1);
	}
	.ds-alert[data-kind='warning'] .ds-glyph {
		color: var(--color-site-warning, #843f00);
	}

	.ds-alert[data-kind='danger'] .ds-bar {
		background: var(--color-site-danger, #ac0000);
	}
	.ds-alert[data-kind='danger'] .ds-body {
		background: var(--color-site-danger-bg, #ffeae5);
	}
	.ds-alert[data-kind='danger'] .ds-glyph {
		color: var(--color-site-danger, #ac0000);
	}

	.ds-alert[data-kind='archive'] .ds-bar {
		background: var(--color-site-archive, #843f00);
	}
	.ds-alert[data-kind='archive'] .ds-body {
		background: var(--color-site-archive-bg, #faefe1);
	}
	.ds-alert[data-kind='archive'] .ds-glyph {
		color: var(--color-site-archive, #843f00);
	}

	.ds-dismiss {
		padding: 0;
		border: 0;
		background: none;
		line-height: 0;
		color: var(--color-site-action, #1b519e);
		cursor: pointer;
		border-radius: 2px;
	}

	/* The ring's first stop is the alert's own tint, not the page — each kind
	   overrides it below so the gap reads on the coloured ground. */
	.ds-dismiss:focus-visible {
		outline: none;
		box-shadow:
			0 0 0 4px var(--ds-alert-bg, #ffffff),
			0 0 0 7px var(--color-site-focus, #386ebf);
	}
	.ds-alert[data-kind='information'] .ds-dismiss {
		--ds-alert-bg: var(--color-site-info-bg, #e5f1ff);
	}
	.ds-alert[data-kind='success'] .ds-dismiss {
		--ds-alert-bg: var(--color-site-success-bg, #e8f5e2);
	}
	.ds-alert[data-kind='warning'] .ds-dismiss {
		--ds-alert-bg: var(--color-site-warning-bg, #faefe1);
	}
	.ds-alert[data-kind='danger'] .ds-dismiss {
		--ds-alert-bg: var(--color-site-danger-bg, #ffeae5);
	}
	.ds-alert[data-kind='archive'] .ds-dismiss {
		--ds-alert-bg: var(--color-site-archive-bg, #faefe1);
	}
</style>
