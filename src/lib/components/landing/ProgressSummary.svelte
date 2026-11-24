<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import { resolve } from '$app/paths';
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
		nextTitle,
		nextMeta,
		onShow
	}: {
		decided: number;
		total: number;
		/** Pages per status, for the bar and the shortcuts. */
		counts: Partial<Record<ReviewPage['status'], number>>;
		nextHref: `/review/${string}` | undefined;
		nextTitle: string | undefined;
		/** The next page's type, or "Proposed page" for a draft. */
		nextMeta: string | undefined;
		/** Show the All pages list filtered to one status. */
		onShow: (status: StatusFilter) => void;
	} = $props();

	const pct = $derived(total === 0 ? 0 : Math.round((decided / total) * 100));

	/**
	 * Status shortcuts: the bar's colour key, and a way into the list.
	 *
	 * Each is a button that filters All pages to its status, so the card and the
	 * list share one vocabulary and a reviewer finds the filter by using it.
	 * `needs-review` leads, because "what is left" is the question a returning
	 * reviewer brings. Zeroes are dropped: a key to a slice that is not on the bar
	 * keys nothing, and a filter that shows no rows is a dead end.
	 *
	 * The visible text ("2 approved") starts the accessible name ("Show 2
	 * approved pages"), as WCAG 2.5.3 requires of a name that extends a label.
	 */
	const shortcuts = $derived(
		(['needs-review', 'approved', 'revise', 'blocked'] as const)
			.map((status) => ({ status, count: counts[status] ?? 0 }))
			.filter((entry) => entry.count > 0)
	);

	const blocked = $derived(counts.blocked ?? 0);

	// Short visible verb; the title is beside the button rather than inside it,
	// which is what let a long title push the button past a phone's edge. The
	// accessible name keeps the destination, and begins with the visible label.
	const verb = $derived(decided === 0 ? 'Start' : 'Continue');
	const longVerb = $derived(decided === 0 ? 'Start with' : 'Continue to');
</script>

<!-- The status card: progress, a key that doubles as filters, and the one
     action that resumes the review. -->
<section
	aria-label="Your progress"
	class="rounded-[3px] border border-sfds-grey-l2 bg-white p-4 sm:p-5"
>
	<div class="flex items-baseline justify-between gap-3">
		<p class="text-lg font-semibold text-slate-900">{decided} of {total} decided</p>
		<p class="text-lg font-semibold text-sfds-slate-l3 tabular-nums">{pct}%</p>
	</div>

	<div class="mt-2">
		<StatusBar size="lg" {counts} {total} />
	</div>

	{#if shortcuts.length > 0}
		<ul class="mt-3 flex flex-wrap gap-2" aria-label="Show pages by status">
			{#each shortcuts as entry (entry.status)}
				{@const label = STATUS_LABELS[entry.status].label.toLowerCase()}
				<li>
					<button
						type="button"
						onclick={() => onShow(entry.status)}
						aria-label="{entry.count} {label}: show these pages"
						class="inline-flex items-center gap-1.5 rounded-full border border-sfds-grey-l2 bg-white px-2.5 py-1 text-sm text-slate-800 transition-colors hover:border-sfds-action hover:bg-sfds-blue-l1/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sfds-black"
					>
						<span
							class="size-2.5 shrink-0 rounded-full {entry.status === 'needs-review'
								? 'border border-sfds-slate-l2 bg-white'
								: STATUS_LABELS[entry.status].bar}"
							aria-hidden="true"
						></span>
						<span class="tabular-nums">{entry.count}</span>
						{label}
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	<div
		class="mt-4 flex flex-col gap-3 border-t border-sfds-grey-l2 pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
	>
		<!-- `nextHref` is undefined ONLY when every page has a decision, because
		     `reviewProgress` picks the first `needs-review` rather than the
		     queue's first row. So there is deliberately no link in that state:
		     Continue would point at a page with nothing left to resume. -->
		{#if nextHref}
			<div class="min-w-0">
				<p class="text-sm text-slate-700">Next up</p>
				<p class="font-semibold text-pretty text-slate-900">{nextTitle}</p>
				{#if nextMeta}
					<p class="text-sm text-slate-700">{nextMeta}</p>
				{/if}
			</div>
			<Button
				href={resolve(nextHref)}
				size="lg"
				aria-label="{longVerb} {nextTitle}"
				class="w-full px-6 sm:w-auto"
			>
				{verb}
				<ArrowRight aria-hidden="true" data-icon="inline-end" />
			</Button>
		{:else}
			<p class="font-medium text-slate-800">Every page has a decision.</p>
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
		{/if}
	</div>
</section>
