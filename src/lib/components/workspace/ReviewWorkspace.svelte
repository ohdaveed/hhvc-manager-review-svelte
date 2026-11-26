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
		onCollapse
	}: {
		pageData: unknown;
		livePageId?: string;
		/** The Karl outline's summary for this page, for the decision panel. */
		karlReadiness?: string | null;
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

	// The tab row scrolls rather than wraps, so the active tab could sit
	// scrolled out of view after a switch from outside (the two effects above)
	// or after the row's layout changes (font size, panel width). Keyboard
	// focus scrolls itself; this covers the rest.
	let tabList = $state<HTMLElement | null>(null);
	$effect(() => {
		void activeTab;
		const list = tabList;
		if (!list) return;
		const reveal = () =>
			list
				.querySelector('[role="tab"][aria-selected="true"]')
				?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
		reveal();
		const observer = new ResizeObserver(reveal);
		observer.observe(list);
		return () => observer.disconnect();
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

	     Four at 16px still WRAP for a reviewer whose browser font size is
	     "Large" (20px root): text, padding and the Fields badge are all rem,
	     so they scale by 1.25 together and no padding trim can win. The row
	     therefore scrolls instead of wrapping -- see below.

	     The fifth tab was removable because it was a DUPLICATE, not because
	     space was tight. "Checks" rendered the same `ReviewPanel` as
	     "Overview" with `showOnlyChecks`, and Overview already renders Page
	     Checks below the decision -- so one tab was a strict subset of
	     another, and the subset was the one with its own name. Checks stay
	     where they are most useful: under the decision they inform. Overview
	     is now called "Decision", which is what it holds.

	     The list is `flex-nowrap overflow-x-auto`. `overflow-x` forces
	     `overflow-y` to auto, and the line variant's active underline sits 5px
	     below the trigger (`after:bottom-[-5px]`) while the list's own bottom
	     padding is 3px, so `pb-[5px]` gives it room and `overflow-y-hidden`
	     stops a stray 2px vertical scroll. The scrollbar is hidden: a cut-off
	     tab is the affordance, keyboard focus scrolls itself, and the effect
	     in the script scrolls a programmatically selected tab into view.
	     `h-auto!` is still needed: the `line` variant pins the list to `h-8`
	     via `group-data-horizontal/tabs:h-8`, which outranks a plain `h-auto`. -->
	<!-- `h-12`, white, `border-sfds-grey-l2`: the strip is the panel's slice of
	     the workspace's one 48px header band, level with the queue's top row and
	     the canvas toolbar. It used to sit on a grey tint at its own height.
	     Decision comes FIRST: it is what the panel opens on and what the tool
	     exists to record, and it was third. -->
	<div
		class="flex h-12 flex-none items-center gap-1 border-b border-sfds-grey-l2 bg-background pr-2"
	>
		<Tabs.List
			variant="line"
			bind:ref={tabList}
			class="h-auto! min-w-0 flex-1 [scrollbar-width:none] flex-nowrap justify-start gap-0 overflow-x-auto overflow-y-hidden border-0 bg-transparent px-1 pb-[5px]"
		>
			<Tabs.Trigger value="overview" class="flex-none px-2 py-2.5">Decision</Tabs.Trigger>
			<Tabs.Trigger value="fields" class="flex-none px-2 py-2.5">
				Fields
				{#if pageStore.selectedFieldIds.length > 0}
					<span
						class="ml-1.5 inline-flex size-[17px] items-center justify-center rounded-full bg-sfds-action text-[10px] font-bold text-white"
					>
						{pageStore.selectedFieldIds.length}
					</span>
				{/if}
			</Tabs.Trigger>
			<Tabs.Trigger value="rethink" class="flex-none px-2 py-2.5">Rethink</Tabs.Trigger>
			<Tabs.Trigger value="analysis" class="flex-none px-2 py-2.5">Analysis</Tabs.Trigger>
		</Tabs.List>

		{#if onCollapse}
			<Button
				variant="outline"
				size="icon"
				class="size-7 flex-none"
				title="Collapse review panel"
				aria-label="Collapse review panel"
				onclick={onCollapse}
			>
				<ChevronsRight class="size-3.5" />
			</Button>
		{/if}
	</div>

	<Tabs.Content value="fields" class="min-h-0 flex-1 overflow-hidden bg-background">
		<FieldsPanel {pageData} {livePageId} />
	</Tabs.Content>
	<Tabs.Content value="rethink" class="min-h-0 flex-1 overflow-hidden bg-background">
		<RethinkPanel {pageData} />
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
