<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { pagesStore } from '$lib/stores/reviewState';

	// The store automatically updates via Supabase realtime subscriptions
	const groups = [
		{ status: 'needs-review', heading: 'Needs Review', dot: 'bg-blue-500' },
		{ status: 'approved', heading: 'Approved', dot: 'bg-emerald-500' },
		{ status: 'revise', heading: 'Needs Revision', dot: 'bg-amber-500' },
		{ status: 'blocked', heading: 'Blocked', dot: 'bg-destructive' }
	];
</script>

<nav class="space-y-6" aria-label="Review queue">
	<!-- If empty (e.g. testing without DB), show a fallback message -->
	{#if $pagesStore.length === 0}
		<p class="text-muted-foreground text-sm italic">No pages loaded. (Waiting for Supabase data)</p>
	{/if}

	{#each groups as group, i (group.status)}
		{@const pages = $pagesStore.filter((p) => p.status === group.status)}
		{#if i > 0}
			<Separator />
		{/if}
		<section>
			<h3 class="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase">
				{group.heading}
			</h3>
			<ul class="space-y-1">
				{#each pages as page (page.path)}
					<li>
						<Button
							href="/review/{page.path}"
							variant="ghost"
							class="w-full justify-start font-normal"
						>
							<span class="mr-2 inline-block size-2 shrink-0 rounded-full {group.dot}"></span>
							{page.title}
						</Button>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</nav>
