<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import Search from '@lucide/svelte/icons/search';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
	import { tick } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import { isDraftPath, reviewHrefFor } from '$lib/corpus/draftPath';
	import { WALKTHROUGH_QUERY } from '$lib/karl/walkthroughLink';
	import { pageTitleFor } from '$lib/corpus/pageTitle';
	import { filterPages, type StatusFilter } from '$lib/landing/filter';
	import { groupPaths } from '$lib/landing/groups';
	import { STATUS_LABELS } from '$lib/review/statusLabels';
	import { draftsStore, isStaleDraft } from '$lib/stores/draftPages';
	import { pageStore } from '$lib/stores/pageData.svelte';
	import { pagesStore, QUEUE_STATUS_ORDER } from '$lib/stores/reviewState';

	let {
		query = $bindable(''),
		status = $bindable<StatusFilter>('all')
	}: {
		/** The search box. Bindable so the page can clear it. */
		query?: string;
		/** The status filter. Bindable so the status card's shortcuts can set it. */
		status?: StatusFilter;
	} = $props();

	const titleFor = (path: string) => pageTitleFor(path, pageStore.pages, $draftsStore);

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
	 *
	 * EVERY draft, whatever its state, by its `draft:` path. A ready draft is
	 * merged into `pageStore` under that same path, and this used to exclude
	 * drafts found there -- on the assumption a ready draft was "already in a
	 * themed group". It was not: `PAGE_GROUPS` can never name a `draft:<uuid>`,
	 * so a finished draft drifted into "Other pages" the moment it was ready.
	 * Both sources are read, deduplicated, so a ready draft whose row has not
	 * reached `draftsStore` is still listed here.
	 */
	const draftPaths = $derived([
		...new Set([
			...$draftsStore.map((d) => d.path),
			...pageStore.pages.map((p) => p.id).filter(isDraftPath)
		])
	]);

	/**
	 * Every corpus page and every draft, under the themed headings. `groupPaths`
	 * lists a corpus page no group claims under "Other pages" rather than
	 * dropping it -- `groups.spec.ts` asserts there are none, but this component
	 * must not depend on an invariant enforced in a different file: a page nobody
	 * can see is a page nobody decides. The review queue sorts by the same helper.
	 */
	const sections = $derived(
		groupPaths([
			...pageStore.pages.map((p) => p.id).filter((id) => !isDraftPath(id)),
			...draftPaths
		])
	);

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

	// `metaFor` deliberately omits the status: the badge already states it.
	const typeOf = (path: string) => pageStore.pages.find((p) => p.id === path)?.type ?? '';

	/** Whether the review holds feedback for this page. Blank notes are none. */
	const hasNotes = (path: string) =>
		($pagesStore.find((p) => p.path === path)?.manager_notes ?? '').trim() !== '';

	// Two filters the search and status ones cannot express. They live here
	// rather than on the page: nothing outside the list sets them.
	let template = $state('all');
	let notesOnly = $state(false);
	let sort = $state<'section' | 'title'>('section');

	const shownIn = (paths: string[]) =>
		filterPages({ paths, query, status, statusOf, titleOf: titleFor }).filter(
			(path) => (template === 'all' || typeOf(path) === template) && (!notesOnly || hasNotes(path))
		);

	/**
	 * Section order keeps the themed headings. Title order is one flat list:
	 * a heading over three rows of an alphabet would only interrupt it.
	 */
	const visible = $derived(
		sort === 'title'
			? [
					{
						id: 'all',
						heading: '',
						paths: [] as string[],
						shown: shownIn(sections.flatMap((s) => s.paths)).sort((a, b) =>
							titleFor(a).localeCompare(titleFor(b))
						)
					}
				].filter((s) => s.shown.length > 0)
			: sections.map((s) => ({ ...s, shown: shownIn(s.paths) })).filter((s) => s.shown.length > 0)
	);

	const totalShown = $derived(visible.reduce((n, s) => n + s.shown.length, 0));
	const totalPages = $derived(sections.reduce((n, s) => n + s.paths.length, 0));
	const filtering = $derived(
		query.trim() !== '' || status !== 'all' || template !== 'all' || notesOnly
	);

	/** A section's own progress, over every page in it, whatever is filtered. */
	const decidedIn = (paths: string[]) =>
		paths.filter((p) => {
			const s = statusOf(p);
			return s !== undefined && s !== 'needs-review';
		}).length;

	// Which sections are closed. Sections start open (see the markup).
	const collapsed = new SvelteSet<string>();
	const allCollapsed = $derived(visible.length > 0 && visible.every((s) => collapsed.has(s.id)));
	function toggleAll() {
		if (allCollapsed) collapsed.clear();
		else for (const s of visible) collapsed.add(s.id);
	}

	/**
	 * A chip's count is how many rows clicking it shows -- nothing else.
	 *
	 * It is therefore computed over the listed paths with `statusOf`, NOT over
	 * `$pagesStore`. Those two differ whenever the review has no row for a listed
	 * page, and the first version of this counted `All` one way (listed pages)
	 * and each status the other (review rows), so the chips read `All 43` beside
	 * `6 · 2 · 1 · 1` and did not add up. A reviewer reads a row of counts as
	 * parts of a whole and will try to sum them.
	 *
	 * They still need not sum to `All`, and that is honest: the difference is
	 * exactly the pages with no review row, which belong to no status. The query
	 * is deliberately ignored, so a chip reads the same whatever is typed.
	 */
	const allPaths = $derived(sections.flatMap((s) => s.paths));
	const countFor = (s: StatusFilter) =>
		s === 'all' ? allPaths.length : allPaths.filter((p) => statusOf(p) === s).length;

	/**
	 * A status with no pages gets no chip: clicking it would show an empty list,
	 * the dead end the status card's shortcuts already avoid by the same rule.
	 * The ACTIVE filter is kept even at zero, so a reviewer who filtered to
	 * Approved and then un-approved its last page can still see, and leave,
	 * the filter that is running.
	 */
	const FILTERS = $derived([
		{ value: 'all' as StatusFilter, label: 'All' },
		...QUEUE_STATUS_ORDER.filter((s) => s === status || countFor(s) > 0).map((s) => ({
			value: s as StatusFilter,
			label: STATUS_LABELS[s].label
		}))
	]);

	const templates = $derived(
		[...new Set(sections.flatMap((s) => s.paths).map(typeOf))].filter(Boolean).sort()
	);
	const notesCount = $derived(allPaths.filter(hasNotes).length);

	/**
	 * The muted line under a title. For a corpus page it is the SF.gov path the
	 * page is proposed at. For a draft it is its drafting state: a reviewer who
	 * left while it drafted comes back here to see whether it finished. That
	 * state is a different fact from the review decision, which stays the badge.
	 */
	const metaFor = (path: string): { meta: string; tone: 'default' | 'progress' | 'danger' } => {
		const draft = $draftsStore.find((d) => d.path === path);
		if (!draft) {
			const slug = (pageStore.pages.find((p) => p.id === path) as { slug?: string } | undefined)
				?.slug;
			return { meta: slug ? slug.replace(/^sf\.gov/, '') : '', tone: 'default' };
		}
		if (draft.state === 'failed') return { meta: 'Draft failed. Open to retry.', tone: 'danger' };
		if (isStaleDraft(draft)) return { meta: 'Drafting stalled. Open to retry.', tone: 'danger' };
		if (draft.state === 'drafting')
			return { meta: 'Drafting, about a minute. Safe to keep reviewing.', tone: 'progress' };
		return { meta: 'Draft ready', tone: 'default' };
	};

	/** The empty message names everything applied, so it can be undone. */
	const statusName = $derived(status === 'all' ? '' : STATUS_LABELS[status].label);
	const emptyMessage = $derived.by(() => {
		const q = query.trim();
		if (q && statusName) return `No pages marked “${statusName}” match “${q}”.`;
		if (q) return `No pages match “${q}”.`;
		if (statusName) return `No pages are marked “${statusName}”.`;
		return 'No pages match these filters.';
	});

	let searchInput: HTMLInputElement | undefined = $state();

	async function clearAll() {
		query = '';
		status = 'all';
		template = 'all';
		notesOnly = false;
		await tick();
		searchInput?.focus();
	}
</script>

{#snippet statusPill(s: keyof typeof STATUS_LABELS)}
	<span
		class="inline-flex shrink-0 items-center justify-self-start rounded-full border px-2.5 py-0.5 text-xs font-medium {STATUS_LABELS[
			s
		].badge}"
	>
		{STATUS_LABELS[s].label}
	</span>
{/snippet}

{#snippet dash()}
	<span class="hidden text-slate-500 @3xl/list:inline" aria-hidden="true">—</span>
{/snippet}

{#snippet row(path: string)}
	{@const s = statusOf(path)}
	{@const m = metaFor(path)}
	{@const type = typeOf(path)}
	{@const title = titleFor(path)}
	<!-- The title link is stretched over the whole row (`after:inset-0`), so the
	     hit area is the row and a list of 40 pages is 40 tab stops. Status,
	     template and notes are plain text beside it, read in column order. The
	     one other link, Move to Karl, is lifted above the stretched one. -->
	<li
		class="relative grid gap-2 border-t border-sfds-grey-l2 px-5 py-3 hover:bg-sfds-blue-l1/60 @3xl/list:grid-cols-(--page-cols) @3xl/list:items-center @3xl/list:gap-4 {m.tone ===
		'progress'
			? 'bg-sfds-blue-l1/60 shadow-[inset_3px_0_0_var(--color-sfds-action)]'
			: 'bg-white'}"
	>
		<a
			href={resolve(reviewHrefFor(path))}
			class="block min-w-0 text-[0.9375rem] font-medium text-sfds-black after:absolute after:inset-0 hover:text-sfds-action hover:underline focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-sfds-black"
		>
			{title}
			{#if m.meta}
				<span
					class="mt-0.5 block text-[0.8125rem] font-normal break-words {m.tone === 'danger'
						? 'text-sfds-red'
						: 'text-sfds-slate-l3'}"
				>
					{#if m.tone === 'progress'}
						<span
							class="mr-1.5 inline-block size-2 rounded-full bg-sfds-action align-[1px] motion-safe:animate-pulse"
							aria-hidden="true"
						></span>
					{/if}
					{m.meta}
				</span>
			{/if}
		</a>
		<div class="flex flex-wrap items-center gap-2 @3xl/list:contents">
			{#if type}
				<span
					class="justify-self-start rounded-full border border-slate-300 px-2.5 py-0.5 text-xs text-sfds-black"
				>
					{type}
				</span>
			{:else}
				{@render dash()}
			{/if}
			{#if hasReview}
				{#if s}{@render statusPill(s)}{:else}{@render dash()}{/if}
				{#if hasNotes(path)}
					<span class="flex items-center gap-1 text-[0.8125rem] text-slate-700">
						<MessageSquare class="size-3.5" aria-hidden="true" />
						Note
					</span>
				{:else}
					{@render dash()}
				{/if}
				{#if s === 'approved'}
					<a
						href="{resolve(reviewHrefFor(path))}{WALKTHROUGH_QUERY}"
						aria-label="Move to Karl: {title}"
						class="relative z-10 inline-flex h-7 items-center gap-1 justify-self-start rounded-lg bg-sfds-action pr-2 pl-2.5 text-[0.8125rem] font-medium text-white hover:bg-sfds-blue-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sfds-black"
					>
						Move to Karl
						<ArrowRight class="size-3.5" aria-hidden="true" />
					</a>
				{:else}
					{@render dash()}
				{/if}
			{/if}
		</div>
	</li>
{/snippet}

<!-- `--page-cols` is the grid for a row and for the column heads, so the two
     cannot drift. It applies only when the LIST is wide enough (a container
     query, not the viewport): beside the propose panel the list is narrow on a
     wide screen, and each row stacks instead. -->
<section
	aria-labelledby="all-pages"
	class="@container/list overflow-hidden rounded-[3px] border border-sfds-grey-l2 bg-white {hasReview
		? '[--page-cols:minmax(0,1fr)_8.5rem_8.5rem_4rem_8.5rem]'
		: '[--page-cols:minmax(0,1fr)_8.5rem]'}"
>
	<div class="flex flex-col gap-3 p-5">
		<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
			<div class="flex flex-wrap items-baseline gap-x-2">
				<!-- `tabindex="-1"`: the status card's shortcuts move focus here, so a
				     keyboard or screen-reader user lands where the filtered rows begin.
				     The count sits beside the heading, not in it, so the region is
				     still named "All pages". -->
				<h2
					id="all-pages"
					tabindex="-1"
					class="scroll-mt-4 text-lg font-bold text-slate-900 focus:outline-none"
				>
					All pages
				</h2>
				<!-- A filter changes what is on screen without moving focus, so a
				     sighted user sees it and a screen-reader user is told. A live
				     region only while filtering: an unconditional one would announce
				     on first paint. -->
				<p role={filtering ? 'status' : undefined} class="text-lg font-bold text-slate-900">
					{#if filtering}
						<span class="text-sm font-normal text-slate-700"
							>{totalShown} of {totalPages} pages</span
						>
					{:else}
						({totalPages})
					{/if}
				</p>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<label for="page-sort" class="text-sm text-slate-700">Sort</label>
				<select
					id="page-sort"
					bind:value={sort}
					class="h-9 rounded-[3px] border border-slate-300 bg-white px-2 text-sm text-sfds-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sfds-black"
				>
					<option value="section">Section order</option>
					<option value="title">Title A–Z</option>
				</select>
				{#if sort === 'section'}
					<button
						type="button"
						onclick={toggleAll}
						class="h-9 rounded-[3px] px-2.5 text-sm font-medium text-sfds-action hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sfds-black"
					>
						{allCollapsed ? 'Expand all' : 'Collapse all'}
					</button>
				{/if}
			</div>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<label
				class="flex h-10 min-w-0 flex-[1_1_16rem] items-center gap-2 rounded-[3px] border border-slate-300 bg-white px-3 text-sfds-slate-l3 focus-within:border-sfds-action focus-within:ring-1 focus-within:ring-sfds-action"
			>
				<Search class="size-4 shrink-0" aria-hidden="true" />
				<span class="sr-only">Search pages</span>
				<input
					id="page-search"
					type="search"
					bind:this={searchInput}
					bind:value={query}
					placeholder="Search by title or path"
					autocomplete="off"
					class="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-sfds-black placeholder:text-sfds-slate-l3 focus:ring-0 focus:outline-none"
				/>
			</label>
			{#if templates.length > 1}
				<select
					aria-label="Template"
					bind:value={template}
					class="h-10 rounded-[3px] border border-slate-300 bg-white px-2.5 text-sm text-sfds-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sfds-black"
				>
					<option value="all">All templates</option>
					{#each templates as t (t)}
						<option value={t}>{t}</option>
					{/each}
				</select>
			{/if}
		</div>

		{#if hasReview}
			<div class="flex flex-wrap items-center gap-2">
				<ToggleGroup.Root
					type="single"
					variant="outline"
					size="sm"
					spacing={0}
					class="flex flex-wrap justify-start gap-2"
					aria-label="Filter by status"
					bind:value={status}
				>
					<!-- Pills. The selected one is tinted, bordered in the action blue
					     and set in semibold navy: three cues, none of them colour alone
					     (navy on the tint is 15:1). -->
					{#each FILTERS as f (f.value)}
						<ToggleGroup.Item
							value={f.value}
							class="h-9 rounded-full! border! border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 data-[state=on]:border-sfds-action data-[state=on]:bg-sfds-blue-l1 data-[state=on]:font-semibold data-[state=on]:text-sfds-blue-dark data-[state=on]:hover:bg-sfds-blue-l1"
						>
							{f.label}
							<span class="ml-1.5 tabular-nums">{countFor(f.value)}</span>
						</ToggleGroup.Item>
					{/each}
				</ToggleGroup.Root>
				{#if notesCount > 0 || notesOnly}
					<span class="mx-1 h-6 w-px bg-sfds-grey-l2" aria-hidden="true"></span>
					<button
						type="button"
						aria-pressed={notesOnly}
						onclick={() => (notesOnly = !notesOnly)}
						class="h-9 rounded-full border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sfds-black {notesOnly
							? 'border-sfds-action bg-sfds-blue-l1 font-semibold text-sfds-blue-dark'
							: 'border-slate-300 bg-white text-slate-900 hover:bg-muted'}"
					>
						Has notes
						<span class="ml-1.5 tabular-nums">{notesCount}</span>
					</button>
				{/if}
			</div>
		{/if}

		{#if totalShown === 0}
			<div class="flex flex-wrap items-center gap-x-4 gap-y-2 py-2">
				<p role="status" class="text-slate-800">{emptyMessage}</p>
				<Button variant="outline" onclick={clearAll}>Clear search and filter</Button>
			</div>
		{/if}
	</div>

	{#if totalShown > 0}
		<!-- Column heads, for the eye only: each cell already says what it is
		     ("Approved", "Note", "Move to Karl"), so they are hidden from a screen
		     reader rather than read out as five loose words. -->
		<div
			aria-hidden="true"
			class="hidden grid-cols-(--page-cols) gap-4 border-t border-sfds-grey-l2 bg-slate-50 px-5 py-2 text-xs font-semibold tracking-[0.04em] text-slate-700 uppercase @3xl/list:grid"
		>
			<span>Page</span><span>Template</span>
			{#if hasReview}<span>Status</span><span>Notes</span><span>Karl</span>{/if}
		</div>
	{/if}

	<!-- Native `<details>`, the same mechanism as the review guide, so the page
	     has one disclosure pattern rather than two keyboard behaviours.

	     SECTIONS DEFAULT TO OPEN. A closed `<details>` has its contents removed
	     from the accessibility tree — not merely hidden visually — so rows inside
	     a collapsed section are unreachable by a screen reader and invisible to
	     `getByRole`. Collapsing is the affordance for tidying 40 rows away, not
	     the resting state.

	     Sections with no matches are dropped above rather than shown at zero, so
	     a filter never leaves a count with nothing under it. -->
	{#each visible as section (section.id)}
		{#if section.heading}
			<details
				open={!collapsed.has(section.id)}
				ontoggle={(e) => {
					if (e.currentTarget.open) collapsed.delete(section.id);
					else collapsed.add(section.id);
				}}
				class="group"
			>
				<summary
					class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 border-t border-sfds-grey-l2 bg-slate-100 px-5 py-2 marker:content-none hover:bg-sfds-blue-l1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sfds-black"
				>
					<span class="flex items-center gap-2">
						<ChevronDown
							class="size-4 shrink-0 -rotate-90 text-slate-700 transition-transform group-open:rotate-0"
							aria-hidden="true"
						/>
						<span class="font-semibold text-slate-900">{section.heading}</span>
						<span class="text-slate-700 tabular-nums">({section.shown.length})</span>
					</span>
					{#if hasReview}
						<span class="text-sm text-slate-700 tabular-nums">
							{decidedIn(section.paths)} of {section.paths.length} decided
						</span>
					{/if}
				</summary>
				<ul>
					{#each section.shown as path (path)}
						{@render row(path)}
					{/each}
				</ul>
			</details>
		{:else}
			<ul>
				{#each section.shown as path (path)}
					{@render row(path)}
				{/each}
			</ul>
		{/if}
	{/each}
</section>
