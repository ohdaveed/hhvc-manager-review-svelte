<script lang="ts">
	import { onMount } from 'svelte';
	import ReviewQueue from '$lib/components/workspace/ReviewQueue.svelte';
	import ReviewPanel from '$lib/components/workspace/ReviewPanel.svelte';
	import ActionBar from '$lib/components/workspace/ActionBar.svelte';
	let { children } = $props();

	// Mock state for the active editing field
	let activeField = $state<any>(null);

	// To simulate the interaction for the mockup, automatically select a field after 2 seconds
	onMount(() => {
		setTimeout(() => {
			activeField = { name: 'Introduction', content: 'Healthy Housing and Vector Control is the Environmental Health team that inspects housing conditions and responds to pest and vector reports in San Francisco.' };
		}, 2000);
	});
</script>

<div class="h-screen w-full bg-gray-50 overflow-hidden text-gray-900 grid grid-cols-[250px_1fr_300px]">
	
	<!-- Left Sidebar: Global Navigation & Review Queue -->
	<aside class="h-full border-r border-gray-200 bg-white flex flex-col">
		<div class="p-4 border-b border-gray-200">
			<div class="text-xs font-semibold uppercase text-gray-500 tracking-wider">SFDS rebuild</div>
			<h2 class="text-lg font-bold mt-1">HHVC mockup review</h2>
		</div>
		<div class="flex-1 overflow-y-auto p-4">
			<ReviewQueue />
		</div>
		<div class="p-4 border-t border-gray-200 text-sm text-gray-600">
			<button class="w-full text-left hover:text-blue-600">Export Data &rarr;</button>
		</div>
	</aside>
	
	<!-- Center Canvas: The Mockup -->
	<main class="h-full flex flex-col relative bg-gray-100 overflow-hidden">
		<!-- Toolbar (Top) -->
		<nav class="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shadow-sm">
			<div class="text-sm text-gray-600">https://sf.gov/</div>
			<div class="flex items-center gap-2 text-sm">
				<label for="tagToggle" class="cursor-pointer font-medium">Karl tags</label>
				<input id="tagToggle" type="checkbox" class="toggle toggle-primary toggle-sm" />
			</div>
		</nav>
		
		<!-- Scrollable Mockup Container -->
		<div class="flex-1 overflow-y-auto p-8 flex justify-center">
			<figure class="w-full max-w-4xl bg-white shadow-md border border-gray-200 min-h-full pb-32">
				<!-- Legacy SF.gov Header -->
				<header class="bg-[#002f6c] text-white p-4 flex items-center justify-between">
					<div class="font-bold text-xl">SF.gov</div>
					<div class="text-sm flex gap-4">
						<span>Services</span>
						<span>Departments</span>
					</div>
				</header>
				
				<!-- Page specific content -->
				<div id="mockPage" class="p-8">
					{@render children()}
				</div>
				
				<!-- Legacy SF.gov Footer -->
				<footer class="bg-gray-100 p-8 border-t border-gray-200 mt-12">
					<div class="font-bold">City and County of San Francisco</div>
				</footer>
			</figure>
		</div>

		<!-- Action Bar (Sticky at bottom of center canvas) -->
		<div id="actionBarContainer" class="absolute bottom-0 left-0 w-full p-4 pointer-events-none flex justify-center pb-6">
			<ActionBar 
				{activeField} 
				onCancel={() => activeField = null} 
				onSave={(val) => { console.log('Saved:', val); activeField = null; }} 
			/>
		</div>
	</main>
	
	<!-- Right Sidebar: Contextual Manager Review & Checks -->
	<section class="h-full border-l border-gray-200 bg-white flex flex-col overflow-y-auto">
		<ReviewPanel />
	</section>
</div>
