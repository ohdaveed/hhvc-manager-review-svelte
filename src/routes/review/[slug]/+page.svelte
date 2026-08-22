<script lang="ts">
	import { page } from '$app/stores';
	import Page from '$lib/components/Page.svelte';
	import { aboutHhvcTeam } from '$lib/data/about-hhvc-team';
	
	// Temporary mock router logic to pick the page data
	const pageData = $derived($page.params.slug === 'about-hhvc-team' ? aboutHhvcTeam : null);
</script>

{#if pageData}
	<Page page={pageData} />
{:else}
	<div class="p-8 text-center text-gray-500">
		<h2 class="text-xl font-semibold">Page not found</h2>
		<p>No mockup data available for "{$page.params.slug}"</p>
	</div>
{/if}
