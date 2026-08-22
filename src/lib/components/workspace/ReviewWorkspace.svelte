<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import ReviewPanel from './ReviewPanel.svelte';
	import HelpPanel from './HelpPanel.svelte';

	let { pageData } = $props();

	let activeTab = $state('overview');
</script>

<Tabs.Root
	bind:value={activeTab}
	id="reviewWorkspace"
	class="review-workspace flex h-full flex-col gap-0"
	aria-label="Review workspace"
>
	<Tabs.List variant="line" class="bg-muted/40 w-full justify-start gap-0 border-b px-2">
		<Tabs.Trigger value="overview" class="flex-none px-4 py-3">Overview</Tabs.Trigger>
		<Tabs.Trigger value="checks" class="flex-none px-4 py-3">Page checks</Tabs.Trigger>
		<Tabs.Trigger value="help" class="flex-none px-4 py-3">Help</Tabs.Trigger>
	</Tabs.List>

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
