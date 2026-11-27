<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import Search from '@lucide/svelte/icons/search';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
	import { tick } from 'svelte';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import { isDraftPath, reviewHrefFor } from '$lib/corpus/draftPath';
	import { pageTitleFor } from '$lib/corpus/pageTitle';
	import { WALKTHROUGH_QUERY } from '$lib/karl/walkthroughLink';
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
		/** The status filter. Bindable so the progress card's legend can set it. */
		status?: StatusFilter;
	} = $props();

	const titleFor = (path: string) => pageTitleFor(path, pageStore.pages, $draftsStore);

	/**
	 * A path's review row, or `undefined` when the review has none.
	 *
	 * "No row" is NOT the same as `needs-review`, and `filterPages` depends on
	 * the difference: a corpus page with no row has no decision to be undecided
	 * about, and defaulting it to `needs-review` would list it as awaiting a
	 * decision that cannot be recorded. Signed out there are no rows at all,
	 * which is why the status column and the filters are hidden rather than
	 * showing 39 Undecided.
	 */
	const rowOf = (path: string) => $pagesStore.find((p) => p.path === path);
	const statusOf = (path: string) => rowOf(path)?.status;
	const hasNotes = (path: string) => (rowOf(path)?.manager_notes ?? '').trim() !== '';

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
	// being readable without an account.
	//
	// Keyed on the store having rows rather than on `sessionStore`, because the
	// rows are what the columns and the filters actually need: during the initial
	// check, and after a load that failed, a reviewer IS signed in and there is
	// still nothing to show. So the controls appear when they can work, which
	// also means they appear once rather than flashing in and out.
	const hasReview = $derived($pagesStore.length > 0);

	/** The page's Karl template -- its `type` -- or '' for a draft not yet built. */
	const typeOf = (path: string) => pageStore.pages.find((p) => p.id === path)?.type ?? '';

	/** The page's path on SF.gov, from its slug: `sf.gov/report-mold` -> `/report-mold`. */
	const sfPathOf = (path: string) => {
		const slug = pageStore.pages.find((p) => p.id === path)?.slug;
		return typeof slug === 'string' ? slug.replace(/^sf\.gov/, '') || '/' : '';
	};

	/** The templates in the corpus, for the template filter. */
	const templates = $derived(
		[...new Set(pageStore.pages.map((p) => p.type).filter((t): t is string => !!t))].sort((a, b) =>
			a.localeCompare(b)
		)
	);

	let template = $state('');
	let withNotes = $state(false);
	let sort = $state<'section' | 'title'>('section');

	const shownIn = (paths: string[]) =>
		filterPages({
			paths,
			query,
			status,
			statusOf,
			titleOf: titleFor,
			template,
			typeOf,
			withNotes,
			hasNotes
		});

	const allPaths = $derived(sections.flatMap((s) => s.paths));

	/**
	 * What is listed. In section order, the themed headings with their matches
	 * (a heading with none is dropped, so a filter never leaves a count with
	 * nothing under it). Sorted by title, one list with no headings: a title
	 * order that restarted under every heading would not be one.
	 */
	const visible = $derived.by(() => {
		if (sort === 'title') {
			const shown = shownIn(allPaths).sort((a, b) => titleFor(a).localeCompare(titleFor(b)));
			return shown.length > 0 ? [{ id: 'by-title', heading: '', paths: allPaths, shown }] : [];
		}
		return sections
			.map((s) => ({ ...s, shown: shownIn(s.paths) }))
			.filter((s) => s.shown.length > 0);
	});

	const totalShown = $derived(visible.reduce((n, s) => n + s.shown.length, 0));
	const filtering = $derived(
		query.trim() !== '' || status !== 'all' || template !== '' || withNotes
	);

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
	const countFor = (s: StatusFilter) =>
		s === 'all' ? allPaths.length : allPaths.filter((p) => statusOf(p) === s).length;
	const notesCount = $derived(allPaths.filter(hasNotes).length);

	/**
	 * A status with no pages gets no chip: clicking it would show an empty list,
	 * the dead end the progress card's legend already avoids by the same rule.
	 * The ACTIVE filter is kept even at zero, so a reviewer who filtered to
	 * Approved and then un-approved its last page can still see, and leave,
	 * the filter that is running. "Has notes" follows the same rule.
	 */
	const FILTERS = $derived([
		{ value: 'all' as StatusFilter, label: 'All' },
		...QUEUE_STATUS_ORDER.filter((s) => s === status || countFor(s) > 0).map((s) => ({
			value: s as StatusFilter,
			label: STATUS_LABELS[s].label
		}))
	]);

	/**
	 * A draft's meta line is its drafting state, not its path: a reviewer who
	 * left while it drafted comes back here to see whether it finished. That
	 * state is a different fact from the review decision, which stays the badge.
	 */
	const metaFor = (path: string): { meta: string; tone: 'default' | 'progress' | 'danger' } => {
		const draft = $draftsStore.find((d) => d.path === path);
		if (!draft) return { meta: sfPathOf(path), tone: 'default' };
		if (draft.state === 'failed') return { meta: 'Draft failed — open to retry', tone: 'danger' };
		if (isStaleDraft(draft)) return { meta: 'Drafting stalled — open to retry', tone: 'danger' };
		if (draft.state === 'drafting')
			return { meta: 'Drafting, about a minute. Safe to keep reviewing.', tone: 'progress' };
		return { meta: 'Draft ready', tone: 'default' };
	};

	/** The columns in words, for the row link's name: ", Approved, Transaction, has a note". */
	const srDetails = (s: ReturnType<typeof statusOf>, type: string, noted: boolean) =>
		[s && STATUS_LABELS[s].label, type, noted && 'has a note']
			.filter(Boolean)
			.map((part) => `, ${part}`)
			.join('');

	/** "1 of 7 decided" for a heading: of its pages that have a review row. */
	const decidedIn = (paths: string[]) => {
		const rowed = paths.filter((p) => statusOf(p) !== undefined);
		const decided = rowed.filter((p) => statusOf(p) !== 'needs-review').length;
		return { decided, of: rowed.length };
	};

	/** The empty message names everything applied, so it can be undone. */
	const statusName = $derived(status === 'all' ? '' : STATUS_LABELS[status].label);
	const emptyMessage = $derived.by(() => {
		const q = query.trim();
		const subject = withNotes ? 'pages with notes' : 'pages';
		const marked = statusName ? ` marked “${statusName}”` : '';
		const using = template ? ` using the ${template} template` : '';
		if (q) return `No ${subject}${marked}${using} match “${q}”.`;
		return `No ${subject}${marked}${using}.`;
	});

	let searchInput: HTMLInputElement | undefined = $state();

	async function clearAll() {
		query = '';
		status = 'all';
		template = '';
		withNotes = false;
		await tick();
		searchInput?.focus();
	}

	/**
	 * Which headings are collapsed. Absent means open: SECTIONS DEFAULT TO OPEN.
	 * A closed `<details>` has its contents removed from the accessibility tree
	 * -- not merely hidden visually -- so rows inside a collapsed section are
	 * unreachable by a screen reader and invisible to `getByRole`. Scannable rows
	 * that start hidden are not scannable, and collapsing is the affordance for
	 * tidying 39 of them away, not the resting state.
	 *
	 * While a filter runs every matching heading is shown open: a search hit
	 * inside a heading collapsed earlier would otherwise be counted in "3 of 41
	 * pages" and be nowhere on screen.
	 */
	let collapsed = $state<Record<string, boolean>>({});
	const anyOpen = $derived(visible.some((s) => filtering || !collapsed[s.id]));

	function toggleAll() {
		const close = anyOpen;
		collapsed = Object.fromEntries(sections.map((s) => [s.id, close]));
	}

	// One grid for the column header and every row, so the columns line up.
	// Signed out there is no status, note or Karl column to show. Keyed on the
	// LIST's width (`@container`, `@3xl:`), not the viewport's: with the Propose
	// panel open beside it the list is ~680px on a 1280px screen, and four fixed
	// columns left the title about 100px.
	const columns = $derived(
		hasReview
			? '@3xl:grid-cols-[minmax(0,1fr)_8.5rem_8.5rem_4rem_8.5rem]'
			: '@3xl:grid-cols-[minmax(0,1fr)_8.5rem]'
	);

	const pill = 'inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs';
	const chip =
		'h-9 rounded-full! border! border-slate-300! px-3 text-sm font-normal text-slate-900 hover:bg-sfds-blue-l1/60';
	const chipOn =
		'data-[state=on]:border-sfds-action! data-[state=on]:bg-sfds-blue-l1 data-[state=on]:font-semibold data-[state=on]:text-sfds-blue-dark data-[state=on]:hover:bg-sfds-blue-l1';
	const control =
		'h-10 rounded-[3px] border border-slate-300 bg-white text-sm text-sfds-black focus:border-sfds-action focus:ring-1 focus:ring-sfds-action focus:outline-none';
</script>

<section
	aria-labelledby="all-pages"
	class="@container overflow-hidden rounded-[3px] border border-sfds-grey-l2 bg-white"
>
	<div class="space-y-3 p-4 sm:p-5">
		<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
			<div class="flex items-baseline gap-2">
				<!-- `tabindex="-1"`: the progress card's legend moves focus here, so a
				     keyboard or screen-reader user lands where the filtered rows begin.
				     The count sits outside the heading so the region keeps its name. -->
				<h2
					id="all-pages"
					tabindex="-1"
					class="scroll-mt-4 text-lg font-bold text-slate-900 focus:outline-none"
				>
					All pages
				</h2>
				<span class="text-lg font-bold text-slate-900 tabular-nums">({allPaths.length})</span>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<label for="page-sort" class="text-sm text-slate-700">Sort</label>
				<select id="page-sort" bind:value={sort} class="{control} h-9 px-2">
					<option value="section">Section order</option>
					<option value="title">Title A–Z</option>
				</select>
				{#if sort === 'section'}
					<Button variant="ghost" class="h-9 text-sfds-action" onclick={toggleAll}>
						{anyOpen ? 'Collapse all' : 'Expand all'}
					</Button>
				{/if}
			</div>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<label class="sr-only" for="page-search">Search pages</label>
			<div class="relative min-w-0 flex-[1_1_16rem]">
				<Search
					class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-sfds-slate-l3"
					aria-hidden="true"
				/>
				<input
					id="page-search"
					type="search"
					bind:this={searchInput}
					bind:value={query}
					placeholder="Search by title or path"
					autocomplete="off"
					class="{control} w-full pr-3 pl-9 placeholder:text-sfds-slate-l3"
				/>
			</div>
			<label class="sr-only" for="page-template">Template</label>
			<select id="page-template" bind:value={template} class="{control} px-2.5">
				<option value="">All templates</option>
				{#each templates as t (t)}
					<option value={t}>{t}</option>
				{/each}
			</select>
		</div>

		{#if hasReview}
			<div class="flex flex-wrap items-center gap-2">
				<ToggleGroup.Root
					type="single"
					variant="outline"
					spacing={2}
					class="flex flex-wrap justify-start gap-2"
					aria-label="Filter by status"
					bind:value={status}
				>
					<!-- The selected chip is tinted, bordered in the action blue and set
					     in bold dark blue: three cues at once, because a faint ring alone
					     was too hard to find in a row of five -- seen on screen, not in a
					     test. sfds-blue-dark on blue-l1 is well past 4.5:1. -->
					{#each FILTERS as f (f.value)}
						<ToggleGroup.Item value={f.value} class="{chip} {chipOn}">
							{f.label}
							<span class="ml-1 tabular-nums">{countFor(f.value)}</span>
						</ToggleGroup.Item>
					{/each}
				</ToggleGroup.Root>
				{#if notesCount > 0 || withNotes}
					<span class="mx-1 h-6 w-px bg-sfds-grey-l2" aria-hidden="true"></span>
					<button
						type="button"
						aria-pressed={withNotes}
						onclick={() => (withNotes = !withNotes)}
						class="inline-flex h-9 items-center gap-1 rounded-full border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sfds-black {withNotes
							? 'border-sfds-action bg-sfds-blue-l1 font-semibold text-sfds-blue-dark'
							: 'border-slate-300 text-slate-900 hover:bg-sfds-blue-l1/60'}"
					>
						Has notes
						<span class="tabular-nums">{notesCount}</span>
					</button>
				{/if}
			</div>
		{/if}

		<!-- A filter changes what is on screen without moving focus, so a sighted
		     user sees it and a screen-reader user is told. Only while filtering:
		     an unconditional live region would announce on first paint. -->
		<p role="status" class="text-sm text-slate-700 empty:hidden">
			{#if filtering}
				{totalShown} of {allPaths.length} pages
			{/if}
		</p>
	</div>

	{#if totalShown === 0}
		<div class="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-sfds-grey-l2 px-5 py-4">
			<p role="status" class="text-slate-800">{emptyMessage}</p>
			<Button variant="outline" onclick={clearAll}>Clear search and filters</Button>
		</div>
	{:else}
		<!-- Column labels for the eye. Each row's link already carries its status,
		     template and note in its name, so these are hidden from the
		     accessibility tree rather than announced as a stray line of text. -->
		<div
			aria-hidden="true"
			class="hidden gap-4 border-t border-sfds-grey-l2 bg-slate-50 px-5 py-2 text-xs font-semibold tracking-wide text-slate-700 uppercase @3xl:grid {columns}"
		>
			<span>Page</span>
			<span>Template</span>
			{#if hasReview}
				<span>Status</span>
				<span>Notes</span>
				<span>Karl</span>
			{/if}
		</div>
	{/if}

	{#snippet rows(paths: string[])}
		<ul>
			{#each paths as path (path)}
				{@const s = statusOf(path)}
				{@const m = metaFor(path)}
				{@const type = typeOf(path)}
				{@const noted = hasNotes(path)}
				{@const title = titleFor(path)}
				<!-- The stretched link: ONE anchor whose `::after` covers the row, so
				     the hit area is the row and not the words, and a list of 39 pages
				     is 39 tab stops. Only the Move to Karl link sits above it
				     (`relative z-10`) -- a second, different destination. -->
				<li
					class="relative flex flex-col gap-2 border-t border-sfds-grey-l2 px-4 py-3 transition-colors hover:bg-sfds-blue-l1/60 sm:px-5 @3xl:grid @3xl:items-center @3xl:gap-4 {columns} {m.tone ===
					'progress'
						? 'bg-sfds-blue-l1/60 shadow-[inset_3px_0_0_var(--color-sfds-action)]'
						: ''}"
				>
					<div class="min-w-0">
						<a
							href={resolve(reviewHrefFor(path))}
							class="block font-medium text-sfds-black after:absolute after:inset-0 after:content-[''] hover:text-sfds-action hover:underline focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-sfds-black"
						>
							<!-- What the columns show, in the name a screen reader reads on tab: the
							     visible pills are `aria-hidden`, so it is said once. Inside the title's
							     span, so no whitespace node splits ", Approved" from the title. -->
							<span class="block"
								>{title}<span class="sr-only">{srDetails(s, type, noted)}{m.meta ? ',' : ''}</span
								></span
							>
							{#if m.meta}
								<span
									data-slot="page-row-meta"
									class="mt-0.5 block text-[0.8125rem] leading-[1.125rem] font-normal {m.tone ===
									'danger'
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
					</div>
					<div class="flex flex-wrap items-center gap-2 empty:hidden @3xl:contents">
						{#if type}
							<span aria-hidden="true" class="{pill} justify-self-start border-slate-300"
								>{type}</span
							>
						{:else}
							<span aria-hidden="true" class="hidden text-slate-500 @3xl:inline">—</span>
						{/if}
						{#if hasReview}
							{#if s}
								<span
									aria-hidden="true"
									data-slot="page-row-badge"
									class="{pill} justify-self-start font-medium {STATUS_LABELS[s].badge}"
									>{STATUS_LABELS[s].label}</span
								>
							{:else}
								<span aria-hidden="true" class="hidden text-slate-500 @3xl:inline">—</span>
							{/if}
							{#if noted}
								<span
									aria-hidden="true"
									class="inline-flex items-center gap-1 text-[0.8125rem] text-slate-700"
								>
									<MessageSquare class="size-3.5" />Note
								</span>
							{:else}
								<span aria-hidden="true" class="hidden text-slate-500 @3xl:inline">—</span>
							{/if}
							{#if s === 'approved'}
								<!-- Straight into the walkthrough: `?view=walkthrough` is the
								     deep link the review layout reads. The name starts with the
								     visible words (WCAG 2.5.3) and says which page. -->
								<Button
									href="{resolve(reviewHrefFor(path))}{WALKTHROUGH_QUERY}"
									size="sm"
									aria-label="Move to Karl: {title}"
									class="relative z-10 justify-self-start"
								>
									Move to Karl
									<ArrowRight aria-hidden="true" data-icon="inline-end" />
								</Button>
							{:else}
								<span aria-hidden="true" class="hidden text-slate-500 @3xl:inline">—</span>
							{/if}
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/snippet}

	{#each visible as section (section.id)}
		{#if section.heading}
			{@const progress = decidedIn(section.paths)}
			<!-- Native `<details>`, the same mechanism as the review guide, so the
			     page has one disclosure pattern rather than two keyboard behaviours. -->
			<details
				open={filtering || !collapsed[section.id]}
				ontoggle={(e) => (collapsed[section.id] = !e.currentTarget.open)}
				class="group"
			>
				<summary
					class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 border-t border-sfds-grey-l2 bg-slate-100 px-4 py-2 marker:content-none hover:bg-sfds-blue-l1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sfds-black sm:px-5"
				>
					<span class="flex items-center gap-2 font-semibold text-slate-900">
						<ChevronDown
							class="size-4 shrink-0 -rotate-90 text-slate-700 transition-transform group-open:rotate-0"
							aria-hidden="true"
						/>
						<span>{section.heading}</span>
						<span class="font-normal text-slate-700 tabular-nums">({section.shown.length})</span>
					</span>
					{#if hasReview && progress.of > 0}
						<span class="text-sm text-slate-700 tabular-nums">
							{progress.decided} of {progress.of} decided
						</span>
					{/if}
				</summary>
				{@render rows(section.shown)}
			</details>
		{:else}
			{@render rows(section.shown)}
		{/if}
	{/each}
</section>
