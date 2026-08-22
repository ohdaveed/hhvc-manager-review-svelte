<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { updatePageStatus, updatePageNotes, pagesStore } from '$lib/stores/reviewState';

	let { pageData, showOnlyChecks = false } = $props();

	// Find the live record in the store matching the static corpus id
	let liveRecord = $derived($pagesStore.find((p) => p.path === pageData?.id));

	let notesValue = $state('');
	let debounceTimeout: ReturnType<typeof setTimeout>;

	// Sync local notesValue when the page changes
	$effect(() => {
		if (liveRecord && notesValue === '' && liveRecord.manager_notes) {
			notesValue = liveRecord.manager_notes;
		}
	});

	type Decision = 'needs-review' | 'approved' | 'blocked' | 'revise';

	type PageCheck = { status: string; message: string };

	// `tone` keeps the traffic-light reading the hand-rolled pills had. Only the
	// blocked end of it maps onto a shadcn token; the other two are tinted rings.
	const decisions: { value: Decision; label: string; tone: string }[] = [
		{ value: 'approved', label: 'Approve', tone: 'data-[state=on]:ring-2 ring-emerald-500/60' },
		{ value: 'revise', label: 'Revise', tone: 'data-[state=on]:ring-2 ring-amber-500/60' },
		{
			value: 'blocked',
			label: 'Blocked',
			tone: 'text-destructive data-[state=on]:ring-2 ring-destructive/60'
		}
	];

	// ToggleGroup in single mode emits '' when the active item is toggled off;
	// there is no "unset" decision, so that case is ignored rather than written back.
	const handleDecision = (status: string) => {
		if (liveRecord && status) {
			updatePageStatus(liveRecord.id, status as Decision);
		}
	};

	const onNotesInput = (e: Event) => {
		const target = e.target as HTMLTextAreaElement;
		notesValue = target.value;

		clearTimeout(debounceTimeout);
		debounceTimeout = setTimeout(() => {
			if (liveRecord) {
				updatePageNotes(liveRecord.id, notesValue);
			}
		}, 500);
	};
</script>

<div class="flex h-full flex-col">
	{#if !showOnlyChecks}
		<!-- Top Half: Manager Decision -->
		<div class="space-y-4 p-6">
			<h2 class="font-heading text-lg font-bold">Manager Review</h2>

			<div class="space-y-2">
				<span id="decision-label" class="text-sm font-medium">Decision</span>
				<ToggleGroup.Root
					type="single"
					variant="outline"
					size="sm"
					spacing={2}
					aria-labelledby="decision-label"
					value={liveRecord?.status ?? ''}
					onValueChange={handleDecision}
				>
					{#each decisions as decision (decision.value)}
						<ToggleGroup.Item
							value={decision.value}
							aria-label={decision.label}
							class="rounded-4xl {decision.tone}"
						>
							{decision.label}
						</ToggleGroup.Item>
					{/each}
				</ToggleGroup.Root>
			</div>

			<div class="space-y-2">
				<Label for="notes">Decision Notes</Label>
				<Textarea
					id="notes"
					rows={4}
					placeholder="What needs to change before approval?"
					value={notesValue}
					oninput={onNotesInput}
				/>
			</div>
		</div>

		<Separator />
	{/if}

	<!-- Bottom Half: Page Checks -->
	<div class="flex-1 overflow-y-auto p-6 {showOnlyChecks ? '' : 'bg-muted/40'}">
		{#if !showOnlyChecks}
			<h3 class="mb-4 text-sm font-bold">Page Checks</h3>
		{/if}

		{#if liveRecord?.page_checks && Object.keys(liveRecord.page_checks).length > 0}
			<div class="space-y-3">
				{#each Object.entries(liveRecord.page_checks) as [checkId, raw] (checkId)}
					{@const check = raw as PageCheck}
					<Card.Root size="sm">
						<Card.Content class="flex items-start gap-3">
							<Badge variant={check.status === 'pass' ? 'secondary' : 'outline'}>
								{check.status === 'pass' ? 'Pass' : 'Check'}
							</Badge>
							<div>
								<p class="text-sm font-medium capitalize">
									{checkId.replace(/([A-Z])/g, ' $1').trim()}
								</p>
								<p class="text-muted-foreground mt-1 text-xs">{check.message}</p>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{:else}
			<p class="text-muted-foreground text-sm">No checks available for this page.</p>
		{/if}
	</div>
</div>
