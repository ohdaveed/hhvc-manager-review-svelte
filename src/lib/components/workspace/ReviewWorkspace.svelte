<script lang="ts">
	import { writable } from 'svelte/store';
	import ReviewPanel from './ReviewPanel.svelte';
	import HelpPanel from './HelpPanel.svelte';

	let { pageData } = $props();

	// Store for active tab: 'overview', 'checks', or 'help'
	let activeTab = writable('overview');
</script>

<section id="reviewWorkspace" class="review-workspace h-full flex flex-col" aria-label="Review workspace">
	<nav class="flex border-b border-gray-200 bg-gray-50" role="tablist">
		<button
			class="px-4 py-3 text-sm font-medium border-b-2 transition-colors { $activeTab === 'overview' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100' }"
			aria-selected={$activeTab === 'overview'}
			onclick={() => ($activeTab = 'overview')}
			role="tab"
		>
			Overview
		</button>
		<button
			class="px-4 py-3 text-sm font-medium border-b-2 transition-colors { $activeTab === 'checks' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100' }"
			aria-selected={$activeTab === 'checks'}
			onclick={() => ($activeTab = 'checks')}
			role="tab"
		>
			Page checks
		</button>
		<button
			class="px-4 py-3 text-sm font-medium border-b-2 transition-colors { $activeTab === 'help' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100' }"
			aria-selected={$activeTab === 'help'}
			onclick={() => ($activeTab = 'help')}
			role="tab"
		>
			Help
		</button>
	</nav>

	<div class="flex-1 overflow-y-auto bg-white">
		{#if $activeTab === 'overview'}
			<ReviewPanel />
		{:else if $activeTab === 'checks'}
			<div class="p-4 text-center text-gray-500 mt-8">
				<p>Page checks logic to be ported.</p>
			</div>
		{:else if $activeTab === 'help'}
			<HelpPanel {pageData} />
		{/if}
	</div>
</section>
