<script lang="ts">
	import type { Snippet } from 'svelte';
	import StatusBar from '$lib/components/review/StatusBar.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { StatusFilter } from '$lib/landing/filter';
	import { STATUS_LABELS } from '$lib/review/statusLabels';
	import type { ReviewPage } from '$lib/stores/reviewState';

	let {
		decided,
		total,
		counts,
		nextHref,
		unreviewed = 0,
		onShow,
		footer
	}: {
		decided: number;
		total: number;
		/** Pages per status, for the bar and the legend. */
		counts: Partial<Record<ReviewPage['status'], number>>;
		/**
		 * Where Continue goes. The button itself is in the page header; the card
		 * only needs to know whether there is anywhere left to go, because with
		 * nothing undecided it says so in place of the button.
		 */
		nextHref: `/review/${string}` | undefined;
		/**
		 * Corpus pages with no review row. They are in `total` but can never be
		 * decided here, so "every page has a decision" must not be said over them.
		 */
		unreviewed?: number;
		/** Show the All pages list filtered to one status. */
		onShow: (status: StatusFilter) => void;
		/** Rendered under the card's body, inside its border: the review guide. */
		footer?: Snippet;
	} = $props();

	const pct = $derived(total === 0 ? 0 : Math.round((decided / total) * 100));

	/**
	 * The bar's colour key, and a way into the list.
	 *
	 * Each entry is a button that filters All pages to its status, so the card
	 * and the list share one vocabulary and a reviewer finds the filter by using
	 * it. Ordered as the bar is drawn -- the decided segments left to right, then
	 * the grey remainder -- so the key reads in the order the eye meets the
	 * colours. Zeroes are dropped: a key to a slice that is not on the bar keys
	 * nothing, and a filter that shows no rows is a dead end.
	 *
	 * The visible text ("Approved 2") starts the accessible name ("Approved 2:
	 * show these pages"), as WCAG 2.5.3 requires of a name that extends a label.
	 */
	const legend = $derived(
		(['approved', 'revise', 'blocked', 'needs-review'] as const)
			.map((status) => ({ status, count: counts[status] ?? 0 }))
			.filter((entry) => entry.count > 0)
	);

	const blocked = $derived(counts.blocked ?? 0);
</script>

<!-- The progress card: the count, the bar and its key, and -- once nothing is
     left to resume -- what is left instead. The one action that resumes the
     review is the header's Continue button. -->
<section aria-label="Your progress" class="rounded-[4px] border border-sfds-grey-l2 bg-white">
	<div class="space-y-3 p-4 sm:p-5">
		<div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
			<p class="text-xl font-bold text-slate-900">{decided} of {total} decided</p>
			<p class="text-sm text-slate-700">
				<span class="tabular-nums">{pct}%</span>
				{#if unreviewed > 0}
					· {unreviewed} not in the review yet
				{/if}
			</p>
		</div>

		<StatusBar size="lg" {counts} {total} />

		{#if legend.length > 0}
			<ul class="flex flex-wrap gap-x-5 gap-y-1" aria-label="Show pages by status">
				{#each legend as entry (entry.status)}
					{@const label = STATUS_LABELS[entry.status].label}
					<li>
						<button
							type="button"
							onclick={() => onShow(entry.status)}
							class="inline-flex min-h-8 items-center gap-1.5 rounded-[4px] text-sm text-slate-800 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sfds-black"
						>
							<span
								class="size-2.5 shrink-0 rounded-[2px] {entry.status === 'needs-review'
									? 'border border-sfds-slate-l2 bg-sfds-grey-l2'
									: STATUS_LABELS[entry.status].bar}"
								aria-hidden="true"
							></span>
							{label}
							<!-- Adjacent, so no whitespace node puts a space before the colon. -->
							<span class="tabular-nums">{entry.count}</span><span class="sr-only"
								>: show these pages</span
							>
						</button>
					</li>
				{/each}
			</ul>
		{/if}

		<!-- `nextHref` is undefined only when every page IN THE REVIEW (every
		     row) has a decision, because `reviewProgress` picks the first
		     `needs-review` row rather than the queue's first row. The header then
		     has no Continue button, so the card says why. Pages with no row
		     (`unreviewed`) are in `total` but undecidable, so the message names
		     them rather than claim every page is done over a count that says
		     otherwise. -->
		{#if !nextHref}
			<div
				class="flex flex-col gap-3 border-t border-sfds-grey-l2 pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
			>
				<p class="font-medium text-slate-800">
					{#if unreviewed > 0}
						Every page in the review has a decision. {unreviewed}
						{unreviewed === 1 ? 'page is' : 'pages are'} not in the review yet.
					{:else}
						Every page has a decision.
					{/if}
				</p>
				{#if blocked > 0}
					<Button
						variant="outline"
						size="lg"
						class="w-full sm:w-auto"
						onclick={() => onShow('blocked')}
					>
						Review blocked pages
					</Button>
				{/if}
			</div>
		{/if}
	</div>
	{@render footer?.()}
</section>
