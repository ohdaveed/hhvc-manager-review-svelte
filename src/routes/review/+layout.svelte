<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { pageStore } from '$lib/stores/pageData.svelte';
	import { editsStore, firstQueuePath, loadReview, pagesStore } from '$lib/stores/reviewState';
	import { sessionStore } from '$lib/stores/session.svelte';
	import { ArrowLeft, ChevronsLeft, ChevronsRight } from 'lucide-svelte';
	import ReviewQueue from '$lib/components/workspace/ReviewQueue.svelte';
	import ReviewWorkspace from '$lib/components/workspace/ReviewWorkspace.svelte';
	import SiteHeader from '$lib/components/sfgov/SiteHeader.svelte';
	import SiteFooter from '$lib/components/sfgov/SiteFooter.svelte';
	import WalkthroughHeader from '$lib/components/workspace/WalkthroughHeader.svelte';
	import WalkthroughDrawer from '$lib/components/workspace/WalkthroughDrawer.svelte';
	import SiteMapView from '$lib/components/workspace/SiteMapView.svelte';
	import { buildWalkthrough } from '$lib/karl/walkthrough';
	import { reviewRecordFor } from '$lib/karl/reviewRecord';
	import { pagesByKey } from '$lib/data';

	let { children } = $props();

	// Karl tag display is not implemented — nothing reads this yet. The control
	// stays disabled rather than animating over dead state; it was previously a
	// bare checkbox carrying DaisyUI classes for a DaisyUI that is not installed.
	let showKarlTags = $state(false);

	// Dynamically pick the page data based on slug for the workspace
	const pageData = $derived(pageStore.pages.find((p) => p.id === $page.params.slug));

	// Built on demand rather than eagerly: it walks the page against the whole
	// Karl panel inventory, and 28 of the 29 pages are not the one on screen.
	//
	// Two arguments here are the ones to get right, and both were wrong before:
	//
	// - `pagesByKey`, NOT `pageStore.pages`. The transcript resolves card and
	//   link destinations by TARGET KEY; handed the array it resolved none, and
	//   130 chooser labels across the corpus degraded to raw keys.
	// - the review record, NOT `null`. The walkthrough rebuilds the page the
	//   reviewer APPROVED, so it has to transcribe their edits; without it the
	//   drawer walked an editor through the original mockup copy while the
	//   Help tab's markdown showed the edited version of the same field.
	const walkthrough = $derived(
		pageStore.mode === 'walkthrough' && pageData
			? buildWalkthrough(
					pageData,
					pagesByKey,
					reviewRecordFor(pageData.id, $pagesStore, $editsStore)
				)
			: null
	);
	const copiedHere = $derived(
		walkthrough && pageData
			? walkthrough.steps.filter((s) => pageStore.isCopied(pageData.id, s.id)).length
			: 0
	);

	// `pagesStore` is keyed by the routable id, the same lookup `reviewRecordFor`
	// uses.
	// No live row means this page is not part of the loaded review (or nothing
	// loaded at all), so an edit here has nothing to attach itself to. The Fields
	// tab needs it to persist, so it is resolved once here rather than in three
	// places further down.
	const livePageId = $derived($pagesStore.find((p) => p.path === pageData?.id)?.id);

	// The layout stays mounted across slug navigation, so the page change has to
	// be announced -- nothing else observes it, and the selection used to carry
	// over onto the next page's fields. `pre`, so the store is scoped to the new
	// page before its edit targets render and read `isSelected`.
	$effect.pre(() => {
		pageStore.enterPage(pageData?.id);
	});

	// Unsaved = accepted suggestions not yet committed, FOR THIS PAGE. Deliberately
	// NOT the selected-field count: the footer's "Save N edits" counts the same
	// thing, and two numbers that look alike but differ is worse than one. Work
	// parked on other pages is the panel's line to make, not a number here.
	const unsavedCount = $derived(pageStore.acceptedFor(pageData?.id));

	// Where `Export review data` points until export exists: the queue's first
	// row, by the same order `ReviewQueue` renders.
	//
	// The chain ends at `$page.params.slug` rather than a literal, because that
	// is the one value guaranteed routable here -- the router matched it to get
	// this layout on screen. An earlier version ended in `?? ''`, which resolves
	// to `/review/`, and `/review` has no `+page.svelte`: the fallback for "no
	// page to point at" was itself the 404 this link exists to avoid.
	const firstQueueTarget = $derived(
		firstQueuePath($pagesStore) ?? pageStore.pages[0]?.id ?? $page.params.slug
	);
	/** Already on it: the toolbar says so instead of offering a link to here. */
	const atQueueStart = $derived(firstQueueTarget === $page.params.slug);
	/** For the link's tooltip -- the queue row's own title, not the slug. */
	const firstQueueTitle = $derived(
		pageStore.pages.find((pg) => pg.id === firstQueueTarget)?.title ?? ''
	);

	onMount(() => {
		// Rail state is per-device chrome in `localStorage`, read here rather than
		// in the store's constructor: that module is imported during SSR, where
		// `localStorage` does not exist.
		pageStore.loadRailState();
		pageStore.loadCopiedSteps();

		// If the layout is torn down before loadReview resolves -- a slow Supabase
		// round trip plus quick navigation -- the destroy callback fires while
		// cleanup is still undefined, and the subscription then installs after
		// teardown with nothing left to remove it. Remounting would stack channels.
		let disposed = false;
		let cleanup: (() => void) | undefined;

		loadReview().then((fn) => {
			if (disposed) fn();
			else cleanup = fn;
		});

		return () => {
			disposed = true;
			cleanup?.();
		};
	});
</script>

<!-- 280 / 1fr / 380, up from 250 / 1fr / 300. The review panel needs the extra
     80px for the diff cards; the queue needs it for the sub-lines. Collapsed
     rails are 52px (design 2a) — the buttons live here, the rail contents are
     the 2a pass. -->
<div
	class="review-shell grid h-screen w-full grid-rows-[minmax(0,1fr)] overflow-hidden bg-muted/40"
	style="grid-template-columns: {pageStore.railCollapsed.queue ? '52px' : '280px'} 1fr {pageStore
		.railCollapsed.panel
		? '52px'
		: '380px'}"
>
	<!-- Left Sidebar: Global Navigation & Review Queue -->
	<aside class="queue-rail flex h-full min-w-0 flex-col border-r bg-background">
		{#if pageStore.railCollapsed.queue}
			<div class="flex flex-col items-center gap-4 py-3.5">
				<Button
					variant="outline"
					size="icon"
					class="size-7"
					title="Expand queue"
					aria-label="Expand queue"
					onclick={() => pageStore.toggleRail('queue')}
				>
					<ChevronsRight class="size-3.5" />
				</Button>
			</div>
		{:else}
			<div class="flex items-start gap-2 px-3 pt-5 pb-4 pl-5">
				<div class="min-w-0 flex-1">
					<div class="text-[11px] font-bold tracking-[0.1em] text-sfds-slate-l3 uppercase">
						SFDS rebuild
					</div>
					<h2 class="mt-1.5 font-heading text-xl leading-[26px] font-bold text-sfds-black">
						HHVC mockup review
					</h2>
				</div>
				<Button
					variant="outline"
					size="icon"
					class="size-7 flex-none"
					title="Collapse queue"
					aria-label="Collapse queue"
					onclick={() => pageStore.toggleRail('queue')}
				>
					<ChevronsLeft class="size-3.5" />
				</Button>
			</div>
			<ScrollArea class="min-h-0 flex-1">
				<ReviewQueue />
			</ScrollArea>
			<Separator />
			<div class="flex items-center justify-between px-5 py-3.5">
				<!-- Export has no page of its own yet, so it goes where the queue
				     starts rather than to `/review`, which has no `+page.svelte` and
				     404s. A placeholder destination that lands somewhere real. -->
				<a
					href={resolve('/review/[slug]', { slug: firstQueueTarget })}
					class="text-[13px] font-semibold text-sfds-action hover:underline"
					data-testid="export-review-data">Export review data</a
				>
				<!-- No longer dead. It is a view of this same route rather than a
				     page of its own: the queue and the review panel stay put, so
				     making it a route would remount both to change the middle column. -->
				<button
					type="button"
					class="text-[13px] font-semibold text-sfds-action hover:underline"
					onclick={() => pageStore.showSitemap()}>Site map</button
				>
			</div>
		{/if}
	</aside>

	<!-- Center Canvas: The Mockup -->
	<!-- This carried `onclick={() => (pageStore.activeField = null)}` to deselect
	     on a background click. `activeField` became `selectedFieldIds` in 1b and
	     the handler was not updated, so it has been assigning a property nothing
	     reads -- a no-op, and svelte-check's only error in this file. Removed
	     rather than repointed at `clearSelection()`: that would ALSO drop pending
	     cards and the typed instruction, so a stray click on the canvas would
	     discard work. Restoring the affordance is a design call, not a rename.
	     `role="presentation"` is left as-is for the same reason -- it suppresses
	     the `main` landmark and was there for the handler, but changing landmark
	     semantics is its own decision. -->
	<main
		class="relative flex h-full cursor-default flex-col overflow-hidden bg-muted"
		role="presentation"
	>
		{#if sessionStore.knownSignedOut}
			<!-- Anonymous browsing is supported on purpose: the mockups come from
			     static modules, so a stakeholder can read them without an account.
			     What is not acceptable is doing it silently -- the `edits` INSERT
			     policy only accepts a row whose user_id is the caller, so nothing a
			     signed-out visitor types can be saved, and before this banner the
			     edit simply vanished on reload with no signal. EditTarget also
			     drops the affordance entirely. -->
			<div
				class="border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900"
				role="status"
			>
				<strong class="font-semibold">Viewing signed out.</strong> You can read every mockup, but
				editing is disabled because edits cannot be saved without an account.
				<a href={resolve('/login')} class="font-semibold underline underline-offset-2">Sign in</a> to
				edit.
			</div>
		{/if}

		<!-- Toolbar (Top) -->
		{#if pageStore.mode === 'sitemap'}
			<SiteMapView onExit={() => pageStore.showReview()} />
		{:else}
			{#if pageStore.mode === 'walkthrough' && walkthrough}
				<!-- The navy bar replaces the canvas toolbar while rebuilding, and
				     spans the drawer as well as the mockup. -->
				<WalkthroughHeader
					{walkthrough}
					copied={copiedHere}
					onExit={() => pageStore.exitWalkthrough()}
				/>
			{:else}
				<nav
					class="flex h-12 flex-none items-center justify-between border-b border-sfds-grey-l2 bg-background px-5"
				>
					<div class="flex min-w-0 items-center gap-2">
						<!-- Back to the queue's first row, the same target `Export review
						     data` uses -- one definition, so the two cannot point at
						     different pages. Left-most because it is the only control here
						     that LEAVES the page; everything to its right describes or acts
						     on the page you are looking at.

						     On that page already, it renders as plain text rather than a
						     link: a link that reloads the page you are on reads as broken,
						     and hiding it instead would shift the whole bar sideways as you
						     move through the queue. -->
						{#if atQueueStart}
							<span
								class="flex-none text-[13px] font-semibold text-sfds-slate-l3"
								aria-current="page"
							>
								First page
							</span>
						{:else}
							<a
								href={resolve('/review/[slug]', { slug: firstQueueTarget })}
								class="flex flex-none items-center gap-1 text-[13px] font-semibold text-sfds-action hover:underline"
								title={firstQueueTitle
									? `Back to the first page in the queue: ${firstQueueTitle}`
									: 'Back to the first page in the queue'}
								data-testid="queue-start"
							>
								<ArrowLeft class="size-3.5" aria-hidden="true" />
								First page
							</a>
						{/if}
						<span class="h-4 w-px flex-none bg-sfds-grey-l2" aria-hidden="true"></span>
						{#if pageData?.type}
							<span
								class="inline-flex h-[22px] flex-none items-center rounded-[4px] bg-sfds-grey-l2/60 px-2 text-[11px] font-bold tracking-[0.08em] text-sfds-black uppercase"
							>
								{pageData.type}
							</span>
						{/if}
						<!-- When the queue is collapsed it no longer shows the page title, so
					     the toolbar absorbs it (design 2a). Restored to the queue on expand. -->
						{#if pageStore.railCollapsed.queue && pageData?.title}
							<span class="truncate text-sm font-semibold text-sfds-black">{pageData.title}</span>
						{/if}
						<!-- slate-l3, not slate-l2. MEASURED on the built app: #5a7a92 on
						     white is 4.53:1, which clears WCAG AA's 4.5 floor by 0.03 and
						     reads washed out at 12px; #1d4d70 is 8.94:1 and is already in
						     the SFDS palette, so this is a token swap rather than a new
						     colour. Same swap on the Karl tags label below. -->
						<span class="truncate font-mono text-xs text-sfds-slate-l3">
							{pageData?.slug ?? 'https://sf.gov/'}
						</span>
					</div>

					<div class="flex flex-none items-center gap-4 text-sm">
						{#if unsavedCount > 0}
							<span
								class="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-[3px] text-xs font-semibold text-violet-900"
								role="status"
							>
								{unsavedCount} unsaved {unsavedCount === 1 ? 'edit' : 'edits'}
							</span>
						{/if}
						<div class="flex items-center gap-2">
							<Label for="tagToggle" class="text-sfds-slate-l3">Karl tags</Label>
							<Switch
								id="tagToggle"
								bind:checked={showKarlTags}
								disabled
								title="Karl tag display is not implemented yet"
							/>
						</div>
						<!-- The tool's second job, and the only way into it. Entering
					     collapses both rails; exiting puts them back as they were. -->
						<Button
							variant="outline"
							size="sm"
							class="h-7 flex-none text-xs"
							onclick={() => pageStore.enterWalkthrough()}
						>
							Open Karl walkthrough
						</Button>
					</div>
				</nav>
			{/if}

			<div class="flex min-h-0 flex-1 overflow-hidden">
				{#if pageStore.mode === 'walkthrough' && walkthrough && pageData}
					<WalkthroughDrawer {walkthrough} pageId={pageData.id} />
				{/if}
				<!-- Scrollable Mockup Container.
			     tabindex="0" is what axe's scrollable-region-focusable asks for: a
			     region that scrolls but cannot be focused is unreachable by keyboard,
			     so a keyboard-only reviewer could not scroll the mockup at all. The
			     role and label give the focus stop a meaning once it exists.

			     MEASURED, 2026-11-22: removing this attribute fails 5 of the 7
			     specs in tests/accessibility.e2e.ts with
			     "scrollable-region-focusable (serious) x1: Scrollable region must
			     have keyboard access". Svelte's a11y_no_noninteractive_tabindex and
			     axe's rule contradict each other here, and axe is the one that
			     gates CI -- so the warning is suppressed rather than obeyed. Do not
			     "fix" the warning by deleting the attribute. -->
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<div
					class="flex flex-1 justify-center overflow-y-auto px-8 pt-7 pb-30"
					tabindex="0"
					role="region"
					aria-label="Mockup preview"
				>
					<!-- `self-start` is load-bearing: without it this flex parent stretches
				     the figure to the container height and the page footer becomes
				     unreachable by scrolling. -->
					<!-- `overflow-hidden` so the footer's two illustrations clip at the
				     rounded corners instead of squaring them off; they are laid out
				     flush to the left and right edges. -->
					<!-- The frame is a named CONTAINER, and that is what makes the
				     mockup honest. SF.gov's own components reflow on
				     `@media (max-width: 900px)` -- the VIEWPORT -- but the mockup
				     lives in a pane far narrower than the window: at a 1280px
				     viewport this frame is ~620px while both media queries still
				     report desktop, so the mockup rendered a desktop layout at
				     phone width and never showed the tablet or mobile view at any
				     window size. Querying the frame instead ties the reflow to the
				     space the page actually has.
				     `max-width` scales with the pane rather than sitting at 880px,
				     so a wide monitor shows a wide page instead of a narrow card in
				     a field of grey. 1440px is the ceiling because beyond it SF.gov
				     only adds gutter, not layout. -->
					<figure
						class="mockup-frame w-full self-start overflow-hidden rounded-[4px] border border-gray-200 bg-white shadow-[0_2px_4px_rgba(12,20,100,.06),0_4px_12px_rgba(12,20,100,.1)]"
					>
						<SiteHeader />

						<!-- Page specific content. 40px/32px padding around a 760px column
					     is the design's measure, not the previous uniform 32px: SF.gov
					     body copy is set to a fixed reading width, and the chrome above
					     and below is full-bleed, which is why it sits outside here. -->
						<div id="mockPage" class="mock-page">
							<div class="mx-auto max-w-[760px]">
								{@render children()}
							</div>
						</div>

						<SiteFooter />
					</figure>
				</div>
			</div>
		{/if}
	</main>

	<!-- Right Sidebar: Contextual Manager Review & Checks -->
	<section class="panel-rail flex h-full min-w-0 flex-col overflow-hidden border-l bg-background">
		{#if pageStore.railCollapsed.panel}
			<div class="flex flex-col items-center gap-4 py-3.5">
				<Button
					variant="outline"
					size="icon"
					class="size-7"
					title="Expand review panel"
					aria-label="Expand review panel"
					onclick={() => pageStore.toggleRail('panel')}
				>
					<ChevronsLeft class="size-3.5" />
				</Button>
				<!-- Collapsed, the panel is the only place the unsaved count lives, so
				     it is repeated here rather than hidden with the tabs. -->
				{#if unsavedCount > 0}
					<span
						class="inline-flex size-6 items-center justify-center rounded-full bg-sfds-action text-[11px] font-bold text-white"
						role="status"
						aria-label="{unsavedCount} unsaved edits"
					>
						{unsavedCount}
					</span>
				{/if}
			</div>
		{:else}
			<ReviewWorkspace {pageData} {livePageId} onCollapse={() => pageStore.toggleRail('panel')} />
		{/if}
	</section>
</div>

<style>
	/* The mockup frame is the container every SF.gov component inside it
	   queries. `inline-size` rather than `size`: only width drives SF.gov's
	   reflow, and `size` would require the frame to carry an explicit height,
	   which it does not -- it grows with its content so the footer stays
	   reachable by scrolling. */
	.mockup-frame {
		container: mockup / inline-size;
		max-width: 1440px;
	}

	/* 40px/32px around the reading column is the design's measure at desktop.
	   It cannot stay fixed once the frame can be phone-width: 32px of padding
	   either side of a 390px frame leaves 326px of copy. Scaling the padding
	   with the container keeps the proportion and stops the column being
	   crushed, while `clamp` holds it between a usable minimum and the value
	   the design specifies. */
	.mock-page {
		padding-block: clamp(1.25rem, 4cqi, 2.5rem);
		padding-inline: clamp(1rem, 3.5cqi, 2rem);
	}

	/* The rails are viewport business, not container business, and this is the
	   one place a media query is still right: whether a 280px queue and a 380px
	   panel can be afforded depends on the real device, not on any element.
	   Below 1024px they cannot -- at a 390px viewport the two rails claimed
	   660px and squeezed the mockup frame to 2px, so the mockup could never
	   reach its own mobile layout however narrow the window got.

	   Hidden rather than shrunk. Both rails already have toggles
	   (`pageStore.toggleRail`), so the controls are not lost; a 130px queue
	   would be neither usable nor honest about the space. */
	@media (max-width: 1024px) {
		/* The grid template is an inline style, because the rail widths are
		   reactive state (`pageStore.railCollapsed`). `!important` is what
		   overrides an inline declaration from a stylesheet, and this is the
		   case it exists for -- there is no selector specificity that beats
		   inline otherwise.

		   Collapsing the template is required, not merely tidy: `display: none`
		   removes the rails but leaves their grid TRACKS, so at a 390px
		   viewport the canvas still measured 280px and the mockup frame 201px.
		   The rails have to stop reserving width, not just stop painting. */
		.review-shell {
			grid-template-columns: 1fr !important;
		}

		.queue-rail,
		.panel-rail {
			display: none;
		}
	}
</style>
