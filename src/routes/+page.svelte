<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { pageStore } from '$lib/stores/pageData.svelte';
	import { fetchFirstQueuePath } from '$lib/stores/reviewState';

	onMount(async () => {
		// There is no landing page yet: the root sends you to the queue's first
		// row, the same page the toolbar's "First page" link names.
		//
		// This used to go to `pageStore.pages[0]`, which is CORPUS order -- row 38
		// of 39 in the queue, below the fold, so the sidebar never showed the page
		// being reviewed. The queue's order comes from the review, so fetch just
		// that (`fetchFirstQueuePath`). An earlier version ran the whole
		// `loadReview()` here, opening and closing a realtime channel, fetching
		// every edit, and logging "No review found" a second time when signed out.
		//
		// Signed out, or Supabase unreachable, the review is empty and corpus order
		// is the only order there is. An empty corpus means the corpus itself
		// failed to load, and redirecting nowhere beats redirecting to a 404.
		let first: string | undefined;
		try {
			first = await fetchFirstQueuePath();
		} catch {
			// Fall through to corpus order.
		}
		first ??= pageStore.pages[0]?.id;
		if (first) goto(resolve('/review/[slug]', { slug: first }), { replaceState: true });
	});
</script>

<main class="flex min-h-screen items-center justify-center bg-gray-50">
	<p class="text-gray-500">Redirecting to dev workspace...</p>
</main>
