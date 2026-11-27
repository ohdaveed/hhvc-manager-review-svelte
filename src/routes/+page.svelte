<script lang="ts">
	import { onMount, tick } from 'svelte';
	import AllPagesList from '$lib/components/landing/AllPagesList.svelte';
	import HowItWorks from '$lib/components/landing/HowItWorks.svelte';
	import KarlWalkthroughGuide from '$lib/components/landing/KarlWalkthroughGuide.svelte';
	import ProgressSummary from '$lib/components/landing/ProgressSummary.svelte';
	import ProposePageForm from '$lib/components/landing/ProposePageForm.svelte';
	import StatusCard from '$lib/components/landing/StatusCard.svelte';
	import { isDraftPath } from '$lib/corpus/draftPath';
	import { pageTitleFor } from '$lib/corpus/pageTitle';
	import type { StatusFilter } from '$lib/landing/filter';
	import { reviewProgress } from '$lib/landing/progress';
	import { draftsStore } from '$lib/stores/draftPages';
	import { pageStore } from '$lib/stores/pageData.svelte';
	import { loadReview, queueOrder } from '$lib/stores/reviewState';
	import { review } from '$lib/review/review.svelte';
	import { sessionStore } from '$lib/stores/session.svelte';

	// The review squared with the corpus (`review`): the same rows, denominator
	// and counts the queue reads, so the two "N of M" lines cannot disagree.
	const progress = $derived({ ...reviewProgress(review.rows), total: review.total });

	// Per-status counts for the bar and its shortcuts.
	const counts = $derived(review.counts);
	const nextTitle = $derived(
		progress.nextPath === undefined
			? undefined
			: pageTitleFor(progress.nextPath, pageStore.pages, $draftsStore)
	);
	const nextMeta = $derived(
		progress.nextPath === undefined
			? undefined
			: isDraftPath(progress.nextPath)
				? 'Proposed page'
				: pageStore.pages.find((p) => p.id === progress.nextPath)?.type
	);

	// The Karl section's links, in queue order. Titles resolve the same way the
	// next-up card's does, so a draft is named by its draft title.
	const approvedPages = $derived(
		queueOrder(review.rows.filter((p) => p.status === 'approved')).map((path) => ({
			path,
			title: pageTitleFor(path, pageStore.pages, $draftsStore)
		}))
	);

	// The list's search and status filter live here, not in the list, so the
	// status card's shortcuts can set them.
	let query = $state('');
	let status = $state<StatusFilter>('all');

	async function showStatus(next: StatusFilter) {
		status = next;
		query = '';
		await tick();
		// Focus moves to the list heading, which also scrolls it into view -- a
		// keyboard or screen-reader user lands where the filtered rows begin.
		document.getElementById('all-pages')?.focus();
	}

	// `/` sits outside the review layout, which is what normally loads the
	// review, so progress needs it loaded here. Only once signed in: every review
	// table is `TO authenticated`, so a signed-out load finds nothing and logs
	// `No review found`, which is a console error for a state that is not one.
	//
	// `loadReview` REJECTS on a query error and RESOLVES when no review is
	// visible, so the two land in different cards: `failed` (Try again) and
	// `ready` with nothing to count (no review yet). Before it rejected, both
	// resolved and the page said "Loading your progress…" forever.
	let ready = $state(false);
	let failed = $state(false);
	let retrying = $state(false);
	let loaded = false;
	let disposed = false;
	let cleanup: (() => void) | undefined;

	function load() {
		return loadReview()
			.then((fn) => {
				// Torn down before the load resolved: release the channel now, or it
				// would install after teardown with nothing left to remove it.
				if (disposed) fn();
				else cleanup = fn;
				failed = false;
				ready = true;
			})
			.catch((err: unknown) => {
				// `warn`, not `error`: it stays visible to a developer, and the e2e
				// console gate fails on `console.error` only.
				console.warn('Landing page: could not load review progress:', err);
				failed = true;
			});
	}

	$effect(() => {
		if (sessionStore.signedIn !== true || loaded) return;
		loaded = true;
		load();
	});

	async function retry() {
		retrying = true;
		await load();
		retrying = false;
	}

	/** Which card the header shows. One card, always: the slot never sits empty. */
	const card = $derived.by(() => {
		if (sessionStore.signedIn === false) return 'signed-out' as const;
		if (sessionStore.signedIn !== true) return 'checking' as const;
		if (failed) return 'failed' as const;
		if (!ready) return 'loading' as const;
		// Rows, not `progress.total`: the total now also counts corpus pages with
		// no row, so it is never zero once the corpus loads, and an empty table
		// would have shown a progress card over a review that does not exist.
		return review.rows.length > 0 ? ('progress' as const) : ('empty' as const);
	});

	/**
	 * How it works starts open for a reviewer who has decided nothing yet;
	 * `undefined` until that is known, so a returning reviewer never sees it
	 * flash open. Signed out it is not rendered at all (see the markup).
	 */
	const howItWorksOpen = $derived(
		card === 'progress'
			? progress.decided === 0
			: card === 'failed' || card === 'empty'
				? false
				: undefined
	);

	onMount(() => () => {
		disposed = true;
		cleanup?.();
	});
</script>

<!-- `max-w-4xl`, not 6xl: the page list is the main thing here, and at 6xl a
     row's title sat at the far left and its status 1,100px away at the far
     right. 4xl still fits How it works and Propose a page side by side. -->
<main class="mx-auto max-w-4xl space-y-8 px-4 py-8">
	<header class="space-y-4">
		<div class="space-y-1">
			<h1 class="text-2xl font-bold text-slate-900">HHVC mockup review</h1>
			<!-- What the pages ARE, for anyone opening this to look at them -- the
			     manager first. Everything else on the page is about the review. -->
			<p class="text-slate-700">
				Proposed SF.gov pages for Healthy Housing and Vector Control, shown the way they would
				appear on SF.gov.
			</p>
		</div>
		{#if card === 'progress'}
			<ProgressSummary
				decided={progress.decided}
				total={progress.total}
				{counts}
				nextHref={progress.nextHref}
				{nextTitle}
				{nextMeta}
				unreviewed={review.unreviewed.length}
				onShow={showStatus}
			/>
		{:else if card === 'checking' || card === 'loading'}
			<StatusCard
				kind="loading"
				loadingLabel={card === 'checking' ? 'Checking your session…' : 'Loading your progress…'}
			/>
		{:else}
			<StatusCard kind={card} {retrying} onRetry={retry} />
		{/if}
	</header>

	<!-- How it works and Propose a page share a row above the list; the list
	     itself needs the full width, because a search box, five filter chips and
	     several disclosure sections do not fit a third of it. `items-start`: the
	     grid would otherwise stretch a collapsed How it works into a bordered box
	     of empty space as tall as the propose form. -->
	<!-- Signed out, none of this row applies: How it works and the Karl guide
	     describe the review and the Karl move, which need an account, and
	     proposing a page needs one too. A visitor gets the sign-in card and then
	     the pages, which is what they came to see. `knownSignedOut`, so it is not
	     hidden during the session check and then flashed in. -->
	{#if !sessionStore.knownSignedOut}
		<div class="grid items-start gap-8 md:grid-cols-2">
			<!-- `min-w-0`: a grid item defaults to `min-width: auto`, so a long
		     approved-page title in the Karl section widened this column past a
		     375px phone (measured: 420px) despite truncating. -->
			<div class="min-w-0 space-y-8">
				<HowItWorks startOpen={howItWorksOpen} />
				<KarlWalkthroughGuide
					approved={card === 'progress' ? approvedPages : undefined}
					onShowApproved={() => showStatus('approved')}
				/>
			</div>
			<section aria-labelledby="propose-a-page">
				<h2 id="propose-a-page" class="mb-3 text-lg font-semibold text-slate-900">
					Propose a page
				</h2>
				<ProposePageForm />
			</section>
		</div>
	{/if}

	<AllPagesList bind:query bind:status />
</main>
