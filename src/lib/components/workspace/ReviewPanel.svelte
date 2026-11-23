<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { onDestroy } from 'svelte';
	import { resolve } from '$app/paths';
	import { ArrowRight } from 'lucide-svelte';
	import { pageStore } from '$lib/stores/pageData.svelte';
	import {
		updatePageStatus,
		updatePageNotes,
		nextUndecidedPath,
		pagesStore,
		type PageCheck
	} from '$lib/stores/reviewState';

	let { pageData } = $props();

	// Where "Next undecided" goes. Only meaningful once a review has loaded:
	// with no live rows (signed out) there is nothing to move on to.
	const nextPath = $derived(pageData?.id ? nextUndecidedPath($pagesStore, pageData.id) : undefined);
	const nextTitle = $derived(pageStore.pages.find((p) => p.id === nextPath)?.title ?? '');

	// Find the live record in the store matching the static corpus id
	let liveRecord = $derived($pagesStore.find((p) => p.path === pageData?.id));

	let notesValue = $state('');
	let debounceTimeout: ReturnType<typeof setTimeout> | undefined;
	let lastRecordId = $state<string | undefined>(undefined);
	let notesError = $state(false);

	// Cancelling on teardown silently threw away whatever the reviewer had typed
	// in the last 500ms before navigating. Flush it instead.
	let pendingNote: { pageId: string; value: string } | null = null;

	onDestroy(() => {
		clearTimeout(debounceTimeout);
		if (pendingNote) updatePageNotes(pendingNote.pageId, pendingNote.value);
	});

	// Sync local notesValue unconditionally whenever the live record identity changes
	$effect(() => {
		const id = liveRecord?.id;
		if (id !== lastRecordId) {
			lastRecordId = id;
			notesValue = liveRecord?.manager_notes ?? '';
			notesError = false;
			pendingNote = null;
		}
	});

	type Decision = 'needs-review' | 'approved' | 'blocked' | 'revise';

	// `tone` keeps the traffic-light reading the hand-rolled pills had. Only the
	// blocked end of it maps onto a shadcn token; the others are tinted rings.
	//
	// FOUR options, not three. `needs-review` is a real state -- it is what
	// every seeded row starts as -- and leaving it off the control made a
	// decision one-way. MEASURED before this change: clicking Approve wrote
	// `{"status":"approved"}`; clicking Approve again put all three pills in
	// `data-state="off"`, sent NO write, and left the queue row under
	// "Approved". The control reported "no decision recorded" while the
	// database still said approved, which is the wrong direction to be wrong
	// in for a tool whose output is which pages may publish.
	//
	// Listing the state fixes both halves at once: there is a way back from a
	// misclick, and there is no longer an unrepresentable state to deselect
	// into. Labels are all noun-phrases describing the state the page is IN,
	// rather than the old mix of two verbs and an adjective.
	const decisions: { value: Decision; label: string; tone: string }[] = [
		{
			value: 'needs-review',
			label: 'Needs review',
			tone: 'data-[state=on]:ring-2 ring-sfds-action/60'
		},
		{ value: 'approved', label: 'Approved', tone: 'data-[state=on]:ring-2 ring-emerald-500/60' },
		{ value: 'revise', label: 'Revise', tone: 'data-[state=on]:ring-2 ring-amber-500/60' },
		{
			value: 'blocked',
			label: 'Blocked',
			tone: 'text-destructive data-[state=on]:ring-2 ring-destructive/60'
		}
	];

	// The RENDERED decision, kept in step with the stored row.
	//
	// `bind:value` is what makes the group controlled. Handed a one-way
	// `value={...}` the bits-ui primitive keeps its own copy once the reviewer
	// clicks, and no later render can correct it -- that is the mechanism
	// behind the desync above, not the missing option on its own.
	let decision = $state('');
	let syncedFrom = $state<string | undefined>(undefined);
	$effect(() => {
		// Keyed on id AND status so a rollback (which restores the old status
		// on the same row) re-syncs, not just a navigation to another page.
		const key = `${liveRecord?.id ?? ''}:${liveRecord?.status ?? ''}`;
		if (key !== syncedFrom) {
			syncedFrom = key;
			decision = liveRecord?.status ?? '';
		}
	});

	let decisionError = $state(false);

	const handleDecision = async (status: string) => {
		if (!liveRecord) return;
		// Toggling the active item off. There is no unset decision, so put the
		// control back where the record is instead of writing an empty status.
		if (!status) {
			decision = liveRecord.status ?? '';
			return;
		}
		if (status === liveRecord.status) return;
		decisionError = false;
		const saved = await updatePageStatus(liveRecord.id, status as Decision);
		// The optimistic update already moved the queue row; on failure the
		// store rolls back, the `$effect` above pulls `decision` with it, and
		// this is the only thing that tells the reviewer their click was lost.
		if (!saved) decisionError = true;
	};

	/** Re-send the note the debounce already gave up on. */
	const retryNotes = async () => {
		const id = liveRecord?.id;
		if (!id) return;
		notesError = false;
		const saved = await updatePageNotes(id, notesValue);
		if (!saved && lastRecordId === id) notesError = true;
	};

	const onNotesInput = (e: Event) => {
		const target = e.target as HTMLTextAreaElement;
		notesValue = target.value;

		// Capture the page ID and note value now so the callback is bound to
		// the current page even if navigation changes liveRecord before it fires.
		const capturedId = liveRecord?.id;
		const capturedValue = notesValue;
		if (!capturedId) return;
		clearTimeout(debounceTimeout);
		pendingNote = { pageId: capturedId, value: capturedValue };
		debounceTimeout = setTimeout(async () => {
			if (!capturedId) return;
			pendingNote = null;
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
	<!-- Top: the decision itself -->
	<div class="space-y-4 p-6">
		<h2 class="font-heading text-lg font-bold">Manager Review</h2>

		<div class="space-y-2">
			<div class="flex items-baseline justify-between gap-2">
				<span id="decision-label" class="text-sm font-medium">Decision</span>
				{#if decisionError}
					<span class="text-xs text-destructive" role="alert">Not saved — try again</span>
				{/if}
			</div>
			<ToggleGroup.Root
				type="single"
				variant="outline"
				size="sm"
				spacing={2}
				class="flex-wrap"
				aria-labelledby="decision-label"
				bind:value={decision}
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
				<Label for="notes">Decision notes</Label>
				{#if notesError}
					<!-- Was a `<span>` reading "Not saved — retry": it named an
						     action the UI did not offer, leaving the reviewer to
						     re-type a character to re-arm the debounce. Now the word
						     is the control. -->
					<button
						type="button"
						class="text-xs font-semibold text-destructive underline underline-offset-2"
						onclick={retryNotes}
					>
						Not saved — retry
					</button>
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

		{#if nextPath}
			<a
				href={resolve('/review/[slug]', { slug: nextPath })}
				class="flex items-center justify-between gap-3 rounded-md border border-sfds-action/40 px-3 py-2 text-sm font-semibold text-sfds-action hover:bg-sfds-blue-l1/60"
			>
				<span class="min-w-0">
					<span class="block">Next undecided page</span>
					<span class="block truncate text-xs font-normal text-sfds-slate-l3">{nextTitle}</span>
				</span>
				<ArrowRight class="size-4 shrink-0" aria-hidden="true" />
			</a>
		{:else if liveRecord}
			<p class="text-sm text-sfds-slate-l3">
				{liveRecord.status === 'needs-review'
					? 'This is the last page without a decision.'
					: 'Every page has a decision.'}
			</p>
		{/if}
	</div>

	<Separator />

	<!-- Bottom: the checks that inform it. These used to ALSO be reachable
	     through a "Checks" tab rendering this same component with
	     `showOnlyChecks`, which made one tab a strict subset of another. The
	     tab is gone; this is the single home for them, directly under the
	     decision they bear on. -->
	<div class="flex-1 overflow-y-auto bg-muted/40 p-6">
		<h3 class="mb-4 text-sm font-bold">Page checks</h3>

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
								<p class="mt-1 text-xs text-muted-foreground">{check.message}</p>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">No checks available for this page.</p>
		{/if}
	</div>
</div>
