<script lang="ts">
	import { resolve } from '$app/paths';
	import { reviewHrefFor } from '$lib/corpus/draftPath';
	import { pageTitleFor } from '$lib/corpus/pageTitle';
	import { draftsStore } from '$lib/stores/draftPages';
	import { pageStore } from '$lib/stores/pageData.svelte';

	// Corpus pages first, then drafts not in `pageStore` (drafting or failed),
	// each named by `pageTitleFor`.
	const titleFor = (path: string) => pageTitleFor(path, pageStore.pages, $draftsStore);
	const inCorpus = (path: string) => pageStore.pages.some((p) => p.id === path);

	const paths = $derived([
		...pageStore.pages.map((p) => p.id),
		...$draftsStore.map((d) => d.path).filter((path) => !inCorpus(path))
	]);
</script>

<section aria-labelledby="all-pages">
	<h2 id="all-pages" class="mb-3 text-lg font-semibold text-slate-900">All pages</h2>
	<ul class="space-y-1">
		{#each paths as path (path)}
			<li>
				<a
					href={resolve(reviewHrefFor(path))}
					class="text-sfds-action underline underline-offset-2"
				>
					{titleFor(path)}
				</a>
			</li>
		{/each}
	</ul>
</section>
