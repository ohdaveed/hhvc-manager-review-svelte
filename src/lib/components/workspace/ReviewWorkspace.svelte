<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ChevronsRight } from '@lucide/svelte';
	import ReviewPanel from './ReviewPanel.svelte';
	import FieldsPanel from './FieldsPanel.svelte';
	import RethinkPanel from './RethinkPanel.svelte';
	import AnalysisPanel from './AnalysisPanel.svelte';
	import { pageStore } from '$lib/stores/pageData.svelte';

	let {
		pageData,
		livePageId,
		karlReadiness = null,
		karlViews = false,
		collapseLabel = 'Collapse review panel',
		onCollapse
	}: {
		/** "Close review panel" when the panel is the narrow-viewport sheet. */
		collapseLabel?: string;
		pageData: unknown;
		livePageId?: string;
		/** The Karl outline's summary for this page, for the decision panel. */
		karlReadiness?: string | null;
		/** Show the Karl strip (outline switch, Blueprint). Off on drafts (decision 12). */
		karlViews?: boolean;
		onCollapse?: () => void;
	} = $props();

	let activeTab = $state('overview');

	// Selecting copy in the mockup is a request to work on it, so the panel
	// follows. Deliberately one-way: a reviewer who then opens Page checks stays
	// there, and only a NEW selection pulls them back.
	let lastSelection = $state('');
	$effect(() => {
		const key = pageStore.selectedFieldIds.join('|');
		if (key !== lastSelection) {
			lastSelection = key;
			if (key !== '') activeTab = 'fields';
		}
	});

	// Selecting a section is a request to work on it, so the panel follows.
	// One-way, like the field effect above: a reviewer who then opens another
	// tab stays there.
	let lastSection = $state<string | undefined>(undefined);
	$effect(() => {
		const key = pageStore.selectedSectionKey;
		if (key !== lastSection) {
			lastSection = key;
			if (key) activeTab = 'rethink';
		}
	});

	// The mockup shows its "Rethink section" buttons at rest while this tab is
	// the one open; on any other tab they wait for the pointer.
	$effect(() => {
		pageStore.rethinkTabOpen = activeTab === 'rethink';
		return () => (pageStore.rethinkTabOpen = false);
	});
</script>

<Tabs.Root
	bind:value={activeTab}
	id="reviewWorkspace"
	class="review-workspace flex h-full min-h-0 flex-col gap-0"
	aria-label="Review workspace"
>
	<!-- FOUR triggers now, and they fit on one row.
	     History, because the count has been wrong twice: six tabs totalled
	     428px, removing Help left five at 352.47px, and the strip is 339px --
	     so five still wrapped, with "Analysis" alone on a second row and the
	     collapse button stranded beside the first. Re-measured in Chromium at
	     1440x1000 before this change: 353px of triggers in a 339px strip.

	     Four at 16px still do NOT fit for a reviewer whose browser font size
	     is "Large" (20px root): text, padding and the Fields badge are all
	     rem, so they scale by 1.25 together and no padding trim can win
	     (measured: a 371px list in a 329px space at 1440 wide). The row
	     therefore wraps to a second row -- see below.

	     The fifth tab was removable because it was a DUPLICATE, not because
	     space was tight. "Checks" rendered the same `ReviewPanel` as
	     "Overview" with `showOnlyChecks`, and Overview already renders Page
	     Checks below the decision -- so one tab was a strict subset of
	     another, and the subset was the one with its own name. Checks stay
	     where they are most useful: under the decision they inform. Overview
	     is now called "Decision", which is what it holds.

	     The list is `flex-wrap`. It used to be `flex-nowrap overflow-x-auto`
	     with a hidden scrollbar, which left "Analysis" or "Decision" cut off
	     behind a scroller nobody could see. Wrapping keeps every tab visible
	     and needs no script to reveal the active one. `gap-y-2` is there
	     because the line variant's active underline sits 5px below its
	     trigger (`after:bottom-[-5px]`): a smaller row gap would draw a
	     first-row underline on top of the second row. `pb-[5px]` keeps the
	     last row's underline inside the band. The strip is `min-h-12` and
	     `items-start`, so a second row grows the band instead of clipping,
	     and the collapse button stays level with the FIRST row rather than
	     centring itself between two.
	     `h-auto!` is still needed: the `line` variant pins the list to `h-8`
	     via `group-data-horizontal/tabs:h-8`, which outranks a plain `h-auto`. -->
	<!-- `min-h-12`, white, `border-sfds-grey-l2`: the strip is the panel's slice of
	     the workspace's one 48px header band, level with the queue's top row and
	     the canvas toolbar. It used to sit on a grey tint at its own height.
	     Decision comes FIRST: it is what the panel opens on and what the tool
	     exists to record, and it was third. -->
	<div class="flex min-h-12 flex-none items-start gap-1 border-b border-border bg-background pr-2">
		<Tabs.List
			variant="line"
			class="h-auto! min-w-0 flex-1 flex-wrap justify-start gap-x-0 gap-y-2 border-0 bg-transparent px-1 pb-[5px]"
		>
			<Tabs.Trigger value="overview" class="flex-none px-2 py-2 leading-5 max-lg:min-h-11"
				>Decision</Tabs.Trigger
			>
			<Tabs.Trigger value="fields" class="flex-none px-2 py-2 leading-5 max-lg:min-h-11">
				Fields
				{#if pageStore.selectedFieldIds.length > 0}
					<span
						class="ml-1.5 inline-flex size-[1.0625rem] items-center justify-center rounded-full bg-sfds-action text-[0.625rem] font-bold text-white"
					>
						{pageStore.selectedFieldIds.length}
					</span>
				{/if}
			</Tabs.Trigger>
			<Tabs.Trigger value="rethink" class="flex-none px-2 py-2 leading-5 max-lg:min-h-11"
				>Rethink</Tabs.Trigger
			>
			<Tabs.Trigger value="analysis" class="flex-none px-2 py-2 leading-5 max-lg:min-h-11"
				>Analysis</Tabs.Trigger
			>
		</Tabs.List>

		{#if onCollapse}
			<Button
				variant="outline"
				size="icon"
				class="mt-[calc(0.25rem+4px)] size-7 flex-none max-lg:mt-0.5 max-lg:size-11"
				title={collapseLabel}
				aria-label={collapseLabel}
				onclick={onCollapse}
			>
				<ChevronsRight class="size-3.5" />
			</Button>
		{/if}
	</div>

	<Tabs.Content value="fields" class="min-h-0 flex-1 overflow-hidden bg-background">
		<FieldsPanel {pageData} {livePageId} {karlViews} />
	</Tabs.Content>
	<Tabs.Content value="rethink" class="min-h-0 flex-1 overflow-hidden bg-background">
		<RethinkPanel
			{pageData}
			active={activeTab === 'rethink'}
			onGoToDecision={() => (activeTab = 'overview')}
		/>
	</Tabs.Content>
	<Tabs.Content value="overview" class="min-h-0 flex-1 overflow-y-auto bg-background">
		<ReviewPanel {pageData} {karlReadiness} />
	</Tabs.Content>
	<!-- Karl Jr.'s accessibility tests and readability score, computed here.
	     These are NOT the Page Checks shown under the decision: those are
	     `page_checks` rows synced into Supabase by `scripts/sync-checks.ts`,
	     while these are derived from the corpus and the rendered page every
	     time the panel opens. Still two surfaces because they answer to
	     different owners -- a synced check is someone's recorded judgement, an
	     analysis finding is this session's measurement. -->
	<Tabs.Content value="analysis" class="min-h-0 flex-1 overflow-y-auto bg-background">
		<AnalysisPanel {pageData} />
	</Tabs.Content>
</Tabs.Root>
