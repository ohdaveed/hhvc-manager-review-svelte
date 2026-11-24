<script lang="ts">
	import { resolve } from '$app/paths';
	import StatusBar from '$lib/components/review/StatusBar.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { STATUS_LABELS } from '$lib/review/statusLabels';
	import type { ReviewPage } from '$lib/stores/reviewState';

	let {
		decided,
		total,
		counts,
		nextHref,
		nextTitle
	}: {
		decided: number;
		total: number;
		/** Pages per status, for the bar and the legend. */
		counts: Partial<Record<ReviewPage['status'], number>>;
		nextHref: `/review/${string}` | undefined;
		nextTitle: string | undefined;
	} = $props();

	const pct = $derived(total === 0 ? 0 : Math.round((decided / total) * 100));

	/**
	 * The legend, decided statuses only and zeroes dropped.
	 *
	 * `needs-review` is absent for the same reason the bar has no segment for
	 * it: the grey track is the undecided remainder, so a swatch for it would
	 * label the background. Dropping zeroes keeps the legend to what is actually
	 * on the bar — a swatch with no segment beside it is a key to nothing.
	 *
	 * The legend is not redundant with the bar's `aria-label`. That label is the
	 * text equivalent for a screen reader; this is what tells a sighted reader
	 * which colour means what, and without it green/amber/red is a key they have
	 * to guess at.
	 */
	const legend = $derived(
		(['approved', 'revise', 'blocked'] as const)
			.map((status) => ({ status, count: counts[status] ?? 0 }))
			.filter((entry) => entry.count > 0)
	);
</script>

<!-- The hero card: progress and the one action that resumes the review, in a
     single block at the top, so a returning reviewer has one place to look. -->
<section
	aria-label="Your progress"
	class="rounded-[3px] border border-sfds-grey-l2 bg-white p-4 sm:p-5"
>
	<div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
		<div class="min-w-0 flex-1 space-y-2">
			<div class="flex items-baseline justify-between gap-3">
				<p class="text-lg font-semibold text-slate-900">
					{decided} of {total} decided
				</p>
				<p class="text-lg font-semibold text-sfds-slate-l3 tabular-nums">{pct}%</p>
			</div>

			<StatusBar size="lg" {counts} {total} />

			{#if legend.length > 0}
				<ul class="flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
					{#each legend as entry (entry.status)}
						<li class="flex items-center gap-1.5 text-sm text-slate-700">
							<span
								class="size-2.5 shrink-0 rounded-full {STATUS_LABELS[entry.status].bar}"
								aria-hidden="true"
							></span>
							<span class="tabular-nums">{entry.count}</span>
							{STATUS_LABELS[entry.status].label.toLowerCase()}
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<!-- `nextHref` is undefined ONLY when every page has a decision, because
		     `reviewProgress` picks the first `needs-review` rather than the
		     queue's first row. So there is deliberately no link here in that
		     state: Continue would point at a page with nothing left to resume. -->
		{#if nextHref}
			<!-- "Continue" is wrong when nothing has been decided yet: there is
			     nothing to continue. The page name rides along either way, so the
			     button says where it goes rather than only that it goes. -->
			<Button href={resolve(nextHref)} size="lg" class="shrink-0 px-6">
				{decided === 0 ? 'Start with' : 'Continue to'}
				{nextTitle}
			</Button>
		{:else}
			<p class="shrink-0 font-medium text-slate-700">Every page has a decision.</p>
		{/if}
	</div>
</section>
