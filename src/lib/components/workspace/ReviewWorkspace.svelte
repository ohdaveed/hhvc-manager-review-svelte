<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ChevronLeft, ChevronRight, ChevronsRight } from '@lucide/svelte';
	import { tick } from 'svelte';
	import { resolve } from '$app/paths';
	import { reviewHrefFor } from '$lib/corpus/draftPath';
	import DecisionFooter from './DecisionFooter.svelte';
	import NotesPanel from './NotesPanel.svelte';
	import KarlPanel from './KarlPanel.svelte';
	import PageChecks from './PageChecks.svelte';
	import FieldsPanel from './FieldsPanel.svelte';
	import RethinkPanel from './RethinkPanel.svelte';
	import AnalysisPanel from './AnalysisPanel.svelte';
	import { pageStore } from '$lib/stores/pageData.svelte';
	import { pagesStore, type PageCheck } from '$lib/stores/reviewState';

	let {
		pageData,
		livePageId,
		karlReadiness = null,
		karlViews = false,
		prevPath,
		nextPath,
		titleOf = (path: string) => path,
		collapseLabel = 'Collapse review panel',
		onCollapse
	}: {
		/** "Close review panel" when the panel is the narrow-viewport sheet. */
		collapseLabel?: string;
		pageData: unknown;
		livePageId?: string;
		/** The Karl outline's summary for this page, for the decision. */
		karlReadiness?: string | null;
		/** Offer the Karl tab's canvas views. Off on drafts (decision 12). */
		karlViews?: boolean;
		/** The pages either side of this one in queue order, for the header's arrows. */
		prevPath?: string;
		nextPath?: string;
		titleOf?: (path: string) => string;
		onCollapse?: () => void;
	} = $props();

	const page = $derived(
		pageData && typeof pageData === 'object' ? (pageData as { id?: string; title?: unknown }) : null
	);
	const title = $derived(typeof page?.title === 'string' ? page.title : '');

	// Three tabs, in the order of the job: put the page right, say what is
	// left, move it into Karl. The decision is not a tab -- it is pinned under
	// them, on screen throughout.
	let activeTab = $state<'fix' | 'notes' | 'karl'>('fix');

	// Fix holds three tools. Checks is what is wrong; Fields and Rethink are the
	// two ways to change the copy (a field at a time, or a whole section).
	let tool = $state<'checks' | 'fields' | 'rethink'>('checks');

	// Selecting copy in the mockup is a request to work on it, so the panel
	// follows. Deliberately one-way: a reviewer who then opens Checks stays
	// there, and only a NEW selection pulls them back.
	let lastSelection = $state('');
	$effect(() => {
		const key = pageStore.selectedFieldIds.join('|');
		if (key !== lastSelection) {
			lastSelection = key;
			if (key !== '') {
				activeTab = 'fix';
				tool = 'fields';
			}
		}
	});

	// Selecting a section is a request to work on it, so the panel follows.
	// One-way, like the field effect above.
	let lastSection = $state<string | undefined>(undefined);
	$effect(() => {
		const key = pageStore.selectedSectionKey;
		if (key !== lastSection) {
			lastSection = key;
			if (key) {
				activeTab = 'fix';
				tool = 'rethink';
			}
		}
	});

	// The mockup shows its "Rethink section" buttons at rest while Rethink is
	// the tool open; otherwise they wait for the pointer.
	$effect(() => {
		pageStore.rethinkTabOpen = activeTab === 'fix' && tool === 'rethink';
		return () => (pageStore.rethinkTabOpen = false);
	});

	const liveRecord = $derived($pagesStore.find((p) => p.path === page?.id));

	// The Fix badge: the synced page checks that have not passed. It counted
	// the Checks tool's own findings until that tool became Reading Level and
	// Link Targets, which measure and list rather than pass or fail. `null`
	// with no row to read, so nothing is claimed about a page not in the review.
	const openIssues = $derived(
		liveRecord
			? Object.values(liveRecord.page_checks ?? {}).filter(
					(check) => (check as PageCheck).status !== 'pass'
				).length
			: null
	);

	// The Notes badge: a tick once there is feedback, a warning while a page is
	// being sent back without any.
	const hasNotes = $derived((liveRecord?.manager_notes ?? '').trim() !== '');
	const missingNote = $derived(
		!hasNotes && (liveRecord?.status === 'revise' || liveRecord?.status === 'blocked')
	);

	async function writeFeedback() {
		activeTab = 'notes';
		await tick();
		document.getElementById('notes')?.focus();
	}

	const BADGE =
		'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-px text-xs font-semibold';
	// A warning badge is amber on its tint (5.15:1); a neutral one, black on grey.
	const WARN = 'bg-sfds-amber-l1 text-sfds-amber';
	const NEUTRAL = 'bg-sfds-grey-l2 text-sfds-black';
	const TRIGGER =
		'min-h-11 flex-1 px-2 text-sm data-active:font-semibold data-active:text-sfds-blue-dark after:h-[3px]! after:bg-sfds-action!';
	const ARROW =
		'flex size-10 flex-none items-center justify-center rounded-full bg-muted text-slate-700 hover:bg-sfds-blue-l1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sfds-black';
</script>

<Tabs.Root
	bind:value={activeTab}
	id="reviewWorkspace"
	class="review-workspace flex h-full min-h-0 flex-col gap-0 bg-slate-50"
	aria-label="Review workspace"
>
	<header class="flex-none border-b border-sfds-grey-l2 bg-background">
		<!-- The page on review, and the pages either side of it in queue order.
		     An end of the queue renders an inert placeholder of the same size,
		     so the title beside the arrows does not shift from page to page. -->
		<div class="flex min-h-12 items-center gap-1.5 pt-2 pr-2 pb-1 pl-4">
			<h2 class="min-w-0 flex-1 truncate text-[1.0625rem] font-bold tracking-[-0.01em]" {title}>
				{title || 'Review'}
			</h2>
			{#if prevPath}
				<a
					href={resolve(reviewHrefFor(prevPath))}
					class={ARROW}
					aria-label="Previous page: {titleOf(prevPath)}"
					title="Previous page: {titleOf(prevPath)}"
				>
					<ChevronLeft class="size-[1.125rem]" aria-hidden="true" />
				</a>
			{:else}
				<span class="flex size-10 flex-none items-center justify-center text-sfds-grey-l2">
					<ChevronLeft class="size-[1.125rem]" aria-hidden="true" />
				</span>
			{/if}
			{#if nextPath}
				<a
					href={resolve(reviewHrefFor(nextPath))}
					class={ARROW}
					aria-label="Next page: {titleOf(nextPath)}"
					title="Next page: {titleOf(nextPath)}"
				>
					<ChevronRight class="size-[1.125rem]" aria-hidden="true" />
				</a>
			{:else}
				<span class="flex size-10 flex-none items-center justify-center text-sfds-grey-l2">
					<ChevronRight class="size-[1.125rem]" aria-hidden="true" />
				</span>
			{/if}
			{#if onCollapse}
				<Button
					variant="outline"
					size="icon"
					class="size-7 flex-none"
					title={collapseLabel}
					aria-label={collapseLabel}
					onclick={onCollapse}
				>
					<ChevronsRight class="size-3.5" />
				</Button>
			{/if}
		</div>

		<!-- Three equal triggers, so they fit one row at any root font size --
		     the four before them wrapped at a 20px root. `h-auto!` because the
		     `line` variant pins the list to `h-8`, and `pb-[5px]` keeps the
		     active underline, which sits 5px below its trigger, inside the band. -->
		<Tabs.List variant="line" class="h-auto! w-full gap-0 border-0 bg-transparent px-2 pb-[5px]">
			<Tabs.Trigger value="fix" class={TRIGGER}>
				Fix
				{#if openIssues}
					<span class="{BADGE} {WARN}">
						{openIssues}<span class="sr-only"> to fix</span>
					</span>
				{/if}
			</Tabs.Trigger>
			<Tabs.Trigger value="notes" class={TRIGGER}>
				Notes
				{#if hasNotes}
					<span class="{BADGE} {NEUTRAL}">
						<span aria-hidden="true">✓</span><span class="sr-only">written</span>
					</span>
				{:else if missingNote}
					<span class="{BADGE} {WARN}">
						<span aria-hidden="true">!</span><span class="sr-only">needed</span>
					</span>
				{/if}
			</Tabs.Trigger>
			<Tabs.Trigger value="karl" class={TRIGGER}>Karl</Tabs.Trigger>
		</Tabs.List>
	</header>

	<!-- The tab panel is the scroller for Checks, so it is the focusable scroll
	     region axe asks for. Fields and Rethink scroll themselves and pin their
	     own action bar, so for them the panel only lays out. -->
	<Tabs.Content
		value="fix"
		class="min-h-0 flex-1 {tool === 'checks' ? 'overflow-y-auto' : 'flex flex-col overflow-hidden'}"
	>
		<div class="flex-none px-3 pt-3">
			<ToggleGroup.Root
				type="single"
				variant="outline"
				size="sm"
				spacing={0}
				class="grid w-full grid-cols-3 gap-1 rounded-xl bg-muted p-1"
				aria-label="Fix tools"
				value={tool}
				onValueChange={(next: string) => {
					// '' is the active item toggled off. There is always a tool.
					if (next) tool = next as typeof tool;
				}}
			>
				{#each [['checks', 'Checks'], ['fields', 'Fields'], ['rethink', 'Rethink']] as [value, label] (value)}
					<ToggleGroup.Item
						{value}
						class="h-9 rounded-[9px]! border-0! bg-transparent text-sm font-medium text-slate-700 data-[state=on]:bg-white data-[state=on]:font-semibold data-[state=on]:text-sfds-black data-[state=on]:shadow-sm"
					>
						{label}
						{#if value === 'fields' && pageStore.selectedFieldIds.length > 0}
							<span
								class="ml-1.5 inline-flex size-[1.0625rem] items-center justify-center rounded-full bg-sfds-action text-[0.625rem] font-bold text-white"
							>
								{pageStore.selectedFieldIds.length}
							</span>
						{/if}
					</ToggleGroup.Item>
				{/each}
			</ToggleGroup.Root>
		</div>
		{#if tool === 'checks'}
			<!-- Reading level and link targets, measured here, then the
			     `page_checks` rows synced into Supabase. Two sources with two
			     owners -- a synced check is someone's recorded judgement, the rest
			     is this session's measurement -- in one place to read. -->
			<AnalysisPanel {pageData} embedded />
			<PageChecks pageId={page?.id} />
		{:else if tool === 'fields'}
			<div class="mt-3 min-h-0 flex-1 overflow-hidden border-t border-sfds-grey-l2 bg-background">
				<FieldsPanel {pageData} {livePageId} {karlViews} />
			</div>
		{:else}
			<div class="mt-3 min-h-0 flex-1 overflow-hidden border-t border-sfds-grey-l2 bg-background">
				<RethinkPanel {pageData} active={activeTab === 'fix' && tool === 'rethink'} />
			</div>
		{/if}
	</Tabs.Content>
	<Tabs.Content value="notes" class="min-h-0 flex-1 overflow-y-auto">
		<NotesPanel pageData={page} {openIssues} />
	</Tabs.Content>
	<Tabs.Content value="karl" class="min-h-0 flex-1 overflow-y-auto">
		<KarlPanel pageId={page?.id} views={karlViews} />
	</Tabs.Content>

	<DecisionFooter
		pageData={page}
		{karlReadiness}
		onDecided={(status) => {
			// An approved page's next step is Karl, so the panel goes there.
			if (status === 'approved') activeTab = 'karl';
		}}
		onWriteFeedback={writeFeedback}
	/>
</Tabs.Root>
