<script lang="ts">
	import { page as routePage } from '$app/stores';
	import { resolve } from '$app/paths';
	import { pagesStore, editsStore, addPageToReview } from '$lib/stores/reviewState';
	import { groupPaths } from '$lib/landing/groups';
	import { review } from '$lib/review/review.svelte';
	import { pageStore } from '$lib/stores/pageData.svelte';
	import { isDraftPath, routePathFor } from '$lib/corpus/draftPath';
	import { pageTitleFor } from '$lib/corpus/pageTitle';
	import { draftsStore } from '$lib/stores/draftPages';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { sessionStore } from '$lib/stores/session.svelte';
	import { STATUS_LABELS } from '$lib/review/statusLabels';
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

	// The review squared with the corpus (`review`, from `$lib/review/review.svelte`):
	// retired pages' rows are left out, corpus pages with no row are listed and
	// counted, and the landing page reads the same numbers. `loaded` is about the
	// load, not the corpus -- the empty, loading and failed states below key on it.
	const loaded = $derived(review.loaded);
	const decided = $derived(review.decided);
	const total = $derived(review.total);
	const pct = $derived(total === 0 ? 0 : Math.round((decided / total) * 100));

	// One edit row per (page, field) -- `saveInlineEdit` replaces rather than
	// appends locally, so this counts fields touched, not saves made.
	const editCount = (pageId: string) => $editsStore.filter((e) => e.page_id === pageId).length;

	// Filters the rows only. Progress above stays computed on every page, since
	// "N of M decided" describes the review, not the current search.
	let query = $state('');
	const needle = $derived(query.trim().toLowerCase());
	// A corpus page flagged `proposed`, or an AI draft: the queue already files
	// drafts under "Proposed pages", so the toggle that says so keeps them.
	let proposedOnly = $state(false);
	const isProposed = (path: string) => isDraftPath(path) || corpusFor(path)?.proposed === true;
	const matches = (path: string) =>
		(!proposedOnly || isProposed(path)) &&
		(needle === '' ||
			titleFor(path).toLowerCase().includes(needle) ||
			path.toLowerCase().includes(needle));
	const shown = $derived(review.rows.filter((p) => matches(p.path)));
	const unreviewedShown = $derived(review.unreviewed.filter(matches));

	// Signed out, the review data is unreadable but the corpus is not, so the
	// queue lists the mockups in corpus order. No status, notes or progress:
	// those are review data.
	const browsing = $derived(!loaded && sessionStore.knownSignedOut);
	const corpusShown = $derived(pageStore.pages.filter((p) => matches(p.id)));

	// What the corpus says about a page, for every row's second line: its type,
	// and "Proposed" as a word for a page not yet in the reviewed set.
	const pageFacts = (path: string) => {
		const page = corpusFor(path);
		return [page?.type, page?.proposed && 'Proposed'];
	};
	const joinMeta = (parts: unknown[]) => parts.filter(Boolean).join(' · ') || undefined;

	// The row's second line, as text. The queue is grouped by theme, the same
	// headings as the landing page, so the decision is the first thing said here
	// -- as a word, which needs no colour key (WCAG 1.4.1). Then the per-row
	// facts worth a glance: type, edits, notes.
	const metaFor = (p: (typeof $pagesStore)[number]) => {
		const edits = editCount(p.id);
		return joinMeta([
			STATUS_LABELS[p.status]?.label,
			...pageFacts(p.path),
			edits > 0 && `${edits} edited ${edits === 1 ? 'field' : 'fields'}`,
			p.manager_notes?.trim() && 'has notes'
		]);
	};

	const counts = $derived(review.counts);

	// "Add to review" on a page with no row. Per page, so adding one does not
	// lock the others; a failure is named on that page's row and the page stays
	// listed here, so the reviewer can try again.
	let adding = $state<Record<string, boolean>>({});
	let addFailed = $state<Record<string, boolean>>({});
	async function addToReview(path: string) {
		if (adding[path]) return;
		adding[path] = true;
		addFailed[path] = false;
		const ok = await addPageToReview(path);
		adding[path] = false;
		addFailed[path] = !ok;
	}

	// Under the landing page's headings and in its order (`groupPaths`), so the
	// two lists of the same pages read the same way. Signed out there are no
	// rows, so the corpus is grouped instead, with the page type as the meta.
	type Row = { path: string; title: string; meta: string | undefined };
	const rowsByPath = $derived(new Map(shown.map((p) => [p.path, p])));
	const themed = $derived.by(() => {
		const rowOf = (path: string): Row => {
			const r = rowsByPath.get(path);
			return r
				? { path, title: titleFor(path), meta: metaFor(r) }
				: { path, title: titleFor(path), meta: joinMeta(pageFacts(path)) };
		};
		const paths = browsing ? corpusShown.map((p) => p.id) : shown.map((p) => p.path);
		return groupPaths(paths)
			.filter((section) => section.paths.length > 0)
			.map((section) => ({ ...section, rows: section.paths.map(rowOf) }));
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
			class="sticky top-0 z-10 -mx-5 space-y-4 border-b border-border bg-background px-5 pt-4 pb-3"
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
					class="w-full rounded-[3px] border border-input bg-white px-2.5 py-1.5 text-[0.8125rem] text-sfds-black placeholder:text-sfds-slate-l3 focus:border-sfds-action focus:ring-1 focus:ring-sfds-action focus:outline-none max-lg:min-h-11"
				/>
				<label
					class="mt-2 flex items-center gap-2 text-[0.8125rem] text-sfds-black max-lg:mt-1 max-lg:min-h-11"
				>
					<input
						type="checkbox"
						bind:checked={proposedOnly}
						class="accent-sfds-action max-lg:size-5"
					/>
					Proposed pages only
				</label>
			</div>
		</div>
		{#if (browsing ? corpusShown.length : shown.length + unreviewedShown.length) === 0}
			<p role="status" class="text-sm text-sfds-slate-l3">
				{#if proposedOnly && query.trim() === ''}
					No proposed pages.
				{:else}
					No {proposedOnly ? 'proposed ' : ''}pages match “{query.trim()}”.
				{/if}
			</p>
		{/if}
	{/if}

	{#each themed as section (section.id)}
		<section aria-labelledby={`queue-group-${section.id}`}>
			<h3 class="mb-2 flex items-center justify-between">
				<span
					id={`queue-group-${section.id}`}
					class="text-[0.6875rem] font-bold tracking-[0.08em] text-sfds-slate-l3 uppercase"
				>
					{section.heading}
				</span>
				<span
					class="inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-sfds-grey-l2/70 px-1.5 text-[0.6875rem] font-bold text-sfds-black tabular-nums"
				>
					{section.rows.length}
				</span>
			</h3>
			<ul class="space-y-0.5">
				{#each section.rows as row (row.path)}
					<li>{@render queueLink(row.path, row.title, row.meta)}</li>
				{/each}
			</ul>
		</section>
	{/each}

	<!-- Corpus pages with no review row. They open like any other page, but the
	     decision control has no row to write to, so they are listed apart rather
	     than mixed into Undecided, where they would look decidable. "Add to
	     review" creates the row through `PUT /api/pages` (the table has no
	     INSERT policy) and the page moves into its group above. The button sits
	     beside the row's link, never inside it: PageRow's anchor must hold
	     nothing focusable. -->
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
				These pages have no review record yet. Add one to a page to decide it.
			</p>
			<ul class="space-y-1.5">
				{#each unreviewedShown as id (id)}
					<li>
						{@render queueLink(id, titleFor(id), joinMeta(pageFacts(id)))}
						<div class="mt-1 flex flex-wrap items-center gap-2 pl-3">
							<Button
								variant="outline"
								size="xs"
								aria-busy={adding[id] === true}
								aria-label={`Add “${titleFor(id)}” to the review`}
								onclick={() => addToReview(id)}
							>
								{adding[id] ? 'Adding…' : 'Add to review'}
							</Button>
							{#if addFailed[id]}
								<span role="alert" class="text-xs text-sfds-red">Couldn't add it. Try again.</span>
							{/if}
						</div>
					</li>
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
