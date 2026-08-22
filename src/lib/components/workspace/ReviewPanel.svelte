<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { onDestroy } from 'svelte';
	import {
		updatePageStatus,
		updatePageNotes,
		pagesStore,
		type PageCheck
	} from '$lib/stores/reviewState';

	let { pageData, showOnlyChecks = false } = $props();

	// Find the live record in the store matching the static corpus id
	let liveRecord = $derived($pagesStore.find((p) => p.path === pageData?.id));

	let notesValue = $state('');
	let debounceTimeout: ReturnType<typeof setTimeout> | undefined;
	let lastRecordId = $state<string | undefined>(undefined);
	let notesError = $state(false);

	onDestroy(() => clearTimeout(debounceTimeout));

	// Sync local notesValue unconditionally whenever the live record identity changes
	$effect(() => {
		const id = liveRecord?.id;
		if (id !== lastRecordId) {
			lastRecordId = id;
			notesValue = liveRecord?.manager_notes ?? '';
			notesError = false;
		}
	});

	type Decision = 'needs-review' | 'approved' | 'blocked' | 'revise';

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

		// Capture the page ID and note value now so the callback is bound to
		// the current page even if navigation changes liveRecord before it fires.
		const capturedId = liveRecord?.id;
		const capturedValue = notesValue;
		clearTimeout(debounceTimeout);
		debounceTimeout = setTimeout(async () => {
			if (!capturedId) return;
			notesError = false;
			const saved = await updatePageNotes(capturedId, capturedValue);
			// Only surface the failure if this is still the page on screen and the
			// reviewer has not typed since; otherwise a newer write owns the field.
			if (!saved && lastRecordId === capturedId && notesValue === capturedValue) {
				notesError = true;
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
				<div class="flex items-baseline justify-between gap-2">
					<Label for="notes">Decision Notes</Label>
					{#if notesError}
						<span class="text-destructive text-xs" role="status">Not saved — retry</span>
					{/if}
				</div>
				<Textarea
					id="notes"
					rows={4}
					placeholder="What needs to change before approval?"
					value={notesValue}
					aria-invalid={notesError}
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
