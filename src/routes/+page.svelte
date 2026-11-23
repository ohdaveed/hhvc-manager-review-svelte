<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import AllPagesList from '$lib/components/landing/AllPagesList.svelte';
	import HowItWorks from '$lib/components/landing/HowItWorks.svelte';
	import ProgressSummary from '$lib/components/landing/ProgressSummary.svelte';
	import { pageTitleFor } from '$lib/corpus/pageTitle';
	import { reviewProgress } from '$lib/landing/progress';
	import { draftsStore } from '$lib/stores/draftPages';
	import { pageStore } from '$lib/stores/pageData.svelte';
	import { loadReview, pagesStore } from '$lib/stores/reviewState';
	import { sessionStore } from '$lib/stores/session.svelte';

	const progress = $derived(reviewProgress($pagesStore));
	const nextTitle = $derived(
		progress.nextPath === undefined
			? undefined
			: pageTitleFor(progress.nextPath, pageStore.pages, $draftsStore)
	);

	// `/` sits outside the review layout, which is what normally loads the
	// review, so progress needs it loaded here. Only once signed in: every review
	// table is `TO authenticated`, so a signed-out load finds nothing and logs
	// `No review found`, which is a console error for a state that is not one.
	// Signed out the page shows the explanation and a sign-in link instead.
	//
	// `ready` gates the progress line: before the load resolves the store is
	// empty, and "0 of 0 decided" would be a claim the page does not yet have.
	let ready = $state(false);
	let failed = $state(false);
	let loaded = false;
	let disposed = false;
	let cleanup: (() => void) | undefined;

	$effect(() => {
		if (sessionStore.signedIn !== true || loaded) return;
		loaded = true;
		loadReview()
			.then((fn) => {
				// Torn down before the load resolved: release the channel now, or it
				// would install after teardown with nothing left to remove it.
				if (disposed) fn();
				else cleanup = fn;
				ready = true;
			})
			.catch((err: unknown) => {
				// A rejected load (dev sign-in, network) must not leave "Loading your
				// progress" up forever. `warn`, not `error`: it stays visible to a
				// developer, and the e2e console gate fails on `console.error` only.
				// `loaded` stays set on purpose: clearing it would not loop (it is not
				// reactive) but nothing re-runs the effect either, so a retry would
				// need a session change; a reload is the honest recourse.
				console.warn('Landing page: could not load review progress:', err);
				failed = true;
			});
	});

	onMount(() => () => {
		disposed = true;
		cleanup?.();
	});
</script>

<div class="mx-auto max-w-6xl space-y-8 px-4 py-8">
	<header class="min-h-20 space-y-4">
		<h1 class="text-2xl font-bold text-slate-900">HHVC mockup review</h1>
		{#if sessionStore.signedIn === true && failed}
			<p class="text-slate-800">Your progress could not be loaded. Reload the page to try again.</p>
		{:else if sessionStore.signedIn === true && ready && progress.total > 0}
			<ProgressSummary
				decided={progress.decided}
				total={progress.total}
				nextHref={progress.nextHref}
				{nextTitle}
			/>
		{:else if sessionStore.signedIn === false}
			<p class="text-slate-800">
				<a href={resolve('/login')} class="font-semibold underline underline-offset-2">Sign in</a>
				to record decisions and track your progress. You can read every page without an account.
			</p>
		{:else}
			<!-- Session check or review load still pending. A fixed-height neutral
			     line keeps the header from jumping and claims nothing. -->
			<p class="text-slate-700">
				{sessionStore.signedIn === true ? 'Loading your progress…' : 'Checking your session…'}
			</p>
		{/if}
	</header>

	<div class="grid gap-8 md:grid-cols-3">
		<HowItWorks />
		<AllPagesList />
		<!-- Task 7: the propose-a-page form goes in this column. -->
		<section aria-labelledby="propose-a-page" data-seam="propose-a-page">
			<h2 id="propose-a-page" class="mb-3 text-lg font-semibold text-slate-900">Propose a page</h2>
		</section>
	</div>
</div>
