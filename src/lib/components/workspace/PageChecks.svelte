<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Check, CircleAlert } from '@lucide/svelte';
	import { pagesStore, type PageCheck } from '$lib/stores/reviewState';

	let { pageId }: { pageId?: string } = $props();

	const checks = $derived(
		Object.entries($pagesStore.find((p) => p.path === pageId)?.page_checks ?? {})
	);
</script>

<!-- The synced `page_checks` rows: someone's recorded judgement, as opposed to
     the analysis above them, which is this session's measurement. They sat
     under the decision; they are on the Fix tab now, with the other things to
     put right before deciding. Nothing renders when a page has none. -->
{#if checks.length > 0}
	<section class="space-y-3 px-4 pb-4" aria-labelledby="page-checks">
		<h3 id="page-checks" class="text-sm font-bold">Page checks</h3>
		{#each checks as [checkId, raw] (checkId)}
			{@const check = raw as PageCheck}
			<Card.Root size="sm">
				<Card.Content class="flex items-start gap-3">
					<Badge
						variant="outline"
						class="gap-1 border-transparent {check.status === 'pass'
							? 'bg-sfds-green-l1 text-sfds-green'
							: 'bg-sfds-amber-l1 text-sfds-amber'}"
					>
						{#if check.status === 'pass'}
							<Check class="size-3" aria-hidden="true" />
						{:else}
							<CircleAlert class="size-3" aria-hidden="true" />
						{/if}
						{check.status === 'pass' ? 'Pass' : 'Check'}
					</Badge>
					<div>
						<p class="text-sm font-medium capitalize">
							{checkId.replace(/([A-Z])/g, ' $1').trim()}
						</p>
						<p class="mt-1 text-xs text-sfds-slate-l3">{check.message}</p>
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
	</section>
{/if}
