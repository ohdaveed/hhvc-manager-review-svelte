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
		hasNext,
		unreviewed = 0,
		onShow,
		footer
	}: {
		decided: number;
		total: number;
		/** Pages per status, for the bar and the shortcuts. */
		counts: Partial<Record<ReviewPage['status'], number>>;
		/**
		 * Whether a page in the review is still undecided. The link to it is the
		 * page header's Continue button; this card only says so when there is none.
		 */
		hasNext: boolean;
		/**
		 * Corpus pages with no review row. They are in `total` but can never be
		 * decided here, so "every page has a decision" must not be said over them.
		 */
		unreviewed?: number;
		/** Show the All pages list filtered to one status. */
		onShow: (status: StatusFilter) => void;
		/** Rendered at the foot of the card, under a rule: the review guide. */
		footer?: Snippet;
	} = $props();

	const pct = $derived(total === 0 ? 0 : Math.round((decided / total) * 100));

	/**
	 * Status shortcuts: the bar's colour key, and a way into the list.
	 *
	 * Each is a button that filters All pages to its status, so the card and the
	 * list share one vocabulary. Decided statuses lead, in the bar's own order,
	 * so the key reads left to right as the bar does; Undecided is the grey
	 * remainder and comes last. Zeroes are dropped: a key to a slice that is not
	 * on the bar keys nothing, and a filter that shows no rows is a dead end.
	 *
	 * The visible text ("Approved 2") starts the accessible name ("Approved 2:
	 * show these pages"), as WCAG 2.5.3 requires of a name that extends a label.
	 */
	const shortcuts = $derived(
		(['approved', 'revise', 'blocked', 'needs-review'] as const)
			.map((status) => ({ status, count: counts[status] ?? 0 }))
			.filter((entry) => entry.count > 0)
	);

	const blocked = $derived(counts.blocked ?? 0);
</script>

<!-- The status card: progress, and a key that doubles as filters. The action
     that resumes the review is the page header's Continue button. -->
<section aria-label="Your progress" class="rounded-[3px] border border-sfds-grey-l2 bg-white">
	<div class="flex flex-col gap-3 p-5">
		<div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
			<p class="text-xl font-bold text-slate-900">{decided} of {total} decided</p>
			<p class="text-sm text-slate-700 tabular-nums">{pct}%</p>
		</div>

		<StatusBar size="lg" {counts} {total} />

		{#if shortcuts.length > 0}
			<ul class="flex flex-wrap gap-x-5 gap-y-1" aria-label="Show pages by status">
				{#each shortcuts as entry (entry.status)}
					{@const label = STATUS_LABELS[entry.status].label}
					<li>
						<button
							type="button"
							onclick={() => onShow(entry.status)}
							aria-label="{label} {entry.count}: show these pages"
							class="inline-flex min-h-8 items-center gap-1.5 rounded-[3px] text-sm text-slate-800 hover:text-sfds-action hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sfds-black"
						>
							<!-- A square swatch, the bar's own fill. Undecided is the grey
							     track, ringed so it reads on white (3:1, WCAG 1.4.11). -->
							<span
								class="size-2.5 shrink-0 rounded-[2px] {STATUS_LABELS[entry.status]
									.bar} {entry.status === 'needs-review' ? 'border border-sfds-slate-l2' : ''}"
								aria-hidden="true"
							></span>
							{label}
							<span class="tabular-nums">{entry.count}</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}

		<!-- No undecided row is left only when every page IN THE REVIEW (every
		     row) has a decision. Pages with no row (`unreviewed`) are in `total`
		     but undecidable, so the message names them rather than claim every
		     page is done over a count that says otherwise. -->
		{#if !hasNext}
			<div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
				<p class="font-medium text-slate-800">
					{#if unreviewed > 0}
						Every page in the review has a decision. {unreviewed}
						{unreviewed === 1 ? 'page is' : 'pages are'} not in the review yet.
					{:else}
						Every page has a decision.
					{/if}
				</p>
				{#if blocked > 0}
					<Button variant="outline" size="lg" onclick={() => onShow('blocked')}>
						Review blocked pages
					</Button>
				{/if}
			</div>
		{/if}
	</div>
	{#if footer}
		<div class="overflow-hidden rounded-b-[3px] border-t border-sfds-grey-l2">
			{@render footer()}
		</div>
	{/if}
</section>
