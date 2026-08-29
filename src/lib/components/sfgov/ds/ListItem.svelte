<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Badge, MetaEntry } from './types';

	/**
	 * A row in a listing: title link, optional status badge, meta row, summary.
	 *
	 * Rules the frames settle:
	 * - Never hand-write a card summary that points at an existing SF.gov page.
	 *   Agency and Topic listings inherit the destination's own title and
	 *   summary; a Related panel prints the title alone. Passing `children` here
	 *   is for listings the page owns, not for links to other pages.
	 *
	 * WCAG 2.1 AA:
	 * - 1.3.1. `<article>` with the link as the only heading-weight element.
	 *   The title is not marked up as a heading because a listing of twenty
	 *   would put twenty same-level headings in the outline; the page's own
	 *   section heading carries the structure.
	 * - 2.4.4 Link Purpose. The link text is the full title. Never "Read more".
	 * - 1.4.1. The badge pairs its fill with its own label text; the meta icons
	 *   are `aria-hidden` and each sits beside a text label.
	 * - 1.4.11. The badge fill is decoration — the label inside it carries the
	 *   contrast, and #942A00 on #FDE4D7 measures 7.16:1.
	 */
	interface Props {
		title: string;
		href?: string;
		badge?: Badge;
		meta?: MetaEntry[];
		class?: string;
		children?: Snippet;
	}

	let { title, href = '#', badge, meta = [], class: className = '', children }: Props = $props();
</script>

<article class="ds-item flex flex-col gap-2 {className}">
	<div class="flex flex-wrap items-center gap-2">
		<a {href} class="ds-item-link">{title}</a>
		{#if badge}
			<span
				class="ds-badge inline-flex items-center"
				style:background={badge.bg ?? '#FDE4D7'}
				style:border-color={badge.bg ?? '#FDE4D7'}
				style:color={badge.fg ?? '#942A00'}>{badge.label}</span
			>
		{/if}
	</div>

	{#if meta.length}
		<div class="flex flex-wrap items-start gap-5">
			{#each meta as entry, i (i)}
				<div class="flex items-center gap-1">
					<svg
						width="20"
						height="20"
						viewBox="0 0 20 20"
						fill="none"
						aria-hidden="true"
						class="ds-meta-icon flex-none"
					>
						{#if entry.icon === 'time'}
							<path
								fill-rule="evenodd"
								clip-rule="evenodd"
								d="M10 16C13.3137 16 16 13.3137 16 10C16 6.68629 13.3137 4 10 4C6.68629 4 4 6.68629 4 10C4 13.3137 6.68629 16 10 16ZM10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z"
								fill="currentColor"
							/>
							<path
								fill-rule="evenodd"
								clip-rule="evenodd"
								d="M9 9.58579L9 7L11 7L11 10.4142L7.70711 13.7071L6.29289 12.2929L9 9.58579Z"
								fill="currentColor"
							/>
						{:else if entry.icon === 'location'}
							<circle cx="10" cy="8" r="1" stroke="currentColor" stroke-width="2" />
							<path
								d="M15 8C15 8.64131 14.7144 9.5349 14.1716 10.5994C13.6423 11.6376 12.9255 12.7298 12.1919 13.7365C11.4608 14.7396 10.7274 15.638 10.1758 16.2867C10.1148 16.3583 10.0561 16.4269 10 16.4921C9.94385 16.4269 9.88518 16.3583 9.82424 16.2867C9.27257 15.638 8.53923 14.7396 7.80815 13.7365C7.07449 12.7298 6.35772 11.6376 5.82838 10.5994C5.28559 9.5349 5 8.64131 5 8C5 5.04179 7.21413 3 10 3C12.7859 3 15 5.04179 15 8Z"
								stroke="currentColor"
								stroke-width="2"
							/>
						{:else}
							<rect x="4" y="6" width="12" height="10" stroke="currentColor" stroke-width="2" />
							<path d="M4 9H16M7 5V3M13 5V3" stroke="currentColor" stroke-width="2" />
						{/if}
					</svg>
					<span class="ds-meta-label text-base leading-6 font-bold">{entry.label}</span>
				</div>
			{/each}
		</div>
	{/if}

	{#if children}
		<p class="ds-summary m-0 text-base leading-6">{@render children()}</p>
	{/if}
</article>

<style>
	.ds-item {
		box-sizing: border-box;
		padding: 30px;
		border: 1px solid var(--color-site-list-border, #aaabab);
		font-family: var(--site-font-body);
	}

	.ds-item-link {
		font-weight: 600;
		font-size: 24px;
		line-height: 32px;
		color: var(--color-site-action, #1b519e);
		text-decoration: none;
	}
	.ds-item-link:hover {
		color: var(--color-site-action-dark, #043578);
		text-decoration: underline;
	}
	.ds-item-link:focus-visible {
		outline: none;
		box-shadow: var(--site-focus-ring, 0 0 0 4px #fcfcfc, 0 0 0 7px #386ebf);
		border-radius: 2px;
	}

	.ds-badge {
		box-sizing: border-box;
		height: 28px;
		padding: 0 12px;
		border: 1px solid;
		border-radius: 14px;
		font-weight: 500;
		font-size: 16px;
		line-height: 24px;
	}

	.ds-meta-icon {
		color: var(--color-site-meta-icon, #8b8d8d);
	}
	.ds-meta-label,
	.ds-summary {
		color: var(--color-site-ink, #0b0c0c);
	}
</style>
