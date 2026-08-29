<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LinkRef, SpotlightTone, SpotlightLayout } from './types';

	/**
	 * Spotlight — the one loud block on a page.
	 *
	 * Rules the frames settle:
	 * - One spotlight per page. Two of anything makes both ordinary.
	 * - Three tones and three layouts. `side` puts a 420px image left of the
	 *   copy, `full` stacks a full-width image above it, `none` is copy only.
	 *
	 * WCAG 2.1 AA:
	 * - 1.4.3 Contrast. The `dark` tone is #FCFCFC on #1B519E — measured 7.53:1,
	 *   over the 4.5:1 floor for the 16px body copy. Do not lighten the fill.
	 * - 1.4.11. On the dark tone the focus ring's first stop becomes white. The
	 *   focus blue is 1.53:1 against the #1B519E fill — under the 3:1 floor for
	 *   the indicator against the component it outlines.
	 * - 2.4.4. The action is an `<a>` styled as a button, so it announces as a
	 *   link and navigates — matching what it actually does.
	 * - 1.1.1. `imageAlt` defaults to empty. A spotlight image is decoration
	 *   beside copy that already says the thing.
	 */
	interface Props {
		tone?: SpotlightTone;
		layout?: SpotlightLayout;
		title: string;
		action?: LinkRef;
		image?: string;
		imageAlt?: string;
		credit?: LinkRef;
		class?: string;
		children: Snippet;
	}

	let {
		tone = 'primary',
		layout = 'side',
		title,
		action,
		image,
		imageAlt = '',
		credit,
		class: className = '',
		children
	}: Props = $props();
</script>

<div class="ds-spot {className}" data-tone={tone} data-layout={layout}>
	{#if layout !== 'none' && image}
		<figure class="ds-figure m-0 flex flex-col gap-3">
			<img src={image} alt={imageAlt} class="ds-img block" />
			{#if credit}
				<figcaption class="ds-credit flex gap-1 text-sm leading-5">
					<span>Photo courtesy of</span>
					<a href={credit.href ?? '#'} class="ds-credit-link">{credit.label}</a>
				</figcaption>
			{/if}
		</figure>
	{/if}

	<div class="ds-copy flex min-w-0 flex-1 flex-col gap-5">
		<div class="flex flex-col gap-3">
			<h2 class="ds-spot-title m-0">{title}</h2>
			<p class="ds-spot-body m-0 text-base leading-6">{@render children()}</p>
		</div>
		{#if action}
			<a
				href={action.href ?? '#'}
				class="ds-spot-action inline-flex items-center justify-center gap-1 self-start"
				>{action.label}</a
			>
		{/if}
	</div>
</div>

<style>
	.ds-spot {
		box-sizing: border-box;
		display: flex;
		gap: 40px;
		padding: 40px;
		border-radius: 4px;
		font-family: var(--site-font-body);
	}

	.ds-spot[data-layout='side'],
	.ds-spot[data-layout='none'] {
		align-items: center;
	}
	.ds-spot[data-layout='full'] {
		flex-direction: column;
		gap: 20px;
	}

	.ds-spot[data-layout='side'] .ds-figure {
		width: 420px;
		flex: none;
	}
	.ds-spot[data-layout='side'] .ds-img {
		width: 420px;
		height: 315px;
		object-fit: cover;
	}

	.ds-spot[data-layout='full'] .ds-figure {
		align-items: flex-end;
	}
	.ds-spot[data-layout='full'] .ds-img {
		width: 100%;
		height: 324px;
		border-radius: 4px;
		object-fit: cover;
	}

	.ds-spot-title {
		font-family: var(--site-font-display);
		font-weight: 600;
		font-size: 32px;
		line-height: 44px;
		text-wrap: pretty;
	}
	.ds-spot-body {
		text-wrap: pretty;
	}

	.ds-spot-action {
		box-sizing: border-box;
		height: var(--site-control-height, 40px);
		padding: 0 16px;
		border: 1px solid;
		border-radius: var(--site-radius, 4px);
		font-weight: 500;
		font-size: 14px;
		line-height: 20px;
		text-decoration: none;
	}

	.ds-spot[data-tone='primary'] {
		background: var(--color-site-spotlight-bg, #e9f1fe);
	}
	.ds-spot[data-tone='primary'] .ds-spot-title {
		color: var(--color-site-spotlight-heading, #001d4e);
	}

	.ds-spot[data-tone='secondary'] {
		background: var(--color-site-tint, #f2f6fc);
	}
	.ds-spot[data-tone='secondary'] .ds-spot-title {
		color: var(--color-site-action-dark, #043578);
	}

	.ds-spot[data-tone='primary'] .ds-spot-body,
	.ds-spot[data-tone='secondary'] .ds-spot-body {
		color: var(--color-site-ink, #0b0c0c);
	}
	.ds-spot[data-tone='primary'] .ds-spot-action,
	.ds-spot[data-tone='secondary'] .ds-spot-action {
		background: var(--color-site-action, #1b519e);
		border-color: var(--color-site-action, #1b519e);
		color: #fcfcfc;
	}
	.ds-spot[data-tone='primary'] .ds-spot-action:hover,
	.ds-spot[data-tone='secondary'] .ds-spot-action:hover {
		background: var(--color-site-action-hover, #001d4e);
		border-color: var(--color-site-action-hover, #001d4e);
	}

	.ds-spot[data-tone='dark'] {
		background: var(--color-site-action, #1b519e);
	}
	.ds-spot[data-tone='dark'] .ds-spot-title,
	.ds-spot[data-tone='dark'] .ds-spot-body {
		color: #fcfcfc;
	}
	.ds-spot[data-tone='dark'] .ds-spot-action {
		background: #fcfcfc;
		border-color: #fcfcfc;
		color: var(--color-site-action, #1b519e);
	}
	.ds-spot[data-tone='dark'] .ds-spot-action:hover {
		background: #ffffff;
		color: var(--color-site-action-hover, #001d4e);
	}

	.ds-credit {
		color: #202121;
	}
	.ds-credit-link {
		color: var(--color-site-action, #1b519e);
		text-decoration: underline;
	}
	.ds-spot[data-tone='dark'] .ds-credit {
		color: #e9eaea;
	}
	.ds-spot[data-tone='dark'] .ds-credit-link {
		color: #fcfcfc;
	}

	.ds-spot-action:focus-visible,
	.ds-credit-link:focus-visible {
		outline: none;
		box-shadow: var(--site-focus-ring, 0 0 0 4px #fcfcfc, 0 0 0 7px #386ebf);
	}
	.ds-spot[data-tone='dark'] .ds-spot-action:focus-visible,
	.ds-spot[data-tone='dark'] .ds-credit-link:focus-visible {
		box-shadow: var(--site-focus-ring-dark, 0 0 0 4px #ffffff, 0 0 0 7px #386ebf);
	}

	@media (max-width: 900px) {
		.ds-spot[data-layout='side'] {
			flex-direction: column;
			align-items: stretch;
		}
		.ds-spot[data-layout='side'] .ds-figure,
		.ds-spot[data-layout='side'] .ds-img {
			width: 100%;
			height: auto;
		}
	}
</style>
