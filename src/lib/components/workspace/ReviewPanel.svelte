<script lang="ts">
	import { review } from '$lib/review/review.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
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
	import { ArrowRight, Check, CircleAlert, ClipboardList } from '@lucide/svelte';
	import { pageStore } from '$lib/stores/pageData.svelte';
	import { sessionStore } from '$lib/stores/session.svelte';
	import { STATUS_LABELS } from '$lib/review/statusLabels';
	import {
		updatePageStatus,
		updatePageNotes,
		pagesStore,
		type PageCheck
	} from '$lib/stores/reviewState';

	let { pageData, karlReadiness = null } = $props();

	// What a decision is being made over. PRODUCT.md: a review succeeds when
	// the Karl builder never has to go back to the manager, so Approve should
	// not be pressed blind to the page's Karl outline or to edits still in
	// flight. Shown, not enforced -- the decision stays the reviewer's.
	const unsavedHere = $derived(pageData?.id ? pageStore.unsavedChangesOn(pageData.id).length : 0);
	const expiredHere = $derived(
		pageData?.id ? Object.keys(pageStore.staleEditsOn(pageData.id).expired).length : 0
	);
	const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

	// Where "Next undecided" goes. Only meaningful once a review has loaded:
	// with no live rows (signed out) there is nothing to move on to. Searched
	// over the rows the queue lists (`review`), so it never names a retired
	// page's row, whose link would 404.
	const nextPath = $derived(pageData?.id ? review.nextUndecided(pageData.id) : undefined);
	const nextTitle = $derived(
		nextPath ? pageTitleFor(nextPath, pageStore.pages, $draftsStore, 'empty') : ''
	);

	// Find the live record in the store matching the static corpus id
	let liveRecord = $derived($pagesStore.find((p) => p.path === pageData?.id));
	const checks = $derived(Object.entries(liveRecord?.page_checks ?? {}));

	// Steps already ticked off in the walkthrough, on this device. A count, not
	// "N of M": the total needs the walkthrough built, and the panel is not the
	// place to walk the page against the whole Karl inventory just to say it.
	const copiedHere = $derived(pageData?.id ? (pageStore.copiedSteps[pageData.id]?.length ?? 0) : 0);

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

	let lastSyncedNotes = $state('');

	// Sync local notesValue when the live record identity changes, or when
	// manager_notes updates externally (e.g. from Rethink) while no local edit
	// debounce is pending.
	$effect(() => {
		const id = liveRecord?.id;
		const remoteNotes = liveRecord?.manager_notes ?? '';
		if (id !== lastRecordId) {
			lastRecordId = id;
			lastSyncedNotes = remoteNotes;
			notesValue = remoteNotes;
			notesError = false;
			pendingNote = null;
			receipt = null;
			// A write still in flight for the page just left must not report
			// "Saved" here; the guards below also check `lastRecordId`.
			clearTimeout(savedTimeout);
			notesStatus = 'idle';
		} else if (remoteNotes !== lastSyncedNotes) {
			lastSyncedNotes = remoteNotes;
			if (!pendingNote && notesStatus !== 'saving') {
				notesValue = remoteNotes;
			}
		}
	});

	type Decision = 'needs-review' | 'approved' | 'blocked' | 'revise';

	// `tone` keeps the traffic-light reading the hand-rolled pills had, as a
	// FILLED selected state: a faint ring was the only cue before, and in a
	// ~380px panel it was easy to miss. The fills are the SFDS status triplets
	// the pills, the progress bar and DESIGN.md use, so a status is one colour
	// everywhere (they were Tailwind emerald/amber-700 here, a second green and
	// amber). Undecided is ringed in slate rather than filled: the action blue
	// it once had made the one non-decision the loudest thing in the panel,
	// and any fill reads as a choice made. Unselected, all
	// four read alike; a red "Blocked" at rest looked like an error. White text
	// on each fill, measured 2026-11-26: slate-l3 8.9, green 5.4, amber 5.7,
	// red 6.4. The hover override keeps the outline variant's `hover:bg-muted`
	// from washing out the selected item.
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
	// The LABELS are `STATUS_LABELS[].label`, shared with the queue and
	// the landing page. `tone` stays here: it is the toggle's filled selected
	// state, written against `data-[state=on]` and this control's hover
	// override, and it is not the badge colour (white on a solid fill, where a
	// badge is a solid foreground on a tint).
	const decisions: { value: Decision; label: string; tone: string }[] = (
		[
			{
				value: 'needs-review',
				// Ringed, not filled: only a decision gets a fill. A filled
				// Undecided read as a choice already made.
				tone: 'data-[state=on]:bg-background data-[state=on]:hover:bg-background data-[state=on]:font-semibold data-[state=on]:text-sfds-black! data-[state=on]:hover:text-sfds-black! data-[state=on]:shadow-[inset_0_0_0_2px_var(--color-sfds-slate-l3)]'
			},
			{
				value: 'approved',
				tone: 'data-[state=on]:border-sfds-green data-[state=on]:bg-sfds-green data-[state=on]:hover:bg-sfds-green'
			},
			{
				value: 'revise',
				tone: 'data-[state=on]:border-sfds-amber data-[state=on]:bg-sfds-amber data-[state=on]:hover:bg-sfds-amber'
			},
			{
				value: 'blocked',
				tone: 'data-[state=on]:border-sfds-red data-[state=on]:bg-sfds-red data-[state=on]:hover:bg-sfds-red'
			}
		] satisfies { value: Decision; tone: string }[]
	).map((d) => ({ ...d, label: STATUS_LABELS[d.value].label }));

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
	// Proof the write landed. Before this the only signs were the fill
	// changing and the queue row moving -- possibly out of view -- for the
	// one action whose output is which pages may publish. Cleared on page
	// change, and shown only while it still matches the stored status, so a
	// realtime change from elsewhere cannot leave a stale receipt behind.
	let receipt = $state<{ status: Decision; at: string } | null>(null);

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
		receipt = null;
		const recordId = liveRecord.id;
		const saved = await updatePageStatus(recordId, status as Decision);
		// The optimistic update already moved the queue row; on failure the
		// store rolls back, the `$effect` above pulls `decision` with it, and
		// this is the only thing that tells the reviewer their click was lost.
		if (!saved) decisionError = true;
		else if (lastRecordId === recordId)
			receipt = {
				status: status as Decision,
				at: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
			};
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
				<!-- Always in the DOM so the live region exists before its text
				     does; a region inserted with its content is not announced. -->
				<span aria-live="polite" class="text-xs text-sfds-slate-l3">
					{#if receipt && !decisionError && receipt.status === liveRecord?.status}
						{#if receipt.status === 'needs-review'}
							<span class="font-semibold text-sfds-black">Decision cleared</span> · {receipt.at}
						{:else}
							<span class="font-semibold text-sfds-black"
								>{STATUS_LABELS[receipt.status].label}</span
							>
							· recorded {receipt.at}
						{/if}
					{/if}
				</span>
			</div>
			{#if liveRecord && (karlReadiness || unsavedHere || expiredHere)}
				<!-- Read before the buttons, and tied to them by aria-describedby, so
				     a screen reader hears it with the choice. Words only; nothing
				     here is a status colour, because nothing here is a decision. -->
				<ul id="decision-readiness" class="space-y-0.5 text-xs leading-[18px] text-sfds-slate-l3">
					{#if karlReadiness}
						<li><span class="font-semibold text-sfds-black">Karl:</span> {karlReadiness}</li>
					{/if}
					{#if unsavedHere}
						<li>
							<span class="font-semibold text-sfds-black"
								>{plural(unsavedHere, 'unsaved change', 'unsaved changes')}</span
							> on this page. Save or discard in Fields first.
						</li>
					{/if}
					{#if expiredHere}
						<li>
							<span class="font-semibold text-sfds-black"
								>{plural(expiredHere, 'saved edit has', 'saved edits have')} expired</span
							>: the page copy changed under them. Resolve in Fields.
						</li>
					{/if}
				</ul>
			{/if}
			<ToggleGroup.Root
				type="single"
				variant="outline"
				size="sm"
				spacing={0}
				class="grid w-full grid-cols-2 items-stretch gap-1 @min-[18rem]/decision:flex @min-[18rem]/decision:gap-0"
				aria-labelledby="decision-label"
				aria-describedby={liveRecord && (karlReadiness || unsavedHere || expiredHere)
					? 'decision-readiness'
					: undefined}
				bind:value={decision}
				onValueChange={handleDecision}
				disabled={!liveRecord}
			>
				{#each decisions as decision (decision.value)}
					<ToggleGroup.Item
						value={decision.value}
						aria-label={decision.label}
						class="h-auto min-h-7 min-w-0 flex-auto shrink px-0! py-1 leading-tight whitespace-normal disabled:text-sfds-slate-l3 disabled:opacity-100 data-[state=on]:text-white data-[state=on]:hover:text-white max-lg:min-h-11 @max-[18rem]/decision:rounded-md! @max-[18rem]/decision:border-l! {decision.tone}"
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
					<span class="line-clamp-2 block text-xs font-normal text-pretty text-sfds-slate-l3"
						>{nextTitle}</span
					>
				</span>
				<ArrowRight class="size-4 shrink-0" aria-hidden="true" />
			</a>
		{:else if liveRecord}
			<p class="text-sm text-sfds-slate-l3">
				{liveRecord.status === 'needs-review'
					? 'This is the last page in the review without a decision.'
					: review.unreviewed.length > 0
						? `Every page in the review has a decision. ${review.unreviewed.length} ${review.unreviewed.length === 1 ? 'page is' : 'pages are'} not in the review yet.`
						: 'Every page has a decision.'}
			</p>
		{/if}
	</div>

	<!-- The way into the walkthrough, from where the decision is made, and its
	     only entry since the toolbar's button was removed (2026-11-26). It says
	     what it is for, because a button name alone did not tell anyone the
	     transfer step existed. -->
	<Separator />
	<section class="space-y-3 p-6" aria-labelledby="karl-handoff">
		<div class="flex items-baseline justify-between gap-2">
			<h3 id="karl-handoff" class="text-sm font-bold">Move it into Karl</h3>
			{#if liveRecord?.status === 'approved'}
				<span class="text-xs font-semibold text-sfds-green">Ready to move</span>
			{/if}
		</div>
		<p class="text-sm text-sfds-black">
			The Karl walkthrough takes you through this page one Karl field at a time, with the copy ready
			to paste and anything that won’t carry over flagged.
		</p>
		<Button
			variant={liveRecord?.status === 'approved' ? 'default' : 'outline'}
			size="sm"
			class="w-full gap-1.5 max-lg:min-h-11"
			onclick={() => pageStore.enterWalkthrough()}
		>
			<ClipboardList class="size-4" aria-hidden="true" />
			{copiedHere > 0 ? 'Resume' : 'Start'} the Karl walkthrough
		</Button>
		{#if copiedHere > 0}
			<p class="text-xs text-sfds-slate-l3">
				{copiedHere}
				{copiedHere === 1 ? 'field' : 'fields'} copied so far on this device.
			</p>
		{/if}
	</section>

	{#if checks.length > 0}
		<Separator />

		<!-- Bottom: the checks that inform it. These used to ALSO be reachable
	     through a "Checks" tab rendering this same component with
	     `showOnlyChecks`, which made one tab a strict subset of another. The
	     tab is gone; this is the single home for them, directly under the
	     decision they bear on. -->
		<!-- No scroller of its own: the tab panel around it already scrolls and is
		     focusable. Nested, this box became a scroll region whenever the panel
		     was short (the Karl strip took 48px at 1280x720), holding nothing
		     focusable -- axe's scrollable-region-focusable. -->
		<div class="flex-1 bg-muted/40 p-6">
			<h3 class="mb-4 text-sm font-bold">Page checks</h3>

			<div class="space-y-3">
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
			</div>
		</div>
	{/if}
</div>
