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
	import { loadReview, pagesStore } from '$lib/stores/reviewState';
	import { sessionStore } from '$lib/stores/session.svelte';

	const progress = $derived(reviewProgress($pagesStore));

	// Per-status counts for the bar and its shortcuts. Computed here rather than
	// added to `reviewProgress`, whose contract is "how far through, and where
	// next" and is tested as such.
	const counts = $derived(
		$pagesStore.reduce<Partial<Record<(typeof $pagesStore)[number]['status'], number>>>(
			(acc, p) => ({ ...acc, [p.status]: (acc[p.status] ?? 0) + 1 }),
			{}
		)
	);
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
		return progress.total > 0 ? ('progress' as const) : ('empty' as const);
	});

	/**
	 * How it works starts open for a signed-out visitor and for a reviewer who
	 * has decided nothing yet; `undefined` until that is known, so a returning
	 * reviewer never sees it flash open.
	 */
	const howItWorksOpen = $derived(
		sessionStore.knownSignedOut
			? true
			: card === 'progress'
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

<div class="mx-auto max-w-6xl space-y-8 px-4 py-8">
	<header class="space-y-4">
		<h1 class="text-2xl font-bold text-slate-900">HHVC mockup review</h1>
		{#if card === 'progress'}
			<ProgressSummary
				decided={progress.decided}
				total={progress.total}
				{counts}
				nextHref={progress.nextHref}
				{nextTitle}
				{nextMeta}
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
	<div class="grid items-start gap-8 md:grid-cols-2">
		<div class="space-y-8">
			<HowItWorks startOpen={howItWorksOpen} />
			<KarlWalkthroughGuide
				approved={card === 'progress' ? (counts.approved ?? 0) : undefined}
				onShowApproved={() => showStatus('approved')}
			/>
		</div>
		<section aria-labelledby="propose-a-page">
			<h2 id="propose-a-page" class="mb-3 text-lg font-semibold text-slate-900">Propose a page</h2>
			<ProposePageForm />
		</section>
	</div>

	<AllPagesList bind:query bind:status />
</div>
