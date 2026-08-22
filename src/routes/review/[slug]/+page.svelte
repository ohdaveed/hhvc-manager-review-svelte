<script lang="ts">
	import { page } from '$app/stores';
	import Page from '$lib/components/Page.svelte';
	import { pageStore } from '$lib/stores/pageData.svelte';
	
	// Dynamically pick the page data based on slug
	const pageData = $derived(pageStore.pages.find(p => p.id === $page.params.slug));
</script>

{#if pageData}
	<Page page={pageData} />
{:else}
	<div class="p-8 text-center text-gray-500">
		<h2 class="text-xl font-semibold">Page not found</h2>
		<p>No mockup data available for "{$page.params.slug}"</p>
	</div>
{/if}
