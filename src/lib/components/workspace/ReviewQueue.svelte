<script lang="ts">
	import { pagesStore } from '$lib/stores/reviewState';
	
	// The store automatically updates via Supabase realtime subscriptions
</script>

<div class="space-y-6">
	<!-- If empty (e.g. testing without DB), show a fallback message -->
	{#if $pagesStore.length === 0}
		<p class="text-sm text-gray-500 italic">No pages loaded. (Waiting for Supabase data)</p>
	{/if}

	<div>
		<h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Needs Review</h3>
		<ul class="space-y-1">
			{#each $pagesStore.filter(p => p.status === 'needs-review') as page}
				<li>
					<a href="/review/{page.path}" class="block px-3 py-2 text-sm rounded bg-blue-50 text-blue-700 font-medium">
						<span class="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
						{page.title}
					</a>
				</li>
			{/each}
		</ul>
	</div>

	<div>
		<h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Approved</h3>
		<ul class="space-y-1">
			{#each $pagesStore.filter(p => p.status === 'approved') as page}
				<li>
					<a href="/review/{page.path}" class="block px-3 py-2 text-sm rounded hover:bg-gray-50 text-gray-700">
						<span class="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
						{page.title}
					</a>
				</li>
			{/each}
		</ul>
	</div>

	<div>
		<h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Blocked</h3>
		<ul class="space-y-1">
			{#each $pagesStore.filter(p => p.status === 'blocked') as page}
				<li>
					<a href="/review/{page.path}" class="block px-3 py-2 text-sm rounded hover:bg-gray-50 text-gray-700">
						<span class="inline-block w-2 h-2 rounded-full bg-red-500 mr-2"></span>
						{page.title}
					</a>
				</li>
			{/each}
		</ul>
	</div>
</div>
