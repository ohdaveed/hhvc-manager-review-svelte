<script lang="ts">
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import PageRow from '$lib/components/review/PageRow.svelte';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
	import { pageTitleFor } from '$lib/corpus/pageTitle';
	import { filterPages, type StatusFilter } from '$lib/landing/filter';
	import { PAGE_GROUPS } from '$lib/landing/groups';
	import { STATUS_LABELS } from '$lib/review/statusLabels';
	import { draftsStore } from '$lib/stores/draftPages';
	import { pageStore } from '$lib/stores/pageData.svelte';
	import { pagesStore, QUEUE_STATUS_ORDER } from '$lib/stores/reviewState';

	const titleFor = (path: string) => pageTitleFor(path, pageStore.pages, $draftsStore);
	const inCorpus = (path: string) => pageStore.pages.some((p) => p.id === path);

	/**
	 * A path's recorded status, or `undefined` when the review has no row for it.
	 *
	 * The two are NOT the same thing and `filterPages` depends on the difference:
	 * a corpus page with no row has no decision to be undecided about, and
	 * defaulting it to `needs-review` would list it as awaiting a decision that
	 * cannot be recorded. Signed out there are no rows at all, which is why the
	 * badges and the status filter are hidden rather than showing 39 Undecided.
	 */
	const statusOf = (path: string) => $pagesStore.find((p) => p.path === path)?.status;

	/**
	 * Drafts are listed under their own heading, not sorted into a theme: a
	 * drafted page is described in free text at request time and has none.
	 * Only those outside `pageStore` — a ready draft is already in the corpus
	 * store and so already in a themed group.
	 */
	const draftPaths = $derived($draftsStore.map((d) => d.path).filter((p) => !inCorpus(p)));

	/**
	 * Corpus pages no group claims.
	 *
	 * `groups.spec.ts` asserts this is empty for the real corpus and fails naming
	 * the id when it is not — but the component must not DEPEND on an invariant
	 * enforced in a different file. Rendering only `PAGE_GROUPS` would mean a new
	 * corpus module is invisible here, and invisible is the one failure mode a
	 * review tool cannot have: a page nobody can see is a page nobody decides.
	 * So an unclaimed page gets listed rather than dropped, and the spec is what
	 * says it should have had a home.
	 */
	const grouped = new Set(PAGE_GROUPS.flatMap((g) => g.pages as readonly string[]));
	const ungrouped = $derived(pageStore.pages.map((p) => p.id).filter((id) => !grouped.has(id)));

	const sections = $derived([
		...PAGE_GROUPS.map((g) => ({ id: g.id, heading: g.heading, paths: [...g.pages] })),
		...(ungrouped.length > 0
			? [{ id: 'ungrouped', heading: 'Other pages', paths: ungrouped }]
			: []),
		...(draftPaths.length > 0
			? [{ id: 'drafts', heading: 'Proposed pages', paths: draftPaths }]
			: [])
	]);

	// Review data is `TO authenticated`, so signed out there is no status to show
	// and nothing to filter by. The corpus still renders -- that is the point of
	// being readable without an account. `ReviewQueue`'s `browsing` is the same
	// idea.
	//
	// Keyed on the store having rows rather than on `sessionStore`, because the
	// rows are what the badges and the filter actually need: during the initial
	// check, and after a load that failed, a reviewer IS signed in and there is
	// still nothing to show. So the controls appear when they can work, which
	// also means they appear once rather than flashing in and out.
	const hasReview = $derived($pagesStore.length > 0);

	let query = $state('');
	let status = $state<StatusFilter>('all');

	const shownIn = (paths: string[]) =>
		filterPages({ paths, query, status, statusOf, titleOf: titleFor });

	const visible = $derived(
		sections.map((s) => ({ ...s, shown: shownIn(s.paths) })).filter((s) => s.shown.length > 0)
	);

	const totalShown = $derived(visible.reduce((n, s) => n + s.shown.length, 0));
	const totalPages = $derived(sections.reduce((n, s) => n + s.paths.length, 0));
	const filtering = $derived(query.trim() !== '' || status !== 'all');

	// Counts for the filter chips, over every page rather than the current view,
	// so a chip reads the same whatever is already filtered.
	const countFor = (s: StatusFilter) =>
		s === 'all' ? totalPages : $pagesStore.filter((p) => p.status === s).length;

	const FILTERS = $derived([
		{ value: 'all' as StatusFilter, label: 'All' },
		...QUEUE_STATUS_ORDER.map((s) => ({ value: s as StatusFilter, label: STATUS_LABELS[s].label }))
	]);

	// `metaFor` deliberately omits the status: the badge already states it, and
	// repeating it in the muted line is the kind of duplication that makes a row
	// slower to scan rather than faster.
	const metaFor = (path: string) => pageStore.pages.find((p) => p.id === path)?.type ?? '';
</script>

<section aria-labelledby="all-pages" class="space-y-4">
	<div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
		<h2 id="all-pages" class="text-lg font-semibold text-slate-900">All pages</h2>
		<!-- A filter changes what is on screen without moving focus, so a sighted
		     user sees it and a screen-reader user is told. Only while filtering:
		     an unconditional live region would announce on first paint. -->
		<p role="status" class="text-sm text-slate-700">
			{#if filtering}
				{totalShown} of {totalPages} pages
			{/if}
		</p>
	</div>

	<div class="space-y-3">
		<div>
			<label for="page-search" class="mb-1 block text-sm font-medium text-slate-900">
				Search pages
			</label>
			<input
				id="page-search"
				type="search"
				bind:value={query}
				placeholder="Title or path"
				autocomplete="off"
				class="w-full rounded-[3px] border border-sfds-grey-l2 bg-white px-3 py-2 text-[15px] text-sfds-black placeholder:text-sfds-slate-l3 focus:border-sfds-action focus:ring-1 focus:ring-sfds-action focus:outline-none"
			/>
		</div>

		{#if hasReview}
			<ToggleGroup.Root
				type="single"
				variant="outline"
				size="sm"
				spacing={0}
				class="flex flex-wrap justify-start gap-1"
				aria-label="Filter by status"
				bind:value={status}
			>
				{#each FILTERS as f (f.value)}
					<ToggleGroup.Item value={f.value} class="rounded-md! border-l! px-2.5">
						{f.label}
						<span class="ml-1.5 text-sfds-slate-l3 tabular-nums">{countFor(f.value)}</span>
					</ToggleGroup.Item>
				{/each}
			</ToggleGroup.Root>
		{/if}
	</div>

	{#if totalShown === 0}
		<p role="status" class="py-4 text-slate-700">
			No pages match {query.trim() ? `“${query.trim()}”` : 'this filter'}.
		</p>
	{/if}

	<!-- Native `<details>`, the same mechanism as How it works, so the page has
	     one disclosure pattern rather than two keyboard behaviours.

	     SECTIONS DEFAULT TO OPEN. A closed `<details>` has its contents removed
	     from the accessibility tree — not merely hidden visually — so rows inside
	     a collapsed section are unreachable by a screen reader and invisible to
	     `getByRole`. Scannable rows that start hidden are not scannable, and
	     collapsing is the affordance for tidying 39 of them away, not the
	     resting state.

	     Sections with no matches are dropped above rather than shown at zero, so
	     a filter never leaves a count with nothing under it. -->
	<div class="divide-y divide-sfds-grey-l2 border-y border-sfds-grey-l2">
		{#each visible as section (section.id)}
			<details open class="group">
				<summary
					class="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 marker:content-none hover:bg-sfds-blue-l1/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sfds-black"
				>
					<span class="flex items-baseline gap-2">
						<span class="font-semibold text-slate-900">{section.heading}</span>
						<span class="text-sm text-sfds-slate-l3 tabular-nums">{section.shown.length}</span>
					</span>
					<ChevronDown
						class="size-4 shrink-0 text-sfds-slate-l3 transition-transform group-open:rotate-180"
						aria-hidden="true"
					/>
				</summary>
				<ul class="pb-2">
					{#each section.shown as path (path)}
						{@const s = statusOf(path)}
						<li>
							<PageRow {path} title={titleFor(path)} meta={metaFor(path)} density="comfortable">
								{#snippet badge()}
									{#if s}
										<span
											class="inline-flex shrink-0 items-center rounded-4xl border px-2 py-0.5 text-xs font-medium {STATUS_LABELS[
												s
											].badge}"
										>
											{STATUS_LABELS[s].label}
										</span>
									{/if}
								{/snippet}
							</PageRow>
						</li>
					{/each}
				</ul>
			</details>
		{/each}
	</div>
</section>
