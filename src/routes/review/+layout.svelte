<script lang="ts">
	import { review } from '$lib/review/review.svelte';
	import { onMount, tick, untrack } from 'svelte';
	import { hydrateMockup } from '$lib/stores/applySavedEdits';
	import { classifyLatestEdits } from '$lib/stores/editStatus';
	import { warnBeforeLeaving } from '$lib/stores/leaveGuard';
	import { page } from '$app/stores';
	import { afterNavigate, replaceState } from '$app/navigation';
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
	import {
		editsLoaded,
		editsStore,
		isOwnEdit,
		loadReview,
		pagesStore,
		queueOrder
	} from '$lib/stores/reviewState';
	import { STATUS_LABELS } from '$lib/review/statusLabels';
	import { sessionStore } from '$lib/stores/session.svelte';
	import { supabase } from '$lib/supabase';
	import {
		ArrowLeft,
		ChevronLeft,
		ChevronRight,
		ChevronsLeft,
		ChevronsRight,
		ClipboardList,
		Download,
		Layers,
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
	import { wantsWalkthrough, withWalkthrough } from '$lib/karl/walkthroughLink';
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
					reviewRecordFor(
						pageData.id,
						$pagesStore,
						$editsStore,
						pageStore.staleEditsOn(pageData.id)
					)
				)
			: null
	);
	// The Karl outline (decisions in docs/plans/2026-11-23-karl-field-mapping-layer.md).
	// Off on draft routes by an explicit check, not by `pageData` being absent:
	// a draft IS in `pageStore.pages`, and its content type is the model's guess,
	// so a placement there would read as more settled than it is (decision 12).
	const onDraft = $derived(Boolean(currentPath && isDraftPath(currentPath)));
	// Built once for every Karl reader: the outline over the mockup, the
	// Blueprint, and the decision panel's readiness line. No longer gated on a
	// Karl view being open, because the readiness line is shown beside every
	// decision; `$derived` is lazy, so it still only runs while something reads it.
	const placementsHere = $derived(
		pageData && !onDraft
			? placementsFor(
					pageData as unknown as Parameters<typeof placementsFor>[0],
					reviewRecordFor(
						pageData.id,
						$pagesStore,
						$editsStore,
						pageStore.staleEditsOn(pageData.id)
					),
					pagesByKey,
					// Judge the wording on screen, unsaved changes included.
					{ copy: 'as-shown' }
				)
			: null
	);
	const outlinePlacements = $derived(pageStore.karlOutline ? placementsHere : null);
	const blueprintPlacements = $derived(pageStore.mode === 'blueprint' ? placementsHere : null);
	// The outline's own one-line summary, so the decision panel and the outline
	// bar can never describe the same page two ways.
	const karlReadiness = $derived(placementsHere ? outlineSummary(placementsHere) : null);

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
		},
		get always() {
			return placementsHere;
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

	// Which saved edits no longer answer their base copy (ADR 0001). Hashing is
	// async (WebCrypto), so a slow pass is dropped if a newer one has started --
	// otherwise an old result could land last and mark a field that has since
	// been re-saved. Tracks the page list shallowly, since a re-merged draft
	// page is a new base.
	let statusPass = 0;
	$effect(() => {
		const edits = $editsStore;
		const live = $pagesStore;
		void [...pageStore.pages];
		const pass = ++statusPass;
		classifyLatestEdits(live, edits, (path, fieldId) => pageStore.baseCopyOf(path, fieldId)).then(
			(status) => {
				if (pass === statusPass) pageStore.editStatus = status;
			}
		);
	});

	// Saved edits onto the mockup: after `loadReview`, on every realtime insert,
	// and when an unsaved change closes (a save that arrived during the typing was held
	// back for it). Tracks the stores, the page list shallowly and the unsaved change
	// keys -- not the copy itself, which this effect writes.
	$effect(() => {
		const edits = $editsStore;
		const loaded = $editsLoaded;
		const live = $pagesStore;
		const pages = [...pageStore.pages];
		void Object.keys(pageStore.unsavedChanges);
		untrack(() =>
			hydrateMockup({
				pages,
				livePages: live,
				edits,
				editsLoaded: loaded,
				isOwnEdit,
				changes: pageStore
			})
		);
	});

	// Unsaved changes on EVERY page, typed or accepted -- work does not follow the
	// reviewer, and a pill that dropped to zero on navigating would say it was
	// gone. Deliberately NOT the selected-field count; the footer's "Save N
	// changes" is this page's share of the same number.
	const unsavedCount = $derived(pageStore.unsavedChangeCount());

	// The toolbar's previous / next buttons step through the queue in the order
	// the sidebar renders it -- status groups, then the pages not in the review
	// yet -- so they land on the row above or below the current one. Signed out
	// the queue lists the corpus, so the fallback is corpus order. (They replace
	// a single "First page" link, which jumped to the queue's top and was the
	// toolbar's only navigation.)
	//
	// The order is taken when the queue's MEMBERSHIP changes, not on every
	// decision. A decision moves its row to another group, so an order that
	// followed it sent Next somewhere else the moment a reviewer chose Approved:
	// measured on 2026-11-26, approving the About page moved it to the end of
	// the queue and greyed Next out, with 37 undecided pages still to go. Held,
	// Next still means the row that came after this one, and Prev from there
	// comes back here. A reload regroups.
	const queueMembership = $derived(
		review.rows.map((p) => p.path).join('\n') + '\n\n' + review.unreviewed.join('\n')
	);
	const order = $derived.by(() => {
		void queueMembership;
		return untrack(() => {
			const queued = queueOrder(review.rows);
			return queued.length > 0
				? [...queued, ...review.unreviewed]
				: pageStore.pages.map((p) => p.id);
		});
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
	const statusLabel = $derived(status ? STATUS_LABELS[status].label : '');

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
		// `--fit-scale` lets review annotations inside the frame undo the zoom
		// (app.css): the page is previewed small, the tool's own marks are not.
		if (fit)
			return `width:${fit.width}px;max-width:none;flex:none;zoom:${fit.scale};--fit-scale:${fit.scale}`;
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

	const openSheet = async (which: 'queue' | 'panel', event: MouseEvent) => {
		sheetOpener = event.currentTarget as HTMLElement;
		pageStore.openSheet(which);
		// A modal sheet takes focus: left on the opener, focus sat behind the
		// sheet in content the `inert` below has just made unreachable.
		await tick();
		document.getElementById(which === 'panel' ? 'reviewPanel' : 'reviewQueueRail')?.focus();
	};

	const closeSheet = async () => {
		pageStore.closeSheet();
		// After the render that lifts `inert` from the toolbar: focusing the
		// opener while it is still inert is silently ignored.
		const opener = sheetOpener;
		sheetOpener = null;
		await tick();
		opener?.focus();
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
		// `defaultPrevented`: an Escape a popover or menu inside the sheet
		// already handled closes that, not the sheet around it.
		if (event.key === 'Escape' && !event.defaultPrevented && pageStore.mobileSheet !== 'none')
			closeSheet();
	};

	// A sheet exists only below 1024px. Widened past it (a tablet rotating, a
	// window resized) with one open, nothing reset `mobileSheet`, so the canvas
	// and the other rail stayed `inert` and the backdrop covered the desktop.
	$effect(() => {
		const wide = window.matchMedia('(min-width: 1024px)');
		const onChange = () => {
			if (wide.matches && pageStore.mobileSheet !== 'none') pageStore.closeSheet();
		};
		wide.addEventListener('change', onChange);
		return () => wide.removeEventListener('change', onChange);
	});

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

		loadQueue();

		return () => {
			disposed = true;
			cleanup?.();
		};
	});

	// Where the review load stands, for the queue. An empty `pagesStore` means
	// three different things -- still loading, the load failed, or a review with
	// no pages -- and the queue said "This review has no pages yet." for all
	// three, measured 1.5s into a normal load. The landing page tells them apart
	// the same way.
	let queueLoad = $state<'loading' | 'ready' | 'failed'>('loading');

	// If the layout is torn down before loadReview resolves -- a slow Supabase
	// round trip plus quick navigation -- the destroy callback fires while
	// cleanup is still undefined, and the subscription then installs after
	// teardown with nothing left to remove it. Remounting would stack channels.
	// Plain `let`s, at this scope so Try again can reach them.
	let disposed = false;
	let cleanup: (() => void) | undefined;

	function loadQueue() {
		queueLoad = 'loading';
		return loadReview()
			.then((fn) => {
				if (disposed) fn();
				else cleanup = fn;
				queueLoad = 'ready';
			})
			.catch((err: unknown) => {
				// A rejection means loadReview returned no cleanup, so there is none to
				// store and nothing believed subscribed. `warn`, not `error`: the e2e
				// console gate fails on `console.error` only.
				console.warn('Review workspace: could not load the review:', err);
				queueLoad = 'failed';
			});
	}

	// ---- the walkthrough's deep link (`?view=walkthrough`) ----------------
	//
	// URL -> view: a navigation that arrives with the parameter opens the
	// walkthrough. It is held as `pendingWalkthrough` until the page exists,
	// because a draft route renders before its draft has loaded. Registered
	// AFTER the onMount above, so on first load the rail state is read before
	// `enterWalkthrough` captures it to restore on exit.
	let pendingWalkthrough = $state(false);
	// False until SvelteKit's first `afterNavigate`. The hydration effects run
	// INSIDE the root component's constructor, before the client has assigned
	// `root`, and `replaceState` calls `root.$set` -- measured: an uncaught
	// "Cannot read properties of undefined (reading '$set')" on a deep-linked
	// load. SvelteKit fires `afterNavigate` only once that assignment is done.
	let routerReady = $state(false);
	afterNavigate(({ to }) => {
		routerReady = true;
		pendingWalkthrough = Boolean(to && wantsWalkthrough(to.url));
	});
	$effect(() => {
		if (!pendingWalkthrough || !pageData) return;
		pendingWalkthrough = false;
		if (pageStore.mode !== 'walkthrough') pageStore.enterWalkthrough();
	});

	// View -> URL: entering adds the parameter, so the address bar can be
	// bookmarked or sent; leaving strips it, so a reload after Exit lands on
	// the mockup. Read from `location`, not `$page.url`: this effect should run
	// on a change of view or page, not on its own `replaceState`.
	$effect(() => {
		if (!routerReady) return;
		const on = pageStore.mode === 'walkthrough';
		void currentPath;
		const here = new URL(location.href);
		if (wantsWalkthrough(here) === on) return;
		// The current location with one query parameter changed: it is already a
		// resolved URL (base path included), so there is nothing to resolve().
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		replaceState(withWalkthrough(here, on), $page.state);
	});
</script>

<!-- 280 / 1fr / 380, up from 250 / 1fr / 300. The review panel needs the extra
     80px for the diff cards; the queue needs it for the sub-lines. Collapsed
     rails are 52px (design 2a) — the buttons live here, the rail contents are
     the 2a pass. -->
<svelte:window
	onkeydown={onWindowKeydown}
	onbeforeunload={(e) => warnBeforeLeaving(e, pageStore.unsavedChangeCount())}
/>

<!-- Without JS nothing measures the pane, so the frame would stay unpainted
     (see `.mockup-frame[data-measured='false']`). The mockups are static and
     readable signed out, so they stay readable with scripts off too. -->
<svelte:head>
	<noscript>
		<style>
			.mockup-frame[data-measured='false'] {
				visibility: visible !important;
			}
		</style>
	</noscript>
</svelte:head>

<!-- The decision as a dot: the bar colour for a decided status, a ring for
     "Undecided" (an empty slot, as the queue's progress bar shows it).
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
		<button
			type="button"
			class="sheet-backdrop"
			tabindex="-1"
			aria-label={pageStore.mobileSheet === 'queue' ? 'Close queue' : 'Close review panel'}
			onclick={closeSheet}
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
	<!-- Inert while a sheet is open: it sits outside both rails, so Tab from
	     inside the modal sheet could reach it, and its target may be inert. -->
	<a href="#reviewPanel" class="skip-to-panel" inert={pageStore.mobileSheet !== 'none'}
		>Skip to review panel</a
	>

	<!-- Left Sidebar: Global Navigation & Review Queue -->
	<!-- Below 1024px either rail can open as a sheet over the canvas. Open, it is
	     a modal dialog: `inert` on everything else keeps focus and the reading
	     cursor inside it, and its close control says Close, not Collapse. -->
	<aside
		id="reviewQueueRail"
		tabindex="-1"
		aria-label="Review queue"
		role={pageStore.mobileSheet === 'queue' ? 'dialog' : undefined}
		aria-modal={pageStore.mobileSheet === 'queue' ? 'true' : undefined}
		inert={pageStore.mobileSheet === 'panel'}
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
					class="flex min-w-0 flex-1 items-center gap-1.5 text-[0.8125rem] font-semibold text-sfds-action hover:underline"
					data-testid="all-pages-link"
				>
					<ArrowLeft class="size-3.5 flex-none" aria-hidden="true" />
					All pages
				</a>
				<Button
					variant="outline"
					size="icon"
					class="size-7 flex-none"
					title={pageStore.mobileSheet === 'queue' ? 'Close queue' : 'Collapse queue'}
					aria-label={pageStore.mobileSheet === 'queue' ? 'Close queue' : 'Collapse queue'}
					onclick={() =>
						pageStore.mobileSheet === 'queue' ? closeSheet() : pageStore.toggleRail('queue')}
				>
					<ChevronsLeft class="size-3.5" />
				</Button>
			</div>
			<ScrollArea class="min-h-0 flex-1">
				<ReviewQueue loadState={queueLoad} onRetry={loadQueue} />
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
					<p class="px-5 pt-1 text-xs text-sfds-red" role="alert">{signOutError}</p>
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
					class="shrink-0 text-[0.8125rem] font-semibold whitespace-nowrap text-sfds-action underline-offset-2 hover:underline"
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
	     It also carried `role="presentation"`, there only for that handler. Once
	     the root layout stopped wrapping every page in its own <main>, the role
	     left review pages with NO main landmark, so it is gone too. -->
	<main
		class="relative flex h-full cursor-default flex-col overflow-hidden bg-muted"
		inert={pageStore.mobileSheet !== 'none'}
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
				class="border-b border-sfds-amber bg-sfds-amber-l1 px-4 py-2 text-sm text-sfds-black"
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
					aria-label="Page toolbar"
					class="review-toolbar @container/toolbar flex h-12 flex-none items-center justify-between border-b border-sfds-grey-l2 bg-background px-3 sm:px-5"
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
						     the visible "Review", as "Review (Undecided)" (WCAG 2.5.3). -->
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
						     mockup's own heading is the first thing under the bar.
						     `min-w-40` is the floor: below it the bar wraps its right-hand
						     group onto a second row rather than squeezing the title, which
						     measured 12px wide at 768px and 24px at 1280px -- "A." -- with
						     270px of title to show. -->
						<span
							class="w-0 min-w-40 grow truncate text-sm font-semibold text-sfds-black max-sm:hidden"
							title={pageData?.slug ?? ''}
							data-testid="toolbar-title">{pageData?.title ?? titleOf(currentPath ?? '')}</span
						>
						{#if status}
							<span
								class="wide-only inline-flex flex-none items-center rounded-full border px-2 py-0.5 text-xs font-medium {STATUS_LABELS[
									status
								].badge}"
								data-testid="toolbar-status">{statusLabel}</span
							>
						{/if}
					</div>

					<div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
						{#if unsavedCount > 0}
							<span
								class="inline-flex items-center rounded-full border border-sfds-action/40 bg-sfds-blue-l1 px-2.5 py-[3px] text-xs font-semibold text-sfds-blue-dark"
								role="status"
							>
								{unsavedCount} unsaved {unsavedCount === 1 ? 'change' : 'changes'}
							</span>
						{/if}
						<!-- Which rendering is on screen, and how to change it.
						     Icon-only because the toolbar had zero slack to spend:
						     four labelled buttons would not fit beside the walkthrough
						     button at 1280px. Each carries an aria-label and a title. -->
						<div class="flex flex-none items-center gap-2">
							<span
								class="text-[0.6875rem] font-semibold text-sfds-slate-l3 tabular-nums"
								data-testid="preview-width"
								title="Rendered at {frameWidth}px: the sf.gov {previewBand(
									frameWidth
								).toLowerCase()} layout"
							>
								<!-- The layout and the zoom are what a reviewer reads off this;
								     the pixel width is a detail, so it moved to the tooltip.
								     Blank until the frame is measured: `frameWidth` starts at 0,
								     which `previewBand` calls Phone, so every load said "Phone"
								     before settling on "Desktop · 70%". -->
								{#if frameWidth > 0}
									{previewBand(frameWidth)}{scale < 1 ? ` · ${Math.round(scale * 100)}%` : ''}
								{/if}
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
						<!-- The tool's second job, so it is a labelled, filled button of its
						     own rather than an item behind the Karl views disclosure, where
						     nothing on screen said it existed. Entering collapses both
						     rails; exiting puts them back as they were. The accessible name
						     stays "Open Karl walkthrough" (it contains the visible label,
						     WCAG 2.5.3). The visible label drops to "Karl" when the BAR is
						     narrow, not the window -- the rails decide its width. At 52rem
						     rather than 32rem since the title got a floor: with both rails
						     open at 1440px the full label left the title 184px, and at
						     1280px pushed the bar to the title floor. -->
						<Button
							size="sm"
							class="h-7 flex-none gap-1.5 text-xs font-semibold"
							onclick={() => pageStore.enterWalkthrough()}
							data-testid="karl-walkthrough"
						>
							<ClipboardList class="size-3.5" aria-hidden="true" />
							<!-- One span, so the button's flex gap does not land between words;
							     `&nbsp;` because Svelte trims a span's leading whitespace. -->
							<span
								><span class="sr-only">Open&nbsp;</span>Karl<span
									class="@max-[52rem]/toolbar:sr-only">&nbsp;walkthrough</span
								></span
							>
						</Button>
						{#if !onDraft}
							<!-- The other two Karl views. A disclosure of a switch and a plain
							     button, NOT `role="menu"`; Popover handles Escape, outside
							     clicks and focus return. Off on drafts (decision 12). -->
							<Popover.Root bind:open={karlMenuOpen}>
								<Popover.Trigger
									class="{buttonVariants({
										variant: 'outline',
										size: 'sm'
									})} size-7 flex-none px-0"
									aria-label="Karl views"
									title="Karl views: field outline and Blueprint"
								>
									<!-- Icon-only: the labelled walkthrough button beside it spent
									     the width, and at 1080px a labelled trigger wrapped the bar
									     onto a third row. Named by aria-label, described by title. -->
									<Layers class="size-3.5" aria-hidden="true" />
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
										<p class="text-xs text-sfds-slate-l3">
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
						data-measured={paneBox ? 'true' : 'false'}
						class="mockup-frame mx-auto w-full self-start overflow-hidden rounded-[4px] border border-sfds-grey-l2 bg-site-surface shadow-[0_2px_4px_rgba(12,20,100,.06),0_4px_12px_rgba(12,20,100,.1)]"
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
		role={pageStore.mobileSheet === 'panel' ? 'dialog' : undefined}
		aria-modal={pageStore.mobileSheet === 'panel' ? 'true' : undefined}
		inert={pageStore.mobileSheet === 'queue'}
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
						class="inline-flex size-6 items-center justify-center rounded-full bg-sfds-action text-[0.6875rem] font-bold text-white"
						role="status"
						aria-label="{unsavedCount} unsaved {unsavedCount === 1 ? 'change' : 'changes'}"
					>
						{unsavedCount}
					</span>
				{/if}
			</div>
		{:else}
			<ReviewWorkspace
				{pageData}
				{livePageId}
				{karlReadiness}
				collapseLabel={pageStore.mobileSheet === 'panel'
					? 'Close review panel'
					: 'Collapse review panel'}
				onCollapse={() =>
					pageStore.mobileSheet === 'panel' ? closeSheet() : pageStore.toggleRail('panel')}
			/>
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
		font-size: 0.8125rem;
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

	/* Unpainted until the pane is measured. Before then `fit` has no width to
	   work from, so the frame took the pane's width unzoomed -- sf.gov's tablet
	   layout -- and then jumped to the zoomed desktop one. Measured on a
	   production build at 1440px: 716px wide with a 32px title, then a 1024px
	   frame at 70% with a 46px title. Measurement lands on the first frame
	   after hydration; `noscript` in <svelte:head> shows it without JS. */
	.mockup-frame[data-measured='false'] {
		visibility: hidden;
	}

	/* sf.gov's gutters step rather than scale: 20px on a phone, 28px from a
	   768px viewport (measured on `dph-leaves-absence` 2026-11-26), 96px from
	   1024 (below). SiteHeader and SiteFooter use the same steps, so the page
	   title, the header seal and the footer lockup share one left edge. 760
	   rather than 768 because the frame's border makes the Tablet preset a
	   766px box. */
	.mock-page {
		padding-block: clamp(1.25rem, 4cqi, 2.5rem);
		padding-inline: 20px;
	}
	@container mockup (min-width: 760px) {
		.mock-page {
			padding-inline: 28px;
		}
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

		/* The toolbar's status badge. Down here the Review sheet trigger
		   carries the status as a dot and in its name, so the badge only
		   repeated it, in width the page title needed. */
		:global(.wide-only) {
			display: none;
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
