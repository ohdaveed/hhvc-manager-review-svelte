<script lang="ts">
	import { onMount, tick } from 'svelte';
	import AllPagesList from '$lib/components/landing/AllPagesList.svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import X from '@lucide/svelte/icons/x';
	import { resolve } from '$app/paths';
	import ReviewGuide from '$lib/components/landing/ReviewGuide.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import ProgressSummary from '$lib/components/landing/ProgressSummary.svelte';
	import ProposePageForm from '$lib/components/landing/ProposePageForm.svelte';
	import StatusCard from '$lib/components/landing/StatusCard.svelte';
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

	// Continue is in the header band, with the page it goes to in its label.
	const verb = $derived(progress.decided === 0 ? 'Start' : 'Continue');

	// The propose form is a panel beside the list, opened from the header. Focus
	// goes into it on open and back to its button on close, so a keyboard user
	// is not left at the top of a page whose content just moved.
	let proposing = $state(false);
	let proposeButton: HTMLElement | null = $state(null);

	async function openPropose() {
		proposing = true;
		await tick();
		document.getElementById('propose-description')?.focus();
	}

	async function closePropose() {
		proposing = false;
		await tick();
		proposeButton?.focus();
	}

	onMount(() => () => {
		disposed = true;
		cleanup?.();
	});
</script>

{#snippet guide()}
	<ReviewGuide startOpen={guideOpen} />
{/snippet}

<!-- The header band: what this is, and the two things to do from here. Full
     width and white, so it reads as the page's chrome over the grey ground. -->
<header class="border-b border-sfds-grey-l2 bg-white">
	<div
		class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4"
	>
		<div class="min-w-0 flex-[1_1_28rem] space-y-1">
			<h1 class="text-[1.375rem] leading-7 font-bold text-slate-900">HHVC mockup review</h1>
			<!-- What the pages ARE, for anyone opening this to look at them -- the
			     manager first. Everything else on the page is about the review. -->
			<p class="text-slate-700">
				Proposed SF.gov pages for Healthy Housing and Vector Control, shown the way they would
				appear on SF.gov.
			</p>
		</div>
		<div class="flex max-w-full flex-wrap items-center gap-2">
			<!-- Proposing needs an account, so signed out there is no button to
			     open a panel that could only say "sign in". `signedIn === true`,
			     not `!knownSignedOut`: it must not flash in during the check. -->
			{#if sessionStore.signedIn === true}
				<Button
					bind:ref={proposeButton}
					variant="outline"
					class="h-11 gap-1.5 px-4 aria-expanded:border-sfds-action aria-expanded:bg-sfds-blue-l1 aria-expanded:text-sfds-blue-dark"
					aria-expanded={proposing}
					aria-controls="propose-panel"
					onclick={() => (proposing ? closePropose() : openPropose())}
				>
					<Plus aria-hidden="true" />
					Propose a page
				</Button>
			{/if}
			<!-- `nextHref` is undefined only when every page IN THE REVIEW has a
			     decision, so there is deliberately no link then: Continue would
			     point at a page with nothing left to resume. The title is inside
			     the button and truncates, so a long one cannot push it past a
			     phone's edge; `title` carries the whole of it. -->
			{#if card === 'progress' && progress.nextHref}
				<Button
					href={resolve(progress.nextHref)}
					class="h-11 max-w-full justify-start bg-sfds-action px-4 font-semibold text-white [a]:hover:bg-sfds-blue-dark"
					title="{verb}: {nextTitle}"
				>
					<span class="truncate">{verb}: {nextTitle}</span>
				</Button>
			{/if}
		</div>
	</div>
</header>

<!-- `max-w-6xl`: the list is a table now, with its status, notes and Karl
     columns, and needs the width a single stacked row did not. -->
<main class="mx-auto max-w-6xl px-4 py-8">
	<div class="flex flex-wrap items-start gap-6">
		<!-- `min-w-0`: a flex item defaults to `min-width: auto`, so a long title
		     would widen this column past a 375px phone. The huge grow factor
		     gives the panel only what it asks for. -->
		<div class="flex min-w-0 flex-[999_1_35rem] flex-col gap-6">
			{#if card === 'progress'}
				<ProgressSummary
					decided={progress.decided}
					total={progress.total}
					{counts}
					hasNext={progress.nextHref !== undefined}
					unreviewed={review.unreviewed.length}
					onShow={showStatus}
					footer={guide}
				/>
			{:else if card === 'checking' || card === 'loading'}
				<StatusCard
					kind="loading"
					loadingLabel={card === 'checking' ? 'Checking your session…' : 'Loading your progress…'}
				/>
			{:else}
				<StatusCard kind={card} {retrying} onRetry={retry} />
				<!-- Signed out the guide does not apply: it describes the review and
				     the Karl move, which need an account. -->
				{#if card !== 'signed-out'}
					<div class="overflow-hidden rounded-[3px] border border-sfds-grey-l2 bg-white">
						{@render guide()}
					</div>
				{/if}
			{/if}

			<AllPagesList bind:query bind:status />
		</div>

		{#if proposing}
			<!-- Beside the list on a wide screen, under it on a narrow one (the
			     row wraps). Not a modal: the list stays readable and usable, which
			     is what "you can leave while it drafts" promises. -->
			<aside
				id="propose-panel"
				aria-labelledby="propose-title"
				class="w-full max-w-[26rem] flex-[1_1_25rem] rounded-[3px] border border-sfds-grey-l2 bg-white lg:sticky lg:top-4"
			>
				<div class="flex items-center justify-between border-b border-sfds-grey-l2 py-2 pr-2 pl-5">
					<h2 id="propose-title" class="text-lg font-bold text-slate-900">Propose a new page</h2>
					<Button
						variant="ghost"
						size="icon"
						class="size-11"
						aria-label="Close panel"
						onclick={closePropose}
					>
						<X aria-hidden="true" />
					</Button>
				</div>
				<div class="p-5">
					<ProposePageForm onClose={closePropose} />
				</div>
			</aside>
		{/if}
	</div>
</main>
