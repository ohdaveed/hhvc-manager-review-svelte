<script lang="ts">
	import { page } from '$app/stores';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import Page from '$lib/components/Page.svelte';
	import { pageStore } from '$lib/stores/pageData.svelte';

	// Dynamically pick the page data based on slug
	const pageData = $derived(pageStore.pages.find((p) => p.id === $page.params.slug));
</script>

{#if pageData}
	<Page page={pageData} />
{:else}
	<Alert.Root variant="destructive">
		<Alert.Title>Page not found</Alert.Title>
		<Alert.Description>
			No mockup data available for "{$page.params.slug}"
		</Alert.Description>
	</Alert.Root>
{/if}
