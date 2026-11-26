<script lang="ts">
	import { page as routePage } from '$app/stores';
	import { resolve } from '$app/paths';
	import {
		pagesStore,
		editsStore,
		QUEUE_STATUS_ORDER,
		reconcileReview
	} from '$lib/stores/reviewState';
	import { pageStore } from '$lib/stores/pageData.svelte';
	import { routePathFor } from '$lib/corpus/draftPath';
	import { pageTitleFor } from '$lib/corpus/pageTitle';
	import { draftsStore } from '$lib/stores/draftPages';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { sessionStore } from '$lib/stores/session.svelte';
	import { STATUS_LABELS, type ReviewStatus } from '$lib/review/statusLabels';
	import StatusBar from '$lib/components/review/StatusBar.svelte';
	import PageRow from '$lib/components/review/PageRow.svelte';
	import { Button } from '$lib/components/ui/button/index.js';

	let {
		loadState = 'ready',
		onRetry
	}: {
		/**
		 * Where the layout's `loadReview` stands. Only consulted while the queue is
		 * empty: an empty store is a load in flight, a load that failed, or a
		 * review with no pages, and each needs different words.
		 */
		loadState?: 'loading' | 'ready' | 'failed';
		/** Re-runs the load after a failure. */
		onRetry?: () => void;
	} = $props();
	let retrying = $state(false);
	async function retry() {
		if (retrying) return;
		retrying = true;
		await onRetry?.();
		retrying = false;
	}

	// The pages table has no title column, so a hydrated row carries only `path`.
	// Titles come from the static corpus (whose derived id is that same path) or,
	// for a draft that is not ready, from `draftsStore`. See `pageTitleFor`.
	const corpusFor = (path: string) => pageStore.pages.find((p) => p.id === path);
	const draftFor = (path: string) => $draftsStore.find((d) => d.path === path);
	const titleFor = (path: string) => pageTitleFor(path, pageStore.pages, $draftsStore);
	const currentPath = $derived(routePathFor($routePage.params));

	// The store automatically updates via Supabase realtime subscriptions.
	//
	// Presentation only, and not held here: the words and tones come from
	// `STATUS_LABELS`, shared with the decision panel and the landing page. The
	// ORDER comes from `QUEUE_STATUS_ORDER`, so this and anything that needs to
	// name the queue's first page cannot disagree about which row that is.
	const groups = QUEUE_STATUS_ORDER.map((status) => ({
		status,
		heading: STATUS_LABELS[status].label
	}));

	// The table squared with the corpus (see `reconcileReview`): rows for pages
	// that no longer exist are left out, and corpus pages with no row are listed
	// and counted. `loaded` still reads the table, because the empty, loading and
	// failed states below are about the load, not about the corpus.
	const review = $derived(
		reconcileReview(
			$pagesStore,
			pageStore.pages.map((p) => p.id)
		)
	);
	const loaded = $derived($pagesStore.length > 0);

	// Decided = anything a reviewer has ruled on. `needs-review` is the initial
	// status every seeded row carries, so it is the only one that is not a
	// decision -- counting it would show the review as complete on load.
	const decided = $derived(review.rows.filter((p) => p.status !== 'needs-review').length);
	// Every page a reviewer can open, not every row: "0 of 38" over a 43-page
	// corpus left five pages out of the count with nothing on screen saying so.
	const total = $derived(review.total);
	const pct = $derived(total === 0 ? 0 : Math.round((decided / total) * 100));

	// One edit row per (page, field) -- `saveInlineEdit` replaces rather than
	// appends locally, so this counts fields touched, not saves made.
	const editCount = (pageId: string) => $editsStore.filter((e) => e.page_id === pageId).length;

	// Filters the rows only. Progress above stays computed on every page, since
	// "N of M decided" describes the review, not the current search.
	let query = $state('');
	const needle = $derived(query.trim().toLowerCase());
	const matches = (path: string) =>
		needle === '' ||
		titleFor(path).toLowerCase().includes(needle) ||
		path.toLowerCase().includes(needle);
	const shown = $derived(review.rows.filter((p) => matches(p.path)));
	const unreviewedShown = $derived(review.unreviewed.filter(matches));

	// Signed out, the review data is unreadable but the corpus is not, so the
	// queue lists the mockups in corpus order. No status, notes or progress:
	// those are review data.
	const browsing = $derived(!loaded && sessionStore.knownSignedOut);
	const corpusShown = $derived(
		needle === ''
			? pageStore.pages
			: pageStore.pages.filter(
					(p) => p.title.toLowerCase().includes(needle) || p.id.toLowerCase().includes(needle)
				)
	);

	// The row's second line, as text. There used to be a coloured dot here, but
	// inside a status group it only repeated the group's colour and said nothing
	// about the row. Notes and edits are the per-row facts worth a glance, and
	// as words they need no colour key (WCAG 1.4.1).
	const metaFor = (p: (typeof $pagesStore)[number]) => {
		const edits = editCount(p.id);
		return [
			corpusFor(p.path)?.type,
			edits > 0 && `${edits} edited ${edits === 1 ? 'field' : 'fields'}`,
			p.manager_notes?.trim() && 'has notes'
		]
			.filter(Boolean)
			.join(' · ');
	};

	const counts = $derived.by(() => {
		const tally: Partial<Record<ReviewStatus, number>> = {};
		for (const p of review.rows) tally[p.status] = (tally[p.status] ?? 0) + 1;
		return tally;
	});

	// Keep the current row on screen. Without this, landing on a page near the
	// bottom of the queue left the sidebar showing 30 other rows and not the one
	// being reviewed. Re-runs on navigation and on hydration (the row only
	// exists once `pagesStore` has loaded).
	//
	// Sets `scrollTop` on the nearest scrolling ancestor, not `scrollIntoView`:
	// the queue sits in a nested scroll area inside a fixed grid, and
	// `scrollIntoView` scrolls whatever ancestor it picks, dragging the whole
	// shell. See WalkthroughDrawer's note 3 for the same trap.
	let navEl = $state<HTMLElement | null>(null);
	$effect(() => {
		void currentPath;
		void $pagesStore;
		void browsing;
		const row = navEl?.querySelector<HTMLElement>('[aria-current="page"]');
		let box = row?.parentElement ?? null;
		while (box && box.scrollHeight <= box.clientHeight) box = box.parentElement;
		if (!row || !box) return;
		const r = row.getBoundingClientRect();
		const b = box.getBoundingClientRect();
		// Below the pinned progress and filter, not under them.
		const top =
			b.top + (navEl?.querySelector<HTMLElement>('[data-queue-pinned]')?.offsetHeight ?? 0);
		if (r.top < top) box.scrollTop += r.top - top - 8;
		else if (r.bottom > b.bottom) box.scrollTop += r.bottom - b.bottom + 8;
	});
</script>

{#snippet draftBadge()}
	<Badge variant="secondary" class="mt-0.5">AI draft</Badge>
{/snippet}

{#snippet queueLink(path: string, title: string, meta: string | undefined)}
	<PageRow
		density="compact"
		{path}
		{title}
		{meta}
		current={currentPath === path}
		badge={draftFor(path) ? draftBadge : undefined}
	/>
{/snippet}

<!-- Named apart from the rail around it (`aside`, "Review queue"): two
     landmarks with one name read as the same region twice in a landmark list. -->
<nav bind:this={navEl} class="space-y-5 px-5 pb-6" aria-label="Pages in this review">
	<!-- The empty state is not a loading state, and saying so was misleading.
	     An empty `pagesStore` here means one of two things, and the old
	     "No pages loaded. (Waiting for Supabase data)" described neither: it
	     named an implementation detail, promised data was on its way, and gave
	     the reviewer nothing to do.

	     Signed out is the common case BY FAR -- every `TO authenticated`
	     policy denies the read, so the queue is empty while the mockups still
	     render from the static corpus, which is exactly when a reviewer is
	     most likely to think the tool is broken. That case gets the action
	     that fixes it. -->
	{#if !loaded}
		{#if sessionStore.knownSignedOut}
			<p class="pt-4 text-sm text-sfds-slate-l3">
				<a href={resolve('/login')} class="font-semibold text-sfds-action hover:underline"
					>Sign in</a
				> to load the review queue.
			</p>
		{:else if loadState === 'failed'}
			<!-- Announced: it replaces a loading line the reviewer was waiting on.
			     Never disabled while retrying, as on the landing page's card. -->
			<div role="alert" class="space-y-2 pt-4">
				<p class="text-sm font-semibold text-sfds-red">The queue didn't load</p>
				<p class="text-sm text-sfds-black">
					The review data couldn't be reached. Your decisions are safe.
				</p>
				<Button variant="outline" size="sm" aria-busy={retrying} onclick={retry}>
					{retrying ? 'Trying…' : 'Try again'}
				</Button>
			</div>
		{:else if loadState === 'loading' || sessionStore.signedIn === undefined}
			<p role="status" class="pt-4 text-sm text-sfds-slate-l3">Loading the queue…</p>
		{:else}
			<p class="pt-4 text-sm text-sfds-slate-l3">This review has no pages yet.</p>
		{/if}
	{/if}

	{#if loaded || browsing}
		<!-- Pinned to the top of the rail's scroll area. The effect above scrolls
		     the current row into view, and for a page low in the queue that put
		     "N of M decided" and the filter 726px above the top of the rail
		     (measured at 1440x900), so the review's progress was off screen on
		     the page a reviewer had just opened. -->
		<div
			class="sticky top-0 z-10 -mx-5 space-y-4 border-b border-sfds-grey-l2 bg-background px-5 pt-4 pb-3"
			data-queue-pinned
		>
			{#if loaded}
				<section aria-label="Review progress">
					<div class="flex items-baseline justify-between">
						<span class="text-[0.8125rem] font-semibold text-sfds-black">
							{decided} of {total} decided
						</span>
						<span class="text-[0.8125rem] font-semibold text-sfds-slate-l3 tabular-nums"
							>{pct}%</span
						>
					</div>

					<div class="mt-2">
						<StatusBar size="sm" {counts} {total} />
					</div>
				</section>
			{/if}
			<div>
				<label for="queue-filter" class="sr-only">Filter pages</label>
				<input
					id="queue-filter"
					type="search"
					bind:value={query}
					placeholder="Filter by title or path"
					autocomplete="off"
					class="w-full rounded-[3px] border border-sfds-grey-l2 bg-white px-2.5 py-1.5 text-[0.8125rem] text-sfds-black placeholder:text-sfds-slate-l3 focus:border-sfds-action focus:ring-1 focus:ring-sfds-action focus:outline-none"
				/>
			</div>
		</div>
		{#if (browsing ? corpusShown.length : shown.length + unreviewedShown.length) === 0}
			<p role="status" class="text-sm text-sfds-slate-l3">No pages match “{query.trim()}”.</p>
		{/if}
	{/if}

	{#if browsing}
		<ul class="space-y-0.5">
			{#each corpusShown as p (p.id)}
				<li>{@render queueLink(p.id, p.title, p.type)}</li>
			{/each}
		</ul>
	{/if}

	{#each groups as group (group.status)}
		{@const pages = shown.filter((p) => p.status === group.status)}
		{#if pages.length > 0}
			<section>
				<h3 class="mb-2 flex items-center justify-between">
					<span class="text-[0.6875rem] font-bold tracking-[0.08em] text-sfds-slate-l3 uppercase">
						{group.heading}
					</span>
					<span
						class="inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-sfds-grey-l2/70 px-1.5 text-[0.6875rem] font-bold text-sfds-black tabular-nums"
					>
						{pages.length}
					</span>
				</h3>
				<ul class="space-y-0.5">
					{#each pages as p (p.path)}
						{@const meta = metaFor(p)}
						<li>{@render queueLink(p.path, titleFor(p.path), meta)}</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/each}

	<!-- Corpus pages with no review row. They open like any other page, but the
	     decision control has no row to write to and the app cannot create one
	     (the table has no INSERT policy), so they are listed apart rather than
	     mixed into Undecided, where they would look decidable. -->
	{#if loaded && unreviewedShown.length > 0}
		<section data-testid="queue-unreviewed">
			<h3 class="mb-1 flex items-center justify-between">
				<span class="text-[0.6875rem] font-bold tracking-[0.08em] text-sfds-slate-l3 uppercase">
					Not in the review yet
				</span>
				<span
					class="inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-sfds-grey-l2/70 px-1.5 text-[0.6875rem] font-bold text-sfds-black tabular-nums"
				>
					{unreviewedShown.length}
				</span>
			</h3>
			<p class="mb-2 text-xs text-sfds-slate-l3">
				These pages have no review record, so they can't be decided until one is added.
			</p>
			<ul class="space-y-0.5">
				{#each unreviewedShown as id (id)}
					<li>{@render queueLink(id, titleFor(id), corpusFor(id)?.type)}</li>
				{/each}
			</ul>
		</section>
	{/if}

	<!-- Rows for pages retired from the corpus. Not links: `/review/[slug]`
	     404s on a slug the corpus no longer has. Named, so the gap between the
	     table and the count is explained rather than silent. -->
	{#if review.retired.length > 0}
		<p class="text-xs text-sfds-slate-l3" data-testid="queue-retired">
			{review.retired.length}
			{review.retired.length === 1 ? 'review record belongs' : 'review records belong'} to pages no longer
			in the mockups, and {review.retired.length === 1 ? 'is' : 'are'} left out of the count:
			{review.retired.map((p) => p.path).join(', ')}.
		</p>
	{/if}
</nav>
