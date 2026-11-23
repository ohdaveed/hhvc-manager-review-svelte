<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';

	let {
		decided,
		total,
		nextHref,
		nextTitle
	}: {
		decided: number;
		total: number;
		nextHref: `/review/${string}` | undefined;
		nextTitle: string | undefined;
	} = $props();
</script>

<section aria-label="Your progress" class="flex flex-wrap items-center justify-between gap-4">
	<p class="text-lg font-medium text-slate-900">{decided} of {total} decided</p>
	{#if nextHref}
		<Button href={resolve(nextHref)} size="lg" class="px-6">Continue to {nextTitle}</Button>
	{:else}
		<p class="text-slate-700">Every page has a decision.</p>
	{/if}
</section>
