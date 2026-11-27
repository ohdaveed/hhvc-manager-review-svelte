<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import X from '@lucide/svelte/icons/x';
	import { resolve } from '$app/paths';
	import AllPagesList from '$lib/components/landing/AllPagesList.svelte';
	import ProgressSummary from '$lib/components/landing/ProgressSummary.svelte';
	import ProposePageForm from '$lib/components/landing/ProposePageForm.svelte';
	import ReviewGuide from '$lib/components/landing/ReviewGuide.svelte';
	import StatusCard from '$lib/components/landing/StatusCard.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { pageTitleFor } from '$lib/corpus/pageTitle';
	import type { StatusFilter } from '$lib/landing/filter';
	import { reviewProgress } from '$lib/landing/progress';
	import { draftsStore } from '$lib/stores/draftPages';
	import { pageStore } from '$lib/stores/pageData.svelte';
	import { loadReview } from '$lib/stores/reviewState';
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

	// Short verb, then the page: "Continue: Report mold". The title is inside
	// the button, so it truncates rather than push the button past a phone's
	// edge, and the accessible name is the visible text, which is all of it.
	const verb = $derived(progress.decided === 0 ? 'Start' : 'Continue');

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
	 * The review guide starts open for a reviewer who has decided nothing yet;
	 * `undefined` until that is known, so a returning reviewer never sees it
	 * flash open. Signed out it is not rendered at all (see the markup).
	 */
	const guideOpen = $derived(
		card === 'progress'
			? progress.decided === 0
			: card === 'failed' || card === 'empty'
				? false
				: undefined
	);

	/**
	 * Propose a page is a side panel the header button opens, not a form always
	 * on the page: it is an occasional action, and the list is the page's main
	 * thing. Opening moves focus to the panel's heading so a keyboard or
	 * screen-reader user lands in it; closing returns focus to the button.
	 * Closing does not cancel a draft -- the row is in the list by then.
	 */
	let proposeOpen = $state(false);
	let proposeButton: HTMLElement | null = $state(null);

	async function openPropose() {
		proposeOpen = true;
		await tick();
		document.getElementById('propose-a-page')?.focus();
	}

	async function closePropose() {
		proposeOpen = false;
		await tick();
		proposeButton?.focus();
	}

	// Escape closes the panel when focus is inside it. On the window rather
	// than the `<aside>`, which is not an interactive element to listen on.
	// `defaultPrevented`: an Escape something inside already handled is its own.
	function onWindowKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape' || event.defaultPrevented || !proposeOpen) return;
		if (document.getElementById('propose-panel')?.contains(document.activeElement)) closePropose();
	}

	onMount(() => () => {
		disposed = true;
		cleanup?.();
	});
</script>

<!-- `max-w-6xl` now the list is a table: Template, Status, Notes and Karl
     columns use the width that, as a two-line list, left a row's title at the
     far left and its status 1,100px away at the far right. -->
<svelte:window onkeydown={onWindowKeydown} />

<!-- The page's anchor: a full-width white bar across the top, the same
     surface the review workspace's toolbar sits on, with the title on the left
     and the page's two actions on the right. A `<header>` outside `<main>` is
     the page's banner landmark. -->
<header class="border-b border-sfds-grey-l2 bg-white">
	<div
		class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4"
	>
		<!-- Grows and wraps its own text, so the actions stay on the right of a
		     wide screen rather than dropping under a long subtitle. -->
		<div class="min-w-0 flex-[1_1_28rem] space-y-1">
			<h1 class="text-[1.375rem] leading-7 font-bold text-slate-900">HHVC mockup review</h1>
			<!-- What the pages ARE, for anyone opening this to look at them -- the
			     manager first. Everything else on the page is about the review. -->
			<p class="text-slate-700">
				Proposed SF.gov pages for Healthy Housing and Vector Control, shown the way they would
				appear on SF.gov.
			</p>
		</div>
		<!-- Signed out, neither action applies: proposing a page needs an account,
		     and there is no review to resume. `knownSignedOut`, so the button is not
		     hidden during the session check and then flashed in. -->
		{#if !sessionStore.knownSignedOut || (card === 'progress' && progress.nextHref)}
			<div class="flex max-w-full min-w-0 flex-wrap items-center gap-2">
				{#if !sessionStore.knownSignedOut}
					<Button
						variant="outline"
						size="lg"
						bind:ref={proposeButton}
						aria-expanded={proposeOpen}
						aria-controls="propose-panel"
						onclick={() => (proposeOpen ? closePropose() : openPropose())}
						class="h-11 bg-white px-4 {proposeOpen
							? 'border-sfds-action bg-sfds-blue-l1 text-sfds-blue-dark'
							: ''}"
					>
						<Plus aria-hidden="true" data-icon="inline-start" />
						Propose a page
					</Button>
				{/if}
				<!-- `nextHref` is undefined once every page in the review has a
				     decision; the progress card then says so in place of a button. -->
				{#if card === 'progress' && progress.nextHref}
					<Button
						href={resolve(progress.nextHref)}
						size="lg"
						class="h-11 max-w-full min-w-0 px-4 font-semibold"
					>
						<span class="truncate">{verb}: {nextTitle}</span>
					</Button>
				{/if}
			</div>
		{/if}
	</div>
</header>

<main class="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:py-8">
	<!-- With the panel open, the list and the panel share the row on a wide
	     screen; narrower, the panel comes first, where the button that opened it
	     is. `min-w-0` on the column: a flex item defaults to `min-width: auto`,
	     and a long title would otherwise widen it past a 375px phone. -->
	<div class="flex flex-col gap-6 lg:flex-row lg:items-start">
		<div class="min-w-0 flex-1 space-y-6">
			{#if card === 'progress'}
				<ProgressSummary
					decided={progress.decided}
					total={progress.total}
					{counts}
					nextHref={progress.nextHref}
					unreviewed={review.unreviewed.length}
					onShow={showStatus}
				>
					{#snippet footer()}
						<ReviewGuide startOpen={guideOpen} attached />
					{/snippet}
				</ProgressSummary>
			{:else}
				<div class="space-y-3">
					{#if card === 'checking' || card === 'loading'}
						<StatusCard
							kind="loading"
							loadingLabel={card === 'checking'
								? 'Checking your session…'
								: 'Loading your progress…'}
						/>
					{:else}
						<StatusCard kind={card} {retrying} onRetry={retry} />
					{/if}
					<!-- Signed out, the guide describes a review and a Karl move that
					     need an account: a visitor gets the sign-in card and then the
					     pages, which is what they came to see. -->
					{#if !sessionStore.knownSignedOut}
						<ReviewGuide startOpen={guideOpen} />
					{/if}
				</div>
			{/if}

			<AllPagesList bind:query bind:status />
		</div>

		{#if proposeOpen}
			<aside
				id="propose-panel"
				aria-labelledby="propose-a-page"
				class="order-first rounded-[3px] border border-sfds-grey-l2 bg-white lg:sticky lg:top-6 lg:order-none lg:w-[26rem] lg:flex-none"
			>
				<div
					class="flex items-center justify-between gap-3 border-b border-sfds-grey-l2 py-2 pr-2 pl-4 sm:pl-5"
				>
					<h2
						id="propose-a-page"
						tabindex="-1"
						class="text-lg font-bold text-slate-900 focus:outline-none"
					>
						Propose a new page
					</h2>
					<Button
						variant="ghost"
						size="icon-lg"
						class="size-11"
						aria-label="Close panel"
						onclick={closePropose}
					>
						<X aria-hidden="true" />
					</Button>
				</div>
				<div class="p-4 sm:p-5">
					<ProposePageForm onCancel={closePropose} />
				</div>
			</aside>
		{/if}
	</div>
</main>
