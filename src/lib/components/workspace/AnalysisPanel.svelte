<script lang="ts">
	import { ArrowRight } from '@lucide/svelte';
	import { tick } from 'svelte';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import { analyzePage, SFGOV_READING_GUIDELINE } from '$lib/analysis';
	import { MOCKUP_ROOT_SELECTOR } from '$lib/analysis/domChecks';
	import { extractLinkTargets } from '$lib/analysis/linkTargets';
	import { reviewHrefFor } from '$lib/corpus/draftPath';
	import { pageTitleFor } from '$lib/corpus/pageTitle';
	import { pagesByKey } from '$lib/data';
	import { reviewRecordFor } from '$lib/karl/reviewRecord';
	import { review } from '$lib/review/review.svelte';
	import { draftsStore } from '$lib/stores/draftPages';
	import { pageStore } from '$lib/stores/pageData.svelte';
	import { editsStore, pagesStore } from '$lib/stores/reviewState';

	let {
		pageData,
		embedded = false
	}: {
		pageData?: unknown;
		/** Inside the Fix tab: the tab scrolls, and the decision pinned under it
		 *  already offers the next undecided page, so the panel does neither. */
		embedded?: boolean;
	} = $props();

	const page = $derived(
		pageData && typeof pageData === 'object' ? (pageData as Record<string, unknown>) : undefined
	);
	const pageId = $derived(typeof page?.id === 'string' ? page.id : undefined);

	let mockupRoot = $state<ParentNode | null>(null);
	let linkFilter = $state<'all' | 'external' | 'internal'>('all');

	$effect(() => {
		const id = page?.id;
		linkFilter = 'all';
		let cancelled = false;
		tick().then(() => {
			if (cancelled) return;
			void id;
			mockupRoot = document.querySelector(MOCKUP_ROOT_SELECTOR);
		});
		return () => {
			cancelled = true;
		};
	});

	const record = $derived(
		pageId
			? reviewRecordFor(pageId, $pagesStore, $editsStore, pageStore.staleEditsOn(pageId))
			: null
	);

	const analysis = $derived(
		page ? analyzePage({ page: page as never, record, root: mockupRoot }) : null
	);

	const links = $derived(
		extractLinkTargets(page, pagesByKey as unknown as Record<string, Record<string, unknown>>)
	);
	const externalCount = $derived(links.filter((l) => l.kind === 'external').length);
	const internalCount = $derived(links.filter((l) => l.kind === 'internal').length);
	const filteredLinks = $derived(
		linkFilter === 'all' ? links : links.filter((l) => l.kind === linkFilter)
	);

	const liveRecord = $derived(pageId ? $pagesStore.find((p) => p.path === pageId) : undefined);
	const nextPath = $derived(pageId ? review.nextUndecided(pageId) : undefined);
	const nextTitle = $derived(
		nextPath ? pageTitleFor(nextPath, pageStore.pages, $draftsStore, 'empty') : ''
	);
</script>

<div class={embedded ? '' : 'flex h-full min-h-0 flex-col'}>
	<div class="space-y-4 p-4 {embedded ? '' : 'min-h-0 flex-1 overflow-y-auto'}">
		{#if !analysis}
			<p class="text-sm text-sfds-slate-l3">No page selected.</p>
		{:else}
			<!-- Reading Level card -->
			<section
				class="overflow-hidden rounded-lg border border-border bg-background"
				aria-labelledby="analysis-reading-level"
			>
				<div class="p-4">
					<h2 id="analysis-reading-level" class="text-sm font-semibold text-sfds-black">
						Reading Level
					</h2>
					{#if !analysis.readability.hasContent}
						<p class="mt-2 text-xs text-sfds-slate-l3">Not enough text on this page to score.</p>
					{:else}
						<div class="mt-2.5 flex flex-wrap items-center gap-2">
							<span class="text-lg font-semibold text-sfds-black">
								Grade {analysis.readability.score}
							</span>
							{#if analysis.target !== null}
								<span
									class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.6875rem] font-semibold {analysis.targetStatus ===
									'pass'
										? 'bg-sfds-green-l1 text-sfds-green'
										: 'bg-sfds-amber-l1 text-sfds-amber'}"
								>
									{analysis.targetStatus === 'pass'
										? `Meets target: Grade ${analysis.target}`
										: `Above target: Grade ${analysis.target}`}
								</span>
							{:else}
								<span
									class="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[0.6875rem] font-semibold text-sfds-slate-l3"
								>
									SF.gov guideline: Grade {SFGOV_READING_GUIDELINE}
								</span>
							{/if}
						</div>
					{/if}
				</div>
				{#if analysis.readability.hasContent}
					<div class="border-t border-border px-4 py-2.5">
						<button
							type="button"
							class="text-xs font-medium text-sfds-action underline underline-offset-2 hover:text-sfds-blue-dark"
							onclick={() => pageStore.highlightTarget('readability', 'page')}
						>
							Highlight on page
						</button>
					</div>
				{/if}
			</section>

			<!-- Link Targets card -->
			<section
				class="overflow-hidden rounded-lg border border-border bg-background"
				aria-labelledby="analysis-link-targets"
			>
				<div class="p-4 pb-3">
					<h2 id="analysis-link-targets" class="text-sm font-semibold text-sfds-black">
						Link Targets
					</h2>
					<p class="mt-0.5 text-xs text-sfds-slate-l3">
						{links.length} checked · {externalCount} external
					</p>

					<div class="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter link targets">
						{#each [{ key: 'all', label: 'All', count: links.length }, { key: 'external', label: 'External', count: externalCount }, { key: 'internal', label: 'Internal', count: internalCount }] as const as tab (tab.key)}
							{@const active = linkFilter === tab.key}
							<button
								type="button"
								aria-pressed={active}
								class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors {active
									? 'border-sfds-action bg-sfds-blue-l1 text-sfds-action'
									: 'border-border bg-background text-sfds-black hover:bg-muted/50'}"
								onclick={() => (linkFilter = tab.key)}
							>
								<span>{tab.label}</span>
								<span
									class="inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[0.6875rem] font-semibold {active
										? 'bg-background text-sfds-action'
										: 'bg-muted text-sfds-slate-l3'}"
								>
									{tab.count}
								</span>
							</button>
						{/each}
					</div>
				</div>

				{#if filteredLinks.length === 0}
					<p class="border-t border-border px-4 py-3 text-xs text-sfds-slate-l3">
						No {linkFilter === 'all' ? '' : `${linkFilter} `}links on this page.
					</p>
				{:else}
					<ul class="divide-y divide-border border-t border-border" aria-label="Link targets">
						{#each filteredLinks as link (link.id)}
							<li class="flex items-center justify-between gap-2 px-4 py-2.5">
								<span
									class="min-w-0 flex-1 truncate font-mono text-xs text-sfds-black"
									title={link.rawTarget}
								>
									{link.displayUrl}
								</span>
								<Button
									variant="outline"
									size="sm"
									class="h-7 flex-none px-2.5 text-xs"
									aria-label="Inspect {link.displayUrl}"
									onclick={() => pageStore.highlightTarget('link', link.fieldId)}
								>
									Inspect
								</Button>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}
	</div>

	{#if !embedded && (nextPath || liveRecord)}
		<div class="flex-none border-t border-border bg-background px-4 py-3">
			{#if nextPath}
				<a
					href={resolve(reviewHrefFor(nextPath))}
					title={nextTitle}
					class="flex items-center justify-between gap-2 text-sm font-semibold text-sfds-black hover:text-sfds-action"
				>
					<span>Next undecided page</span>
					<ArrowRight class="size-4 shrink-0" aria-hidden="true" />
				</a>
			{:else if liveRecord}
				<p class="text-xs text-sfds-slate-l3">Every page in the review has a decision.</p>
			{/if}
		</div>
	{/if}
</div>
