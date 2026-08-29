<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LinkRef } from './types';

	/**
	 * The page masthead: eyebrow, H1, lede, "Part of" link, optional logo, and
	 * an optional header image the title card overlaps.
	 *
	 * Rules the frames settle:
	 * - One H1 per page, sentence case, under 65 characters — longer wraps on a
	 *   phone.
	 * - The description runs under 110 characters: a Topic listing reprints it,
	 *   so it has to work away from the page as well as on it.
	 * - When there is a header image the card lifts 160px into it and insets
	 *   57px each side. Without one the card sits flush and carries no fill.
	 *
	 * WCAG 2.1 AA:
	 * - 1.3.1 Info and Relationships. One `<h1>`, and nothing else in this
	 *   component is a heading — the eyebrow is a `<span>`, not an `<h2>` above
	 *   the title, which would put the page's outline out of order.
	 * - 1.1.1. The header image is decorative page furniture and carries
	 *   `alt=""`; if the image is content, put its meaning in the copy where
	 *   every reader gets it.
	 * - 1.4.10 Reflow. The overlap collapses under 900px so the title card never
	 *   sits on top of the image on a phone.
	 */
	interface Props {
		eyebrow?: string;
		title: string;
		subtitle?: string;
		partOf?: LinkRef;
		/** Rendered as-is at the top right of the card. */
		logo?: Snippet;
		/** URL of the header image. Omit for the flush, image-less header. */
		image?: string;
		imageAlt?: string;
		class?: string;
	}

	let {
		eyebrow,
		title,
		subtitle,
		partOf,
		logo,
		image,
		imageAlt = '',
		class: className = ''
	}: Props = $props();
</script>

<!-- Every `href` below is caller-supplied and falls back to `#`. They are
     SF.gov destinations handed in by whoever renders the component -- absolute
     URLs into sf.gov, or the `#` placeholder the specimen route passes -- and
     `resolve()` turns THIS app's route ids into paths, so it has nothing to say
     about any of them. Re-scope this if an internal route is ever hardcoded
     here. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<header class="ds-header {className}" class:has-image={!!image}>
	{#if image}
		<img src={image} alt={imageAlt} class="ds-hero block w-full" />
	{/if}

	<div class="ds-card flex flex-col gap-5">
		{#if eyebrow}
			<span class="ds-eyebrow text-sm leading-5 font-bold uppercase">{eyebrow}</span>
		{/if}

		<div class="flex items-start justify-between gap-10">
			<div class="flex min-w-0 flex-col gap-5">
				<h1 class="ds-title m-0">{title}</h1>
				{#if subtitle}
					<p class="ds-lede m-0">{subtitle}</p>
				{/if}
				{#if partOf}
					<span class="ds-partof text-base leading-6">
						Part of <a href={partOf.href ?? '#'} class="ds-link">{partOf.label}</a>
					</span>
				{/if}
			</div>
			{#if logo}
				<div class="flex-none">{@render logo()}</div>
			{/if}
		</div>
	</div>
</header>

<style>
	.ds-header {
		font-family: var(--site-font-body);
		background: var(--color-site-surface, #fcfcfc);
	}

	.ds-hero {
		height: 400px;
		object-fit: cover;
	}

	.ds-card {
		box-sizing: border-box;
		position: relative;
		padding: 40px 0 32px;
	}

	.has-image .ds-card {
		margin: -160px 57px 0;
		padding: 40px 56px;
		background: #ffffff;
		box-shadow: 0 2px 8px rgba(11, 12, 12, 0.08);
	}

	/* Reflow: below 900px the card stops overlapping. At phone widths a -160px
	   pull puts the H1 on top of the image, and 1.4.10 asks for content that
	   does not require two-dimensional scrolling to read. */
	@media (max-width: 900px) {
		.has-image .ds-card {
			margin: 0;
			padding: 32px 20px;
		}
		.ds-hero {
			height: 220px;
		}
	}

	.ds-eyebrow {
		letter-spacing: var(--site-eyebrow-ls, 0.5px);
		color: var(--color-site-ink-muted, #5b5f63);
	}

	.ds-title {
		font-family: var(--site-font-display);
		font-weight: 500;
		font-size: var(--site-text-page-title, 44px);
		line-height: var(--site-text-page-title-lh, 56px);
		letter-spacing: var(--site-text-page-title-ls, -1px);
		color: var(--color-site-ink, #0b0c0c);
		text-wrap: pretty;
	}

	.ds-lede {
		max-width: 720px;
		font-size: var(--site-text-lede, 20px);
		line-height: var(--site-text-lede-lh, 30px);
		color: var(--color-site-ink-secondary, #3a3e42);
		text-wrap: pretty;
	}

	.ds-partof {
		color: var(--color-site-ink-secondary, #3a3e42);
	}

	.ds-link {
		color: var(--color-site-action, #1b519e);
		text-decoration: underline;
	}
	.ds-link:hover {
		color: var(--color-site-action-dark, #043578);
	}
	.ds-link:focus-visible {
		outline: none;
		box-shadow: var(--site-focus-ring, 0 0 0 4px #fcfcfc, 0 0 0 7px #386ebf);
		border-radius: 2px;
	}

	@media (max-width: 640px) {
		.ds-title {
			font-size: 32px;
			line-height: 42px;
		}
	}
</style>
