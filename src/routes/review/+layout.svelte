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
	import { firstQueuePath, loadReview, pagesStore } from '$lib/stores/reviewState';
	import { sessionStore } from '$lib/stores/session.svelte';
	import { ChevronsLeft, ChevronsRight } from 'lucide-svelte';
	import ReviewQueue from '$lib/components/workspace/ReviewQueue.svelte';
	import ReviewWorkspace from '$lib/components/workspace/ReviewWorkspace.svelte';
	import SiteHeader from '$lib/components/sfgov/SiteHeader.svelte';
	import SiteFooter from '$lib/components/sfgov/SiteFooter.svelte';

	let { children } = $props();

	// Karl tag display is not implemented — nothing reads this yet. The control
	// stays disabled rather than animating over dead state; it was previously a
	// bare checkbox carrying DaisyUI classes for a DaisyUI that is not installed.
	let showKarlTags = $state(false);

	// Dynamically pick the page data based on slug for the workspace
	const pageData = $derived(pageStore.pages.find((p) => p.id === $page.params.slug));

	// `pagesStore` is keyed by the routable id, the same lookup HelpPanel uses.
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
	const exportTarget = $derived(
		firstQueuePath($pagesStore) ?? pageStore.pages[0]?.id ?? $page.params.slug
	);

	onMount(() => {
		// Rail state is per-device chrome in `localStorage`, read here rather than
		// in the store's constructor: that module is imported during SSR, where
		// `localStorage` does not exist.
		pageStore.loadRailState();

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
	class="grid h-screen w-full overflow-hidden bg-muted/40"
	style="grid-template-columns: {pageStore.railCollapsed.queue ? '52px' : '280px'} 1fr {pageStore
		.railCollapsed.panel
		? '52px'
		: '380px'}"
>
	<!-- Left Sidebar: Global Navigation & Review Queue -->
	<aside class="flex h-full min-w-0 flex-col border-r bg-background">
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
					<div class="text-[11px] font-bold tracking-[0.1em] text-sfds-slate-l2 uppercase">
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
					href={resolve('/review/[slug]', { slug: exportTarget })}
					class="text-[13px] font-semibold text-sfds-action hover:underline"
					data-testid="export-review-data">Export review data</a
				>
				<!-- Site map is still dead, deliberately. It has no spec anywhere in
				     the repo -- the only two references are this link and the flag in
				     PLAN.md -- so there is nothing to point it at that would not be a
				     guess. Left visibly broken rather than quietly aimed somewhere. -->
				<a
					href={resolve('/review')}
					class="text-[13px] font-semibold text-sfds-action hover:underline">Site map</a
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
				<strong class="font-semibold">Viewing signed out.</strong> You can read every mockup, but editing
				is disabled because edits cannot be saved without an account.
			</div>
		{/if}

		<!-- Toolbar (Top) -->
		<nav class="flex h-12 flex-none items-center justify-between border-b bg-background px-5">
			<div class="flex min-w-0 items-center gap-2">
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
				<span class="truncate font-mono text-xs text-sfds-slate-l2">
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
					<Label for="tagToggle" class="text-sfds-slate-l2">Karl tags</Label>
					<Switch
						id="tagToggle"
						bind:checked={showKarlTags}
						disabled
						title="Karl tag display is not implemented yet"
					/>
				</div>
			</div>
		</nav>

		<!-- Scrollable Mockup Container.
		     tabindex="0" is what axe's scrollable-region-focusable asks for: a
		     region that scrolls but cannot be focused is unreachable by keyboard,
		     so a keyboard-only reviewer could not scroll the mockup at all. The
		     role and label give the focus stop a meaning once it exists. -->
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
			<figure
				class="w-full max-w-[880px] self-start overflow-hidden rounded-[4px] border border-gray-200 bg-white shadow-[0_2px_4px_rgba(12,20,100,.06),0_4px_12px_rgba(12,20,100,.1)]"
			>
				<SiteHeader />

				<!-- Page specific content. 40px/32px padding around a 760px column
				     is the design's measure, not the previous uniform 32px: SF.gov
				     body copy is set to a fixed reading width, and the chrome above
				     and below is full-bleed, which is why it sits outside here. -->
				<div id="mockPage" class="px-8 py-10">
					<div class="mx-auto max-w-[760px]">
						{@render children()}
					</div>
				</div>

				<SiteFooter />
			</figure>
		</div>
	</main>

	<!-- Right Sidebar: Contextual Manager Review & Checks -->
	<section class="flex h-full min-w-0 flex-col overflow-hidden border-l bg-background">
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
