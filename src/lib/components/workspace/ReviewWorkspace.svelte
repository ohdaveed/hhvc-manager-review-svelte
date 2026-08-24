<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ChevronsRight } from 'lucide-svelte';
	import ReviewPanel from './ReviewPanel.svelte';
	import HelpPanel from './HelpPanel.svelte';
	import FieldsPanel from './FieldsPanel.svelte';
	import RethinkPanel from './RethinkPanel.svelte';
	import { pageStore } from '$lib/stores/pageData.svelte';

	let {
		pageData,
		livePageId,
		onCollapse
	}: { pageData: unknown; livePageId?: string; onCollapse?: () => void } = $props();

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
</script>

<Tabs.Root
	bind:value={activeTab}
	id="reviewWorkspace"
	class="review-workspace flex h-full min-h-0 flex-col gap-0"
	aria-label="Review workspace"
>
	<div class="bg-muted/40 flex items-center gap-1 border-b pr-2">
		<Tabs.List
			variant="line"
			class="min-w-0 flex-1 justify-start gap-0 border-0 bg-transparent px-2"
		>
			<Tabs.Trigger value="fields" class="flex-none px-3 py-3">
				Fields
				{#if pageStore.selectedFieldIds.length > 0}
					<span
						class="bg-sfds-action ml-1.5 inline-flex size-[17px] items-center justify-center rounded-full text-[10px] font-bold text-white"
					>
						{pageStore.selectedFieldIds.length}
					</span>
				{/if}
			</Tabs.Trigger>
			<Tabs.Trigger value="rethink" class="flex-none px-3 py-3">Rethink</Tabs.Trigger>
			<Tabs.Trigger value="overview" class="flex-none px-3 py-3">Overview</Tabs.Trigger>
			<Tabs.Trigger value="checks" class="flex-none px-3 py-3">Checks</Tabs.Trigger>
			<Tabs.Trigger value="help" class="flex-none px-3 py-3">Help</Tabs.Trigger>
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

	<Tabs.Content value="fields" class="bg-background min-h-0 flex-1 overflow-hidden">
		<FieldsPanel {pageData} {livePageId} />
	</Tabs.Content>
	<Tabs.Content value="rethink" class="bg-background min-h-0 flex-1 overflow-hidden">
		<RethinkPanel {pageData} />
	</Tabs.Content>
	<Tabs.Content value="overview" class="bg-background min-h-0 flex-1 overflow-y-auto">
		<ReviewPanel {pageData} />
	</Tabs.Content>
	<Tabs.Content value="checks" class="bg-background min-h-0 flex-1 overflow-y-auto">
		<ReviewPanel {pageData} showOnlyChecks={true} />
	</Tabs.Content>
	<Tabs.Content value="help" class="bg-background min-h-0 flex-1 overflow-y-auto">
		<HelpPanel {pageData} />
	</Tabs.Content>
</Tabs.Root>
