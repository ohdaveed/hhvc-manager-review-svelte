<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import { reviewHrefFor } from '$lib/corpus/draftPath';

	let {
		path,
		title,
		meta = '',
		current = false,
		density = 'compact',
		badge
	}: {
		/**
		 * A `pages.path`, not a URL. The row builds its own link through
		 * `reviewHrefFor`, the single place a path becomes one -- a `draft:<uuid>`
		 * interpolated into `/review/<slug>` by a caller would 404.
		 */
		path: string;
		title: string;
		/** The muted second line. Empty or missing renders no line at all. */
		meta?: string;
		/** This row is the page on screen: sets `aria-current="page"`. */
		current?: boolean;
		/** `compact` is the queue sidebar; `comfortable` is a full-width list. */
		density?: 'compact' | 'comfortable';
		/** Non-interactive content only. It renders INSIDE the link. */
		badge?: Snippet;
	} = $props();

	const comfortable = $derived(density === 'comfortable');
</script>

{#snippet titleLine()}
	<span
		class="block text-sfds-black {comfortable
			? 'text-[15px] leading-[22px]'
			: 'text-[13px] leading-[18px]'} {current ? 'font-semibold' : ''}"
	>
		{title}
	</span>
{/snippet}

{#snippet metaLine()}
	{#if meta}
		<span
			data-slot="page-row-meta"
			class="mt-0.5 block text-sfds-slate-l3 {comfortable
				? 'text-[13px] leading-[18px]'
				: 'text-[11px] leading-[14px]'}"
		>
			{meta}
		</span>
	{/if}
{/snippet}

<!-- ONE anchor is the whole row, so the hit area is the row and not the words,
     and a list of 39 pages is 39 tab stops. Nothing inside it may be focusable:
     the badge is a `<span>`, never a link or a button.

     A left border rather than a filled row marks the current page: the fill
     would compete with the selected-field highlight in the canvas, and there
     are two selections on screen at once.

     Hover is not the only cue -- it is invisible to a keyboard user and absent
     on touch. The focus outline is black and inset, as `.edit-target`'s is:
     black so it reads apart from the blue current-row border, inset so a
     scroll container's `overflow` cannot clip it. -->
<a
	href={resolve(reviewHrefFor(path))}
	aria-current={current ? 'page' : undefined}
	class="rounded-[3px] border-l-2 transition-colors hover:bg-sfds-blue-l1/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sfds-black {comfortable
		? 'flex items-start gap-3 py-2.5 pr-3 pl-3'
		: 'block py-1.5 pr-2 pl-2.5'} {current
		? 'border-sfds-action bg-sfds-blue-l1'
		: 'border-transparent'}"
>
	{#if comfortable}
		<!-- Badge trailing the title, so a column of them can be scanned. -->
		<span class="block min-w-0 flex-1">
			{@render titleLine()}
			{@render metaLine()}
		</span>
		{#if badge}
			<span data-slot="page-row-badge" class="shrink-0">{@render badge()}</span>
		{/if}
	{:else}
		<!-- Stacked: the sidebar is too narrow to spare a column for it. -->
		{@render titleLine()}
		{#if badge}
			<span data-slot="page-row-badge" class="block">{@render badge()}</span>
		{/if}
		{@render metaLine()}
	{/if}
</a>
