<script lang="ts">
	import Page from '$lib/components/Page.svelte';
	import DraftBanner from '$lib/components/workspace/DraftBanner.svelte';
	import { draftPathFor } from '$lib/corpus/draftPath';
	import { draftsStore } from '$lib/stores/draftPages';
	import { pageStore } from '$lib/stores/pageData.svelte';

	let { data } = $props();

	const draft = $derived($draftsStore.find((d) => d.id === data.id));
	// Only a `ready` draft has a store entry; drafting and failed ones show the
	// banner alone.
	const pageData = $derived(pageStore.pages.find((p) => p.id === draftPathFor(data.id)));
</script>

<svelte:head>
	<title
		>{draft ? `Draft: ${draft.title} · HHVC mockup review` : 'Draft · HHVC mockup review'}</title
	>
</svelte:head>

{#if draft}
	<DraftBanner {draft} />
	{#if pageData}
		<Page page={pageData} />
	{:else}
		<!-- No page to carry a heading yet, so without this the route has none. -->
		<h1 class="px-5 pt-4 text-xl font-bold text-sfds-black">{draft.title}</h1>
	{/if}
{:else}
	<p class="p-6 text-sm text-sfds-slate-l3">
		Loading draft… If this stays, the draft was not found.
	</p>
{/if}
