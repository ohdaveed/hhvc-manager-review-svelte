<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { pageStore } from '$lib/stores/pageData.svelte';

	onMount(() => {
		// There is no landing page yet: the root sends you to the first mockup.
		//
		// This used to fall back to the literal `'agency-service-grouping'`, which
		// is a FILENAME in `$lib/data`, not a routable id -- that module's page
		// derives `departments--healthy-housing-and-vector-control` from its `slug`, so
		// the fallback redirected to a 404. There is nothing to fall back to
		// anyway: `pageStore.pages` is built at construction from the 29 compiled
		// corpus modules, so an empty one means the corpus itself failed to load
		// and no slug would help. Redirecting nowhere beats redirecting to a 404.
		const first = pageStore.pages[0]?.id;
		if (first) goto(resolve('/review/[slug]', { slug: first }));
	});
</script>

<main class="flex min-h-screen items-center justify-center bg-gray-50">
	<p class="text-gray-500">Redirecting to dev workspace...</p>
</main>
