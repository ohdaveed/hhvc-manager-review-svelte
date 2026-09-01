<script lang="ts">
	import { page } from '$app/stores';
	import Page from '$lib/components/Page.svelte';
	import { pageStore } from '$lib/stores/pageData.svelte';

	// `+page.ts` has already rejected any slug the corpus has no page for, so
	// this find always resolves. The not-found branch that used to live here is
	// gone with it -- it rendered inside a 200, and its replacement is
	// `../+error.svelte` behind a real 404.
	const pageData = $derived(pageStore.pages.find((p) => p.id === $page.params.slug));
</script>

{#if pageData}
	<Page page={pageData} />
{/if}
