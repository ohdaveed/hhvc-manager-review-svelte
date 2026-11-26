<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { applySavedEdits } from '$lib/stores/applySavedEdits';
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Popover } from 'bits-ui';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { draftsStore } from '$lib/stores/draftPages';
	import { pageTitleFor } from '$lib/corpus/pageTitle';
	import { isDraftPath, reviewHrefFor, routePathFor } from '$lib/corpus/draftPath';
	import { pageStore } from '$lib/stores/pageData.svelte';
	import { editsStore, loadReview, pagesStore, queueOrder } from '$lib/stores/reviewState';
	import { STATUS_LABELS } from '$lib/review/statusLabels';
	import { sessionStore } from '$lib/stores/session.svelte';
	import { supabase } from '$lib/supabase';
	import {
		ArrowLeft,
		ChevronLeft,
		ChevronRight,
		ChevronsLeft,
		ChevronsRight,
		Download,
		Maximize2,
		Monitor,
		Smartphone,
		Tablet
	} from '@lucide/svelte';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
	import {
		PREVIEW_WIDTHS,
		fitFrame,
		previewBand,
		type PreviewWidth
	} from '$lib/stores/pageData.svelte';
	import ReviewQueue from '$lib/components/workspace/ReviewQueue.svelte';
	import ReviewWorkspace from '$lib/components/workspace/ReviewWorkspace.svelte';
	import SiteHeader from '$lib/components/sfgov/SiteHeader.svelte';
	import SiteFooter from '$lib/components/sfgov/SiteFooter.svelte';
	import WalkthroughHeader from '$lib/components/workspace/WalkthroughHeader.svelte';
	import WalkthroughDrawer from '$lib/components/workspace/WalkthroughDrawer.svelte';
	import SiteMapView from '$lib/components/workspace/SiteMapView.svelte';
	import BlueprintView from '$lib/components/workspace/BlueprintView.svelte';
	import { buildWalkthrough } from '$lib/karl/walkthrough';
	import { reviewRecordFor } from '$lib/karl/reviewRecord';
	import { outlineSummary, placementsFor } from '$lib/karl/placement';
	import { setOutlineContext } from '$lib/karl/outlineContext';
	import { pagesByKey } from '$lib/data';
	import { triggerReviewExportDownload } from '$lib/data/exportReview';

	let { children } = $props();

	// The "Karl tags" switch that used to sit in the toolbar is gone. It was
	// permanently `disabled` because nothing reads the state, so it was a
	// control that could never do anything, and it cost ~100px of a toolbar
	// measured at ZERO slack between 1080px and 1400px -- at 1100px the page
	// slug was being squeezed to 0px wide and the type badge collided with
	// this switch's label. Removing dead chrome is what makes room for the
	// preview-width control, which reviewers can actually use.

	// Dynamically pick the page data based on slug for the workspace
	const currentPath = $derived(routePathFor($page.params));
	const pageData = $derived(pageStore.pages.find((p) => p.id === currentPath));

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
	// The Karl outline (decisions in docs/plans/2026-11-23-karl-field-mapping-layer.md).
	// Off on draft routes by an explicit check, not by `pageData` being absent:
	// a draft IS in `pageStore.pages`, and its content type is the model's guess,
	// so a placement there would read as more settled than it is (decision 12).
	const onDraft = $derived(Boolean(currentPath && isDraftPath(currentPath)));
	// Built once for both Karl views: the outline over the mockup and the
	// Blueprint. Neither is built while neither is showing.
	const placementsHere = $derived(
		(pageStore.karlOutline || pageStore.mode === 'blueprint') && pageData && !onDraft
			? placementsFor(
					pageData as unknown as Parameters<typeof placementsFor>[0],
					reviewRecordFor(pageData.id, $pagesStore, $editsStore),
					pagesByKey
				)
			: null
	);
	const outlinePlacements = $derived(pageStore.karlOutline ? placementsHere : null);
	const blueprintPlacements = $derived(pageStore.mode === 'blueprint' ? placementsHere : null);

	/**
	 * Blueprint → page: back to the mockup with the outline on, the field
	 * scrolled into the preview and focused, and a brief highlight.
	 *
	 * `scrollTop` on the preview region, not `scrollIntoView`, for the reason the
	 * walkthrough drawer gives: the preview is a nested scroll container inside a
	 * fixed-height grid, and `scrollIntoView` scrolls every ancestor too. Signed
	 * out, the field is plain text, so it gets `tabindex="-1"` to take focus.
	 */
	async function showOnPage(fieldId: string) {
		pageStore.setKarlOutline(true);
		pageStore.showReview();
		await tick();
		const region = document.querySelector<HTMLElement>(
			'[role="region"][aria-label="Mockup preview"]'
		);
		const el = region?.querySelector<HTMLElement>(`[data-rewrite-field="${CSS.escape(fieldId)}"]`);
		if (!region || !el) return;
		region.scrollTop += el.getBoundingClientRect().top - region.getBoundingClientRect().top - 32;
		if (el.tagName !== 'BUTTON') el.setAttribute('tabindex', '-1');
		el.focus({ preventScroll: true });
		el.classList.add('karl-jump-highlight');
		setTimeout(() => el.classList.remove('karl-jump-highlight'), 2000);
	}

	setOutlineContext({
		get placements() {
			return outlinePlacements;
		}
	});
	let karlMenuOpen = $state(false);

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

	// Saved edits onto the mockup: after `loadReview`, on every realtime insert,
	// and when a draft closes (a save that arrived during the typing was held
	// back for it). Tracks the stores, the page list shallowly and the draft
	// keys -- not the copy itself, which this effect writes.
	$effect(() => {
		const edits = $editsStore;
		const live = $pagesStore;
		const pages = [...pageStore.pages];
		void Object.keys(pageStore.manualDrafts);
		untrack(() =>
			applySavedEdits(
				pages,
				live,
				edits,
				(path, fieldId) => pageStore.getDraft(path, fieldId) !== undefined
			)
		);
	});

	// Unsaved = accepted suggestions not yet committed, FOR THIS PAGE. Deliberately
	// NOT the selected-field count: the footer's "Save N edits" counts the same
	// thing, and two numbers that look alike but differ is worse than one. Work
	// parked on other pages is the panel's line to make, not a number here.
	const unsavedCount = $derived(pageStore.acceptedFor(pageData?.id));

	// The toolbar's previous / next buttons step through the queue in the order
	// the sidebar renders it, so they land on the row above or below the current
	// one. Signed out the queue lists the corpus, so the fallback is corpus order.
	// (They replace a single "First page" link, which jumped to the queue's top
	// and was the toolbar's only navigation.)
	const order = $derived.by(() => {
		const queued = queueOrder($pagesStore);
		return queued.length > 0 ? queued : pageStore.pages.map((p) => p.id);
	});
	const at = $derived(currentPath ? order.indexOf(currentPath) : -1);
	const prevPath = $derived(at > 0 ? order[at - 1] : undefined);
	const nextPath = $derived(at >= 0 && at < order.length - 1 ? order[at + 1] : undefined);
	const titleOf = (path: string) => pageTitleFor(path, pageStore.pages, $draftsStore, 'empty');

	/**
	 * This page's recorded decision, for the toolbar badge, the collapsed panel's
	 * dot and the phone Review button. Undefined with no review row (signed out),
	 * when there is no decision to show.
	 */
	const status = $derived($pagesStore.find((p) => p.path === currentPath)?.status);
	const statusLabel = $derived(status ? STATUS_LABELS[status].queueHeading : '');

	/**
	 * The mockup frame's real rendered width, bound from the element.
	 *
	 * Measured rather than derived from the preset, because for `fit` -- the
	 * default -- there is no preset to derive from, and that is exactly the
	 * case where the reviewer most needs telling: the frame is whatever the
	 * pane leaves it, which on a 1440px display is 716px, the tablet
	 * rendering.
	 */
	let frameWidth = $state(0);

	/**
	 * Under Fit, how far the frame is zoomed down so the page keeps its desktop
	 * layout in a pane narrower than 1024px (see `fitScale`). 1 means no zoom.
	 * `paneBox` is the canvas's content box: its width minus padding and scrollbar.
	 */
	let paneBox = $state<DOMRectReadOnly | undefined>();
	const fit = $derived(pageStore.previewWidth === 'fit' ? fitFrame(paneBox?.width ?? 0) : null);
	const scale = $derived(fit?.scale ?? 1);
	const frameStyle = $derived.by(() => {
		const preset = PREVIEW_WIDTHS[pageStore.previewWidth];
		if (preset) return `width:${preset}px;max-width:none;flex:none`;
		if (fit) return `width:${fit.width}px;max-width:none;flex:none;zoom:${fit.scale}`;
		return '';
	});

	/**
	 * In sheet mode the rail always shows its contents: a collapsed rail
	 * inside an overlay would be a 52px strip holding one expand button,
	 * which is not what opening the sheet asked for.
	 */
	const queueCollapsed = $derived(
		pageStore.railCollapsed.queue && pageStore.mobileSheet !== 'queue'
	);
	const panelCollapsed = $derived(
		pageStore.railCollapsed.panel && pageStore.mobileSheet !== 'panel'
	);

	/** Returns focus to whichever button opened the sheet. */
	let sheetOpener: HTMLElement | null = null;

	const openSheet = (which: 'queue' | 'panel', event: MouseEvent) => {
		sheetOpener = event.currentTarget as HTMLElement;
		pageStore.openSheet(which);
	};

	const closeSheet = () => {
		pageStore.closeSheet();
		sheetOpener?.focus();
		sheetOpener = null;
	};

	/** Stays on this page: the banner and read-only mode follow
	 *  `onAuthStateChange`, so there is nowhere to send anyone. */
	let signOutError = $state('');
	const signOut = async () => {
		signOutError = '';
		const { error } = await supabase.auth.signOut();
		if (error) signOutError = 'Could not sign out. Try again.';
	};

	const onWindowKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Escape' && pageStore.mobileSheet !== 'none') closeSheet();
	};

	const previewOptions: { value: PreviewWidth; label: string; icon: typeof Monitor }[] = [
		{ value: 'fit', label: 'Fit to pane', icon: Maximize2 },
		{ value: 'desktop', label: 'Desktop width, 1024px', icon: Monitor },
		{ value: 'tablet', label: 'Tablet width, 768px', icon: Tablet },
		{ value: 'phone', label: 'Phone width, 390px', icon: Smartphone }
	];

	const setPreview = (value: string) => {
		// ToggleGroup emits '' when the active item is toggled off. There is
		// always a width, so that is a no-op rather than a write -- the same
		// trap the decision control fell into.
		if (value) pageStore.setPreviewWidth(value as PreviewWidth);
	};

	onMount(() => {
		// Rail state is per-device chrome in `localStorage`, read here rather than
		// in the store's constructor: that module is imported during SSR, where
		// `localStorage` does not exist.
		pageStore.loadRailState();
		pageStore.loadPreviewWidth();
		pageStore.loadKarlOutline();
		pageStore.loadCopiedSteps();

		// If the layout is torn down before loadReview resolves -- a slow Supabase
		// round trip plus quick navigation -- the destroy callback fires while
		// cleanup is still undefined, and the subscription then installs after
		// teardown with nothing left to remove it. Remounting would stack channels.
		let disposed = false;
		let cleanup: (() => void) | undefined;

		loadReview()
			.then((fn) => {
				if (disposed) fn();
				else cleanup = fn;
			})
			.catch((err: unknown) => {
				// A rejection means loadReview returned no cleanup, so there is none to
				// store and nothing believed subscribed. `warn`, not `error`: the e2e
				// console gate fails on `console.error` only.
				console.warn('Review workspace: could not load the review:', err);
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
<svelte:window onkeydown={onWindowKeydown} />

<!-- The decision as a dot: the bar colour for a decided status, a ring for
     "Needs review" (an empty slot, as the queue's progress bar shows it).
     Decorative wherever it appears beside the words; the collapsed panel
     gives its own a label. -->
{#snippet statusDot(s: NonNullable<typeof status>)}
	<span
		class="inline-block size-2.5 flex-none rounded-full {s === 'needs-review'
			? 'border border-sfds-slate-l2 bg-white'
			: STATUS_LABELS[s].bar}"
		aria-hidden="true"
	></span>
{/snippet}

<div
	class="review-shell grid h-screen w-full grid-rows-[minmax(0,1fr)] overflow-hidden bg-muted/40"
	data-sheet={pageStore.mobileSheet}
	style="grid-template-columns: {pageStore.railCollapsed.queue ? '52px' : '280px'} 1fr {pageStore
		.railCollapsed.panel
		? '52px'
		: '380px'}"
>
	<!-- Backdrop for the narrow-viewport sheets. A real element rather than a
	     giant box-shadow, because it has to take the click that closes the
	     sheet. Rendered only when one is open. -->
	{#if pageStore.mobileSheet !== 'none'}
		<button type="button" class="sheet-backdrop" aria-label="Close panel" onclick={closeSheet}
		></button>
	{/if}

	<!-- Skip link. MEASURED before this existed: from a fresh load, 60 Tab
	     presses never reached Approve/Revise/Blocked. Every edit target in the
	     mockup is a focus stop and there are 40+ of them on a typical page, all
	     of them ahead of the review panel in DOM order, so the decision -- the
	     one thing this tool exists to record -- was effectively keyboard-only
	     in theory and unreachable in practice.

	     Deliberately the FIRST focusable element in the shell, ahead of the
	     queue's collapse button, and visible only while focused. -->
	<a href="#reviewPanel" class="skip-to-panel">Skip to review panel</a>

	<!-- Left Sidebar: Global Navigation & Review Queue -->
	<aside
		id="reviewQueueRail"
		tabindex="-1"
		aria-label="Review queue"
		class="queue-rail flex h-full min-w-0 flex-col border-r bg-background"
	>
		<!-- Every column's top row is `h-12` with a bottom border, so the queue,
		     the canvas toolbar and the panel's tabs share one 48px band and one
		     border line. They used to be 83px, 48px and 48px-on-grey: three tops
		     that read as three unrelated strips. -->
		{#if queueCollapsed}
			<div class="flex flex-col items-center">
				<div class="flex h-12 w-full items-center justify-center border-b border-sfds-grey-l2">
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
				<a
					href={resolve('/')}
					class="mt-3 flex size-7 items-center justify-center rounded-md border border-sfds-grey-l2 text-sfds-action hover:bg-sfds-blue-l1/60"
					title="All pages"
					aria-label="All pages"
				>
					<ArrowLeft class="size-3.5" aria-hidden="true" />
				</a>
			</div>
		{:else}
			<!-- The way back to `/`, which nothing in the workspace offered before:
			     the landing page (progress, propose a page, every page) was a dead
			     end once a reviewer left it. The app name and the account moved
			     out of this row -- the name to the link's destination, the account
			     to the rail footer -- so the queue starts 35px higher. -->
			<div class="flex h-12 flex-none items-center gap-2 border-b border-sfds-grey-l2 pr-3 pl-5">
				<a
					href={resolve('/')}
					class="flex min-w-0 flex-1 items-center gap-1.5 text-[13px] font-semibold text-sfds-action hover:underline"
					data-testid="all-pages-link"
				>
					<ArrowLeft class="size-3.5 flex-none" aria-hidden="true" />
					All pages
				</a>
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
			<!-- Who is signed in, and the way out: account business, so it sits with
			     the rail's other utilities rather than above the work. Still inside
			     the rail, so the queue sheet carries it below 1024px. -->
			{#if sessionStore.signedIn && sessionStore.email}
				<div class="flex min-w-0 items-center gap-2 px-5 pt-3 text-xs">
					<span
						class="min-w-0 truncate text-sfds-slate-l3"
						title={sessionStore.email}
						data-testid="signed-in-email">{sessionStore.email}</span
					>
					<button
						type="button"
						class="min-h-6 flex-none font-semibold text-sfds-action underline-offset-2 hover:underline"
						onclick={signOut}>Sign out</button
					>
				</div>
				{#if signOutError}
					<p class="px-5 pt-1 text-xs text-red-700" role="alert">{signOutError}</p>
				{/if}
			{/if}
			<div class="flex items-center justify-between gap-2 px-5 py-3">
				<!-- No longer dead. It is a view of this same route rather than a
				     page of its own: the queue and the review panel stay put, so
				     making it a route would remount both to change the middle column.
				     Styled as a nav link because that is what it does; still a
				     button, since it switches a mode rather than loading a URL. -->
				<button
					type="button"
					class="text-[13px] font-semibold text-sfds-action underline-offset-2 hover:underline"
					onclick={() => pageStore.showSitemap()}>Site map</button
				>
				<!-- Client-side export of live review statuses, checks, notes, and
				     inline edits compiled against the static corpus. A secondary
				     button with a download icon, so it reads as producing a file
				     rather than as another place to go. -->
				<Button
					variant="outline"
					size="sm"
					class="h-7 gap-1.5 px-2.5 text-xs"
					data-testid="export-review-data"
					onclick={() => triggerReviewExportDownload(pageStore.pages, $pagesStore, $editsStore)}
				>
					<Download class="size-3.5" aria-hidden="true" />
					Export review data
				</Button>
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
		{:else if pageStore.mode === 'blueprint' && blueprintPlacements && pageData}
			<BlueprintView
				placements={blueprintPlacements}
				title={String(pageData.title ?? '')}
				onExit={() => pageStore.showReview()}
				onShow={showOnPage}
			/>
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
					class="review-toolbar flex h-12 flex-none items-center justify-between border-b border-sfds-grey-l2 bg-background px-3 sm:px-5"
				>
					<!-- `grow` with no `min-w-0`: the group never shrinks below its
					     fixed controls, so a narrow bar wraps the right-hand group
					     onto a second row instead of overlapping it. -->
					<div class="flex min-w-0 grow items-center gap-2">
						<!-- The only way to the queue and the panel below 1024px, where
						     both rails leave the grid. Hidden above it, where the rails
						     are on screen and these would be a second way to do nothing
						     new. `h-7` like the bar's other controls: 28px still clears
						     WCAG 2.5.8's 24px target. -->
						<Button
							variant="outline"
							size="sm"
							class="narrow-only h-7 flex-none px-2.5 text-xs font-semibold"
							onclick={(e: MouseEvent) => openSheet('queue', e)}
						>
							Queue
						</Button>
						<!-- Below 1024px the panel is off screen, so this button carries the
						     decision: a dot, and the status in the accessible name after
						     the visible "Review", as "Review (Needs review)" (WCAG 2.5.3). -->
						<Button
							variant="outline"
							size="sm"
							class="narrow-only h-7 flex-none gap-1.5 px-2.5 text-xs font-semibold"
							onclick={(e: MouseEvent) => openSheet('panel', e)}
						>
							Review{#if status}<span class="sr-only">({statusLabel})</span>
								{@render statusDot(status)}{/if}
						</Button>
						<!-- Previous / next in queue order. An end of the queue renders an
						     inert placeholder of the same size rather than nothing, so the
						     title beside them does not shift as the reviewer steps through. -->
						<div class="flex flex-none items-center gap-1">
							{#if prevPath}
								<a
									href={resolve(reviewHrefFor(prevPath))}
									class="{buttonVariants({ variant: 'outline', size: 'icon' })} size-7"
									aria-label="Previous page: {titleOf(prevPath)}"
									title="Previous page: {titleOf(prevPath)}"
									data-testid="prev-page"
								>
									<ChevronLeft class="size-3.5" aria-hidden="true" />
								</a>
							{:else}
								<span
									class="flex size-7 items-center justify-center text-sfds-grey-l2"
									aria-hidden="true"><ChevronLeft class="size-3.5" /></span
								>
							{/if}
							{#if nextPath}
								<a
									href={resolve(reviewHrefFor(nextPath))}
									class="{buttonVariants({ variant: 'outline', size: 'icon' })} size-7"
									aria-label="Next page: {titleOf(nextPath)}"
									title="Next page: {titleOf(nextPath)}"
									data-testid="next-page"
								>
									<ChevronRight class="size-3.5" aria-hidden="true" />
								</a>
							{:else}
								<span
									class="flex size-7 items-center justify-center text-sfds-grey-l2"
									aria-hidden="true"><ChevronRight class="size-3.5" /></span
								>
							{/if}
						</div>
						<!-- The page itself, not its URL: the title always (it used to show
						     only with the queue collapsed, the slug otherwise), the slug in
						     its tooltip. `w-0 grow` truncates instead of letting a long
						     title decide where the bar wraps. Hidden on a phone, where the
						     mockup's own heading is the first thing under the bar. -->
						<span
							class="w-0 grow truncate text-sm font-semibold text-sfds-black max-sm:hidden"
							title={pageData?.slug ?? ''}
							data-testid="toolbar-title">{pageData?.title ?? titleOf(currentPath ?? '')}</span
						>
						{#if status}
							<span
								class="inline-flex flex-none items-center rounded-full border px-2 py-0.5 text-xs font-medium max-sm:hidden {STATUS_LABELS[
									status
								].badge}"
								data-testid="toolbar-status">{statusLabel}</span
							>
						{/if}
					</div>

					<div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
						{#if unsavedCount > 0}
							<span
								class="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-[3px] text-xs font-semibold text-violet-900"
								role="status"
							>
								{unsavedCount} unsaved {unsavedCount === 1 ? 'edit' : 'edits'}
							</span>
						{/if}
						<!-- Which rendering is on screen, and how to change it.
						     Icon-only because the toolbar had zero slack to spend:
						     four labelled buttons would not fit beside the walkthrough
						     button at 1280px. Each carries an aria-label and a title. -->
						<div class="flex flex-none items-center gap-2">
							<span
								class="text-[11px] font-semibold text-sfds-slate-l3 tabular-nums"
								data-testid="preview-width"
								title="Rendered at {frameWidth}px: the sf.gov {previewBand(
									frameWidth
								).toLowerCase()} layout"
							>
								<!-- The layout and the zoom are what a reviewer reads off this;
								     the pixel width is a detail, so it moved to the tooltip. -->
								{previewBand(frameWidth)}{scale < 1 ? ` · ${Math.round(scale * 100)}%` : ''}
							</span>
							<ToggleGroup.Root
								type="single"
								variant="outline"
								size="sm"
								spacing={0}
								aria-label="Mockup preview width"
								value={pageStore.previewWidth}
								onValueChange={setPreview}
							>
								{#each previewOptions as option (option.value)}
									<ToggleGroup.Item
										value={option.value}
										aria-label={option.label}
										title={option.label}
										class="size-7"
									>
										<option.icon class="size-3.5" />
									</ToggleGroup.Item>
								{/each}
							</ToggleGroup.Root>
						</div>
						<!-- The tool's second job, and the only way into it. Entering
					     collapses both rails; exiting puts them back as they were. -->
						{#if onDraft}
							<Button
								variant="outline"
								size="sm"
								class="h-7 flex-none text-xs"
								onclick={() => pageStore.enterWalkthrough()}
							>
								<!-- "Karl" alone on a phone keeps the bar to two rows; the
								     hidden words keep the accessible name, which tests and
								     screen readers both use, unchanged. -->
								<span class="max-sm:sr-only">Open</span> Karl
								<span class="max-sm:sr-only">walkthrough</span>
							</Button>
						{:else}
							<!-- The Karl views, in the walkthrough button's old slot so the
							     toolbar -- measured at zero slack between 1080px and 1400px --
							     gains no width. A disclosure of plain buttons and a switch,
							     NOT `role="menu"`: the walkthrough keeps its exact name and
							     role, and Popover handles Escape, outside clicks and focus
							     return. -->
							<Popover.Root bind:open={karlMenuOpen}>
								<Popover.Trigger
									class="{buttonVariants({ variant: 'outline', size: 'sm' })} h-7 flex-none text-xs"
									aria-label="Karl views"
								>
									Karl
								</Popover.Trigger>
								<Popover.Portal>
									<Popover.Content
										align="end"
										sideOffset={6}
										class="karl-menu z-50 flex w-64 flex-col gap-2 rounded-md border border-sfds-grey-l2 bg-background p-3 shadow-md"
									>
										<label class="flex items-center justify-between gap-3 text-sm font-medium">
											Show Karl fields
											<Switch
												checked={pageStore.karlOutline}
												onCheckedChange={(on: boolean) => pageStore.setKarlOutline(on)}
											/>
										</label>
										<p class="text-sfds-slate text-xs">
											Marks where each part of the page goes in Karl, and what won’t carry over.
										</p>
										<Separator />
										<Button
											variant="outline"
											size="sm"
											class="h-8 justify-start text-xs"
											onclick={() => {
												karlMenuOpen = false;
												pageStore.showBlueprint();
											}}
										>
											Show Blueprint
										</Button>
										<Button
											variant="outline"
											size="sm"
											class="h-8 justify-start text-xs"
											onclick={() => {
												karlMenuOpen = false;
												pageStore.enterWalkthrough();
											}}
										>
											Open Karl walkthrough
										</Button>
									</Popover.Content>
								</Popover.Portal>
							</Popover.Root>
						{/if}
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
				<!-- `overflow-x-auto` so a preset wider than the pane can be panned.
				     Centering moved OFF the flex container and onto the figure's
				     `mx-auto`: with `justify-content: center`, an overflowing flex
				     item has its start edge pushed out of the scrollable area and
				     cannot be scrolled back to. `margin-inline: auto` centres the
				     same way and keeps both edges reachable. -->
				<div
					class="flex flex-1 overflow-x-auto overflow-y-auto px-3 pt-4 pb-30 sm:px-8 sm:pt-7"
					bind:contentRect={paneBox}
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
					<!-- A chosen preset sets an explicit width and stops the frame
					     shrinking to the pane; `fit` leaves both unset and the old
					     `w-full` / 1440px ceiling applies. `flex-none` so a preset
					     wider than the pane is not squeezed back down -- the canvas
					     scrolls horizontally instead, which is honest about the fact
					     that a 1024px rendering does not fit in a 440px pane.
					     Under `fit`, a pane narrower than 1024px gets a 1024px frame
					     zoomed down to fit (`frameStyle`), so the container query
					     still sees desktop width and the reviewer sees the desktop
					     layout, not the tablet one. -->
					<figure
						bind:clientWidth={frameWidth}
						style={frameStyle}
						class="mockup-frame mx-auto w-full self-start overflow-hidden rounded-[4px] border border-gray-200 bg-site-surface shadow-[0_2px_4px_rgba(12,20,100,.06),0_4px_12px_rgba(12,20,100,.1)]"
					>
						<SiteHeader />

						<!-- Page specific content. 1076px is live sf.gov's content grid
					     (`max-w-xl`, measured 2026-11-22). Title and summary span it;
					     body copy sits in 7 of its 12 columns (app.css). The chrome
					     above and below is full-bleed, which is why it sits outside. -->
						<div id="mockPage" class="mock-page" class:karl-outline-on={outlinePlacements}>
							{#if outlinePlacements}
								<!-- Review-tool chrome, like the Karl notices inside sections: the
								     one-line count a reviewer reads before the chips. -->
								<p class="karl-outline-summary" role="status">
									<strong>Karl outline:</strong>
									{outlineSummary(outlinePlacements)}
									{#each outlinePlacements.pageCaveats as caveat, i (i)}
										<br /><strong>Before you start:</strong> {caveat}
									{/each}
								</p>
							{/if}
							<div class="mx-auto max-w-[1076px]">
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
	<!-- `tabindex="-1"` so the skip link's fragment can move focus here. It adds
	     no tab stop of its own; only a non-negative value would. -->
	<section
		id="reviewPanel"
		tabindex="-1"
		aria-label="Review panel"
		class="panel-rail flex h-full min-w-0 flex-col overflow-hidden border-l bg-background"
	>
		{#if panelCollapsed}
			<div class="flex flex-col items-center gap-4">
				<div class="flex h-12 w-full items-center justify-center border-b border-sfds-grey-l2">
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
				</div>
				<!-- Collapsed, the panel hid the one thing it exists for. The dot keeps
				     the decision on screen; its label carries it for a screen reader. -->
				{#if status}
					<span
						role="img"
						aria-label="Decision: {statusLabel}"
						title="Decision: {statusLabel}"
						class="flex size-7 items-center justify-center"
					>
						{@render statusDot(status)}
					</span>
				{/if}
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
	/* Visible only while focused. Off-screen rather than `display: none`, which
	   would take it out of the focus order and defeat the purpose. */
	.skip-to-panel {
		position: absolute;
		left: -9999px;
		z-index: 50;
		border-radius: 0 0 4px 0;
		background: var(--color-sfds-action);
		padding: 0.625rem 1rem;
		font-size: 13px;
		font-weight: 600;
		color: #fff;
	}

	.skip-to-panel:focus-visible {
		left: 0;
		top: 0;
	}

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

	/* sf.gov's desktop gutter is 96px (`lg:mx-96`) from a 1024px viewport, the
	   same step as its header and type. The frame's 1px border makes the
	   "Desktop 1024px" preset a 1022px box, hence 1000. That leaves #mockPage an
	   830px content box at that preset -- live's 832 -- which is what the
	   column and type rules in app.css query. */
	@container mockup (min-width: 1000px) {
		.mock-page {
			padding-inline: 96px;
		}
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
	/* The sheet triggers are narrow-viewport only. Declared here as the
	   default so they are absent at desktop widths, where both rails are
	   already on screen.

	   This rule has to come BEFORE the media query that turns them on: both
	   are `:global(.narrow-only)` with identical specificity, so whichever
	   is later in source order wins, and with the override first the buttons
	   never appeared at any width. */
	:global(.narrow-only) {
		display: none;
	}

	/* The toolbar wraps rather than overflowing.
	   It was measured at ZERO slack between 1080px and 1400px even before
	   anything was added to it -- the page slug was being squeezed to 0px
	   and the two groups met exactly -- and the preview-width control and
	   the two sheet triggers both land here. Fixed height and
	   `justify-between` with no wrap do not degrade, they overlap: at 768px
	   the right-hand group sat on top of the Queue button and swallowed its
	   clicks, which is how this was caught. */
	.review-toolbar {
		column-gap: 0.75rem;
		row-gap: 0.5rem;
		flex-wrap: wrap;
		height: auto;
		min-height: 3rem;
		padding-block: 0.375rem;
	}

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

		/* ...unless one has been asked for. Then it comes back as a full-height
		   overlay over the canvas, which is the part that was missing: hiding
		   the rails also hid their own toggles, because those are rendered
		   inside them, so 19 controls -- the queue, the tabs, the entire
		   decision control -- had no route back at all. The toolbar's Queue
		   and Review buttons are that route; this is where they lead. */
		.review-shell[data-sheet='queue'] .queue-rail,
		.review-shell[data-sheet='panel'] .panel-rail {
			position: fixed;
			z-index: 40;
			display: flex;
			inset-block: 0;
			width: min(88vw, 360px);
			box-shadow: 0 0 24px rgb(0 0 0 / 0.25);
		}

		.review-shell[data-sheet='queue'] .queue-rail {
			inset-inline-start: 0;
		}

		.review-shell[data-sheet='panel'] .panel-rail {
			inset-inline-end: 0;
		}

		/* `:global`, because the class is handed to the shadcn `Button`
		   component and Svelte's scoping would neither match it nor keep the
		   rule. */
		:global(.narrow-only) {
			display: inline-flex;
		}
	}

	.sheet-backdrop {
		position: fixed;
		inset: 0;
		z-index: 30;
		border: 0;
		background: rgb(0 0 0 / 0.4);
	}
</style>
