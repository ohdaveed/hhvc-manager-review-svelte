<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import { reviewHrefFor } from '$lib/corpus/draftPath';

	let {
		path,
		title,
		meta = '',
		metaTone = 'default',
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
		/**
		 * How the meta line reads. `progress` leads with a pulsing dot (static
		 * under reduced motion) for work in flight; `danger` is for a line that
		 * reports a failure. The words carry the meaning either way (WCAG 1.4.1).
		 */
		metaTone?: 'default' | 'progress' | 'danger';
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
			? 'text-[0.9375rem] leading-[1.375rem]'
			: 'text-[0.8125rem] leading-[1.125rem]'} {current ? 'font-semibold' : ''}"
	>
		{title}
	</span>
{/snippet}

{#snippet metaLine()}
	{#if meta}
		<span
			data-slot="page-row-meta"
			class="mt-0.5 block {comfortable
				? 'text-[0.8125rem] leading-[1.125rem]'
				: 'text-[0.6875rem] leading-[0.875rem]'} {metaTone === 'danger'
				? 'text-sfds-red'
				: 'text-sfds-slate-l3'}"
		>
			<!-- One neutral grey for the meta line in both the landing list and the
			     queue. The landing list used to switch to slate-700 because the
			     queue's navy l3 under a link title read as a second link; l3 is a
			     neutral grey now (app.css), so the switch has nothing left to fix. -->
			{#if metaTone === 'progress'}
				<span
					class="mr-1.5 inline-block size-2 rounded-full bg-sfds-action align-[1px] motion-safe:animate-pulse"
					aria-hidden="true"
				></span>
			{/if}
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
		<!-- The badge sits in the title's own row, right-aligned, so a column of
		     them can be scanned down the list -- and it comes BEFORE the meta line
		     in the DOM, matching that visual order. The whole row is one anchor, so
		     DOM order is the order a screen reader announces the name in: putting
		     the badge after the meta would have it read "title, type, status" while
		     the eye reads "title, status, type" (WCAG 1.3.2). -->
		<!-- A grid, not a flex row: in the title's row the ~26px badge set that
		     row's height, so a row with a badge had its type line pushed 10px
		     further from its title than a row without one, and the list's rhythm
		     changed row to row. Spanning both lines and centred, the badge no
		     longer touches the text's spacing. DOM order is unchanged. -->
		<span class="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] gap-x-3">
			<span class="col-start-1 row-start-1 block min-w-0">{@render titleLine()}</span>
			{#if badge}
				<span data-slot="page-row-badge" class="col-start-2 row-span-2 row-start-1 self-center"
					>{@render badge()}</span
				>
			{/if}
			<span class="col-start-1 row-start-2 block min-w-0">{@render metaLine()}</span>
		</span>
	{:else}
		<!-- Stacked: the sidebar is too narrow to spare a column for it. -->
		{@render titleLine()}
		{#if badge}
			<span data-slot="page-row-badge" class="block">{@render badge()}</span>
		{/if}
		{@render metaLine()}
	{/if}
</a>
