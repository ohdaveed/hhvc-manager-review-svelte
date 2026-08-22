<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { pageStore } from '$lib/stores/pageData.svelte';

	onMount(() => {
		// Bypass Magic Link auth during development
		// Auto-redirect to the first available mockup page (e.g. pestsTopic -> agency-service-grouping)
		const defaultPage = pageStore.pages.length > 0 ? pageStore.pages[0].id : 'agency-service-grouping';
		goto(`/review/${defaultPage}`);
	});
</script>

<main class="flex min-h-screen items-center justify-center bg-gray-50">
	<p class="text-gray-500">Redirecting to dev workspace...</p>
</main>
