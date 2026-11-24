<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { onDestroy } from 'svelte';
	import { resolve } from '$app/paths';
	import { reviewHrefFor } from '$lib/corpus/draftPath';
	import { draftsStore } from '$lib/stores/draftPages';
	import { pageTitleFor } from '$lib/corpus/pageTitle';
	import { ArrowRight } from '@lucide/svelte';
	import { pageStore } from '$lib/stores/pageData.svelte';
	import { sessionStore } from '$lib/stores/session.svelte';
	import { STATUS_LABELS } from '$lib/review/statusLabels';
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
	const nextTitle = $derived(
		nextPath ? pageTitleFor(nextPath, pageStore.pages, $draftsStore, 'empty') : ''
	);

	// Find the live record in the store matching the static corpus id
	let liveRecord = $derived($pagesStore.find((p) => p.path === pageData?.id));
	const checks = $derived(Object.entries(liveRecord?.page_checks ?? {}));

	let notesValue = $state('');
	let debounceTimeout: ReturnType<typeof setTimeout> | undefined;
	let lastRecordId = $state<string | undefined>(undefined);
	let notesError = $state(false);
	// Success feedback for the autosave. Failures already had `notesError`;
	// before this a successful save showed nothing at all.
	let notesStatus = $state<'idle' | 'saving' | 'saved'>('idle');
	let savedTimeout: ReturnType<typeof setTimeout> | undefined;

	const markSaved = () => {
		notesStatus = 'saved';
		clearTimeout(savedTimeout);
		savedTimeout = setTimeout(() => (notesStatus = 'idle'), 3000);
	};

	// Cancelling on teardown silently threw away whatever the reviewer had typed
	// in the last 500ms before navigating. Flush it instead.
	let pendingNote: { pageId: string; value: string } | null = null;

	onDestroy(() => {
		clearTimeout(debounceTimeout);
		clearTimeout(savedTimeout);
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
			// A write still in flight for the page just left must not report
			// "Saved" here; the guards below also check `lastRecordId`.
			clearTimeout(savedTimeout);
			notesStatus = 'idle';
		}
	});

	type Decision = 'needs-review' | 'approved' | 'blocked' | 'revise';

	// `tone` keeps the traffic-light reading the hand-rolled pills had, as a
	// FILLED selected state: a faint ring was the only cue before, and in a
	// ~380px panel it was easy to miss. Each fill carries white text at >=4.5:1
	// (sfds-action 5.5, emerald-700 5.4, amber-700 5.0, destructive 4.8), and
	// the hover override keeps the outline variant's `hover:bg-muted` from
	// washing out the selected item.
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
	//
	// The LABELS are `STATUS_LABELS[].decisionLabel`, shared with the queue and
	// the landing page. `tone` stays here: it is the toggle's filled selected
	// state, written against `data-[state=on]` and this control's hover
	// override, and it is not the badge colour (white on a solid fill, where a
	// badge is a solid foreground on a tint).
	const decisions: { value: Decision; label: string; tone: string }[] = (
		[
			{
				value: 'needs-review',
				tone: 'data-[state=on]:border-sfds-action data-[state=on]:bg-sfds-action data-[state=on]:hover:bg-sfds-action'
			},
			{
				value: 'approved',
				tone: 'data-[state=on]:border-emerald-700 data-[state=on]:bg-emerald-700 data-[state=on]:hover:bg-emerald-700'
			},
			{
				value: 'revise',
				tone: 'data-[state=on]:border-amber-700 data-[state=on]:bg-amber-700 data-[state=on]:hover:bg-amber-700'
			},
			{
				value: 'blocked',
				tone: 'text-destructive data-[state=on]:border-destructive data-[state=on]:bg-destructive data-[state=on]:hover:bg-destructive'
			}
		] satisfies { value: Decision; tone: string }[]
	).map((d) => ({ ...d, label: STATUS_LABELS[d.value].decisionLabel }));

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
		// No row to write to (signed out, or no review record). The controls are
		// disabled then, but never let the bound value show an unsaved choice.
		if (!liveRecord) {
			decision = '';
			return;
		}
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
		notesStatus = 'saving';
		const saved = await updatePageNotes(id, notesValue);
		if (lastRecordId !== id) return;
		if (saved) markSaved();
		else {
			notesError = true;
			notesStatus = 'idle';
		}
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
		clearTimeout(savedTimeout);
		notesStatus = 'saving';
		pendingNote = { pageId: capturedId, value: capturedValue };
		debounceTimeout = setTimeout(async () => {
			if (!capturedId) return;
			pendingNote = null;
			notesError = false;
			const saved = await updatePageNotes(capturedId, capturedValue);
			// Only surface the failure if this is still the page on screen and the
			// reviewer has not typed since; otherwise a newer write owns the field.
			// The same guard decides whether "Saved" is ours to announce.
			if (lastRecordId === capturedId && notesValue === capturedValue) {
				if (saved) markSaved();
				else {
					notesError = true;
					notesStatus = 'idle';
				}
			}
		}, 500);
	};
</script>

<div class="flex h-full flex-col">
	<!-- Top: the decision itself -->
	<div class="space-y-4 p-6">
		<!-- Screen-reader only: the tab above already says "Decision", and a
		     visible "Manager Review" under it was the same thing twice. The
		     heading stays in the outline for heading navigation. -->
		<h2 class="sr-only">Decision</h2>

		<!-- A container, so the decisions can drop to a 2x2 grid when four
		     buttons no longer fit one row. Font size decides that, not the
		     viewport: at a 20px root, "Approved" can't fit a quarter of the
		     panel. Labels also wrap inside their button. The `!` utilities beat
		     the toggle group's `data-[spacing=0]` padding, border and radius
		     rules, which outrank a plain class. -->
		<div class="@container/decision space-y-2">
			<div class="flex items-baseline justify-between gap-2">
				<span id="decision-label" class="text-sm font-medium">Decision</span>
				{#if !liveRecord && sessionStore.knownSignedOut}
					<span class="text-xs text-sfds-slate-l3">
						<a
							href={resolve('/login')}
							class="font-semibold text-sfds-action underline underline-offset-2">Sign in</a
						> to record a decision
					</span>
				{:else if !liveRecord && pageData && sessionStore.signedIn && $pagesStore.length > 0}
					<!-- Only once the review has loaded: an empty store while signed in
					     is still loading, and saying "no record" then is a false alarm.

					     `pageData` is required because `liveRecord` is looked up by
					     `pageData?.id`. On a drafting, stale or failed draft there is no
					     corpus entry, so the lookup misses even though a `pages` row for
					     that `draft:<uuid>` does exist -- and claiming otherwise would be
					     false. With no page to name, say nothing: the draft banner above
					     already explains the state. -->
					<span class="text-xs text-sfds-slate-l3">No review record exists for this page</span>
				{/if}
				{#if decisionError}
					<span class="text-xs text-destructive" role="alert">Not saved — try again</span>
				{/if}
			</div>
			<ToggleGroup.Root
				type="single"
				variant="outline"
				size="sm"
				spacing={0}
				class="grid w-full grid-cols-2 items-stretch gap-1 @min-[18rem]/decision:flex @min-[18rem]/decision:gap-0"
				aria-labelledby="decision-label"
				bind:value={decision}
				onValueChange={handleDecision}
				disabled={!liveRecord}
			>
				{#each decisions as decision (decision.value)}
					<ToggleGroup.Item
						value={decision.value}
						aria-label={decision.label}
						class="h-auto min-h-7 min-w-0 flex-1 shrink px-0! py-1 leading-tight whitespace-normal disabled:text-sfds-slate-l2 disabled:opacity-100 data-[state=on]:text-white data-[state=on]:hover:text-white @max-[18rem]/decision:rounded-md! @max-[18rem]/decision:border-l! {decision.tone}"
					>
						{decision.label}
					</ToggleGroup.Item>
				{/each}
			</ToggleGroup.Root>
		</div>

		<div class="space-y-2">
			<div class="flex items-baseline justify-between gap-2">
				<Label for="notes">Decision notes</Label>
				<span aria-live="polite" class="text-xs text-sfds-slate-l3">
					{notesStatus === 'saving' ? 'Saving…' : notesStatus === 'saved' ? 'Saved' : ''}
				</span>
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
				disabled={!liveRecord}
				class="disabled:opacity-100"
			/>
		</div>

		{#if nextPath}
			<a
				href={resolve(reviewHrefFor(nextPath))}
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

	{#if checks.length > 0}
		<Separator />

		<!-- Bottom: the checks that inform it. These used to ALSO be reachable
	     through a "Checks" tab rendering this same component with
	     `showOnlyChecks`, which made one tab a strict subset of another. The
	     tab is gone; this is the single home for them, directly under the
	     decision they bear on. -->
		<div class="flex-1 overflow-y-auto bg-muted/40 p-6">
			<h3 class="mb-4 text-sm font-bold">Page checks</h3>

			<div class="space-y-3">
				{#each checks as [checkId, raw] (checkId)}
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
		</div>
	{/if}
</div>
