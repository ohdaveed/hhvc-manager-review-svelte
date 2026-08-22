<script lang="ts">
	import { writable } from 'svelte/store';
	import ChecksPanel from './ChecksPanel.svelte';

	// Store for active tab: 'overview', 'checks', or 'help'
	let activeTab = writable('overview');
</script>

<section id="reviewWorkspace" class="review-workspace" aria-label="Review workspace">
	<nav class="review-workspace-tabs" id="reviewWorkspaceTabs" role="tablist">
		<button
			class="review-workspace-tab"
			class:active={$activeTab === 'overview'}
			aria-selected={$activeTab === 'overview'}
			onclick={() => ($activeTab = 'overview')}
			role="tab"
		>
			Overview
		</button>
		<button
			class="review-workspace-tab"
			class:active={$activeTab === 'checks'}
			aria-selected={$activeTab === 'checks'}
			onclick={() => ($activeTab = 'checks')}
			role="tab"
		>
			Page checks
		</button>
		<button
			class="review-workspace-tab"
			class:active={$activeTab === 'help'}
			aria-selected={$activeTab === 'help'}
			onclick={() => ($activeTab = 'help')}
			role="tab"
		>
			Help
		</button>
	</nav>

	<!-- Overview Panel -->
	{#if $activeTab === 'overview'}
		<div class="review-workspace-panel" role="tabpanel" id="reviewWorkspaceOverview">
			<!-- ReviewQueue component will go here -->
			<div class="p-4 text-gray-500">
				<h3>Overview / Review Queue</h3>
				<p>List of pages and their review status will render here.</p>
			</div>
		</div>
	{/if}

	<!-- Checks Panel -->
	{#if $activeTab === 'checks'}
		<div class="review-workspace-panel review-checks-panel" role="tabpanel" id="reviewChecksPanel">
			<ChecksPanel />
		</div>
	{/if}

	<!-- Help Panel -->
	{#if $activeTab === 'help'}
		<div class="review-workspace-panel" role="tabpanel" id="reviewWorkspaceHelp">
			<div class="review-advanced">
				<details class="review-advanced-group">
					<summary>Draft content with AI</summary>
					<div>AI Assist controls</div>
				</details>
				<details class="review-advanced-group">
					<summary>Stored review data on this browser</summary>
					<div>Data sync/export controls</div>
				</details>
				<details class="review-advanced-group">
					<summary>Pages added and deleted</summary>
					<div>Page manager</div>
				</details>
			</div>
		</div>
	{/if}
</section>
