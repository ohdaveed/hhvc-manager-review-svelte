<script lang="ts">
	import { resolve } from '$app/paths';
	import { reviewHrefFor } from '$lib/corpus/draftPath';
	import { draftsStore } from '$lib/stores/draftPages';
	import { pageStore } from '$lib/stores/pageData.svelte';

	// A ready draft is in `pageStore` under its `draft.path`, with the model's
	// real title. A drafting or failed one is not (`mergeDraftPages` skips it),
	// so `draftsStore` is the only source of its name. Corpus pages first, then
	// those drafts, each named by the same lookup the queue uses.
	const corpusFor = (path: string) => pageStore.pages.find((p) => p.id === path);
	const draftFor = (path: string) => $draftsStore.find((d) => d.path === path);
	const titleFor = (path: string) => corpusFor(path)?.title ?? draftFor(path)?.title ?? path;

	const paths = $derived([
		...pageStore.pages.map((p) => p.id),
		...$draftsStore.map((d) => d.path).filter((path) => !corpusFor(path))
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
