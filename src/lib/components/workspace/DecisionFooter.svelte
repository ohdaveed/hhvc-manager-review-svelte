<script lang="ts">
	import { review } from '$lib/review/review.svelte';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { DECISION_KEYS, NEXT_UNDECIDED_KEY, isPlainKey } from '$lib/review/shortcuts';
	import { reviewHrefFor } from '$lib/corpus/draftPath';
	import { draftsStore } from '$lib/stores/draftPages';
	import { pageTitleFor } from '$lib/corpus/pageTitle';
	import { pageStore } from '$lib/stores/pageData.svelte';
	import { sessionStore } from '$lib/stores/session.svelte';
	import { STATUS_LABELS } from '$lib/review/statusLabels';
	import { Button } from '$lib/components/ui/button/index.js';
	import { addPageToReview, updatePageStatus, pagesStore } from '$lib/stores/reviewState';

	type Decision = 'needs-review' | 'approved' | 'blocked' | 'revise';

	let {
		pageData,
		karlReadiness = null,
		onDecided,
		onWriteFeedback,
		onOpenFields
	}: {
		pageData?: { id?: string } | null;
		/** The Karl outline's summary for this page. */
		karlReadiness?: string | null;
		/** A decision was saved. The workspace opens the Karl tab on an approval. */
		onDecided?: (status: Decision) => void;
		/** Open the Notes tab: the page is being sent back with no feedback yet. */
		onWriteFeedback?: () => void;
		/** Open the Fields tool when the decision needs unresolved edits. */
		onOpenFields?: () => void;
	} = $props();

	// What a decision is being made over. PRODUCT.md: a review succeeds when
	// the Karl builder never has to go back to the manager, so Approve should
	// not be pressed blind to the page's Karl outline or to edits still in
	// flight. Shown, not enforced -- the decision stays the reviewer's.
	const unsavedHere = $derived(pageData?.id ? pageStore.unsavedChangesOn(pageData.id).length : 0);
	const expiredHere = $derived(
		pageData?.id ? Object.keys(pageStore.staleEditsOn(pageData.id).expired).length : 0
	);
	const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

	// Where the button under the decision goes. Only meaningful once a review
	// has loaded: with no live rows (signed out) there is nothing to move on to.
	// Searched over the rows the queue lists (`review`), so it never names a
	// retired page's row, whose link would 404.
	const nextPath = $derived(pageData?.id ? review.nextUndecided(pageData.id) : undefined);
	const nextTitle = $derived(
		nextPath ? pageTitleFor(nextPath, pageStore.pages, $draftsStore, 'empty') : ''
	);

	// Find the live record in the store matching the static corpus id
	let liveRecord = $derived($pagesStore.find((p) => p.path === pageData?.id));

	// A corpus page with no row can be added to the review from here, as from
	// the queue's "Not in the review yet" list. `review.unreviewed` is exactly
	// those pages: never a draft (its row is made with it) and never a retired
	// row. The decision controls come alive once the row lands in the store.
	const addable = $derived(pageData?.id ? review.unreviewed.includes(pageData.id) : false);
	let adding = $state(false);
	let addFailed = $state(false);
	$effect(() => {
		void pageData?.id;
		addFailed = false;
	});
	async function addToReview() {
		if (adding || !pageData?.id) return;
		adding = true;
		addFailed = false;
		addFailed = !(await addPageToReview(pageData.id));
		adding = false;
	}

	// `tone` is the FILLED selected state: a faint ring was the only cue once,
	// and in a ~380px panel it was easy to miss. The fills are the SFDS status
	// triplets the pills, the progress bar and DESIGN.md use, so a status is one
	// colour everywhere. Unselected, all three read alike; a red "Blocked" at
	// rest looked like an error. White text on each fill, measured 2026-11-26:
	// green 5.4, amber 5.7, red 6.4. The hover override keeps the outline
	// variant's `hover:bg-muted` from washing out the selected item.
	//
	// THREE options, and pressing the selected one again CLEARS the decision.
	// History, because this has been wrong before: with three pills and no
	// handler for the deselect, clicking Approve twice put every pill in
	// `data-state="off"`, sent NO write, and left the queue row under
	// "Approved" -- the control said "no decision" while the database said
	// approved. A fourth "Undecided" pill fixed that; this keeps the fix
	// without the pill, by making the deselect a real write of `needs-review`
	// (see `handleDecision`). Undecided is then what the control shows when
	// nothing is pressed, which is what it is.
	//
	// The LABELS are `STATUS_LABELS[].label`, shared with the queue and the
	// landing page. `tone` stays here: it is this control's selected fill, not
	// the badge colour (white on a solid fill, where a badge is a solid
	// foreground on a tint).
	const decisions: { value: Decision; label: string; tone: string }[] = (
		[
			{
				value: 'approved',
				tone: 'data-[state=on]:bg-sfds-green data-[state=on]:hover:bg-sfds-green'
			},
			{
				value: 'revise',
				tone: 'data-[state=on]:bg-sfds-amber data-[state=on]:hover:bg-sfds-amber'
			},
			{
				value: 'blocked',
				tone: 'data-[state=on]:bg-sfds-red data-[state=on]:hover:bg-sfds-red'
			}
		] satisfies { value: Decision; tone: string }[]
	).map((d) => ({ ...d, label: STATUS_LABELS[d.value].label }));

	/** What the control should show for the stored row: Undecided presses nothing. */
	const stored = () =>
		liveRecord?.status && liveRecord.status !== 'needs-review' ? liveRecord.status : '';

	// The RENDERED decision, kept in step with the stored row.
	//
	// `bind:value` is what makes the group controlled. Handed a one-way
	// `value={...}` the bits-ui primitive keeps its own copy once the reviewer
	// clicks, and no later render can correct it.
	let decision = $state('');
	let syncedFrom = $state<string | undefined>(undefined);
	$effect(() => {
		// Keyed on id AND status so a rollback (which restores the old status
		// on the same row) re-syncs, not just a navigation to another page.
		const key = `${liveRecord?.id ?? ''}:${liveRecord?.status ?? ''}`;
		if (key !== syncedFrom) {
			syncedFrom = key;
			decision = stored();
		}
	});

	let decisionError = $state(false);
	// Proof the write landed. Before this the only signs were the fill
	// changing and the queue row moving -- possibly out of view -- for the
	// one action whose output is which pages may publish. Cleared on page
	// change, and shown only while it still matches the stored status, so a
	// realtime change from elsewhere cannot leave a stale receipt behind.
	let receipt = $state<{ status: Decision; at: string } | null>(null);

	let lastRecordId = $state<string | undefined>(undefined);
	$effect(() => {
		const id = liveRecord?.id;
		if (id !== lastRecordId) {
			lastRecordId = id;
			receipt = null;
			decisionError = false;
		}
	});

	const handleDecision = async (status: string) => {
		// No row to write to (signed out, or no review record). The controls are
		// disabled then, but never let the bound value show an unsaved choice.
		if (!liveRecord) {
			decision = '';
			return;
		}
		// Pressing the selected item again emits ''. That clears the decision:
		// a real write of `needs-review`, never a control left showing nothing
		// over a row that still says approved.
		const next = (status || 'needs-review') as Decision;
		if (next === liveRecord.status) return;
		decisionError = false;
		receipt = null;
		const recordId = liveRecord.id;
		const saved = await updatePageStatus(recordId, next);
		// The optimistic update already moved the queue row; on failure the
		// store rolls back, the `$effect` above pulls `decision` with it, and
		// this is the only thing that tells the reviewer their click was lost.
		if (!saved) {
			decisionError = true;
			decision = stored();
		} else if (lastRecordId === recordId) {
			receipt = {
				status: next,
				at: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
			};
			onDecided?.(next);
		}
	};

	// ---- keyboard shortcuts (see `$lib/review/shortcuts`) ------------------

	let root = $state<HTMLElement>();

	/**
	 * A, R, B and U record a decision; ] opens the next undecided page.
	 *
	 * Handled HERE, not in the layout, and only while this footer is laid out
	 * (`offsetParent`): it is unmounted when the panel's rail is collapsed, and
	 * hidden below 1024px until its sheet opens. So a key can only make a
	 * decision where the control and its receipt are on screen to show it.
	 */
	function onShortcut(event: KeyboardEvent) {
		if (!pageStore.shortcutsOn || !isPlainKey(event)) return;
		if (!root || root.offsetParent === null) return;
		const key = event.key.toLowerCase();

		if (key === NEXT_UNDECIDED_KEY && nextPath) {
			event.preventDefault();
			goto(resolve(reviewHrefFor(nextPath)));
			return;
		}

		const status = DECISION_KEYS[key];
		// No row to decide (signed out, or the page is not in the review): the
		// buttons are disabled, and a key must not do what they cannot.
		if (!status || !liveRecord) return;
		event.preventDefault();
		// Undecided presses nothing: the control has three options, not four.
		decision = status === 'needs-review' ? '' : status;
		handleDecision(status);
	}

	// The one button under the decision: where to go now. A decision saves the
	// moment it is pressed, so this never submits anything -- it moves on, or,
	// for a page being sent back with nothing written, opens the feedback box.
	const status = $derived(liveRecord?.status);
	const sendingBack = $derived(status === 'revise' || status === 'blocked');
	const missingNote = $derived(sendingBack && (liveRecord?.manager_notes ?? '').trim() === '');
	const nextLabel = $derived(
		status === 'approved'
			? 'Approved, next page'
			: sendingBack
				? 'Send back, next page'
				: 'Skip for now'
	);
	// White on each fill: green 5.4:1, action blue 5.5:1.
	const nextTone = $derived(
		status === 'approved'
			? 'bg-sfds-green text-white hover:bg-sfds-green/90'
			: sendingBack
				? 'bg-sfds-action text-white hover:bg-sfds-blue-dark'
				: 'border border-slate-300 bg-white text-sfds-black hover:bg-muted'
	);
	const PRIMARY =
		'flex h-12 w-full items-center justify-center rounded-full px-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sfds-black';
</script>

<!-- Pinned under the tabs: the decision is what the tool exists to record, so
     it is on screen whichever tab is open. -->
<svelte:window onkeydown={onShortcut} />

<footer
	class="flex flex-none flex-col gap-2.5 border-t border-sfds-grey-l2 bg-white p-3"
	bind:this={root}
>
	<h2 id="decision-label" class="sr-only">Decision</h2>

	<div class="flex flex-wrap items-baseline justify-between gap-x-2 text-xs text-sfds-slate-l3">
		{#if !liveRecord && sessionStore.knownSignedOut}
			<span>
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
			<span>No review record exists for this page</span>
		{:else if liveRecord}
			<!-- The keys, and their off switch in one control: the label is the
			     hint. A checkbox, not a line of text, because a single-key
			     shortcut has to be something a reviewer can turn off (WCAG
			     2.1.4): dictation types characters. -->
			<label
				class="flex items-center gap-1.5"
				title="Keyboard shortcuts: A approved, R needs revision, B blocked, U undecided, ] next undecided page, \ page queue"
			>
				<input
					type="checkbox"
					class="size-3.5 accent-sfds-action"
					checked={pageStore.shortcutsOn}
					aria-describedby="decision-keys-help"
					onchange={(e) => pageStore.setShortcuts(e.currentTarget.checked)}
				/>
				Keys: A · R · B · U
			</label>
			<span id="decision-keys-help" class="sr-only">
				Keyboard shortcuts. A approved, R needs revision, B blocked, U undecided, right bracket for
				the next undecided page, backslash for the page queue.
			</span>
		{/if}
		{#if decisionError}
			<span class="text-destructive" role="alert">Not saved — try again</span>
		{/if}
		<!-- Always in the DOM so the live region exists before its text
		     does; a region inserted with its content is not announced. -->
		<span aria-live="polite">
			{#if receipt && !decisionError && receipt.status === liveRecord?.status}
				{#if receipt.status === 'needs-review'}
					<span class="font-semibold text-sfds-black">Decision cleared</span> · {receipt.at}
				{:else}
					<span class="font-semibold text-sfds-black">{STATUS_LABELS[receipt.status].label}</span>
					· recorded {receipt.at}
				{/if}
			{/if}
		</span>
	</div>

	{#if addable && sessionStore.signedIn && $pagesStore.length > 0}
		<!-- Same condition as the "No review record" line above, narrowed to
		     corpus pages: the button creates the row through PUT /api/pages. -->
		<div class="flex flex-wrap items-center gap-2">
			<Button variant="outline" size="sm" aria-busy={adding} onclick={addToReview}>
				{adding ? 'Adding…' : 'Add to review'}
			</Button>
			{#if addFailed}
				<span role="alert" class="text-xs text-destructive">Couldn't add it. Try again.</span>
			{/if}
		</div>
	{/if}

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
					> on this page. Save or discard on the Fix tab, under Fields, first.
				</li>
			{/if}
			{#if expiredHere}
				<li>
					<span class="font-semibold text-sfds-black"
						>{plural(expiredHere, 'saved edit has', 'saved edits have')} expired</span
					>: the page copy changed under them. Resolve on the Fix tab, under Fields.
				</li>
			{/if}
		</ul>
	{/if}
	{#if liveRecord && (unsavedHere || expiredHere) && onOpenFields}
		<button
			type="button"
			class="text-xs font-semibold text-sfds-action underline underline-offset-2 hover:text-sfds-blue-dark"
			onclick={onOpenFields}
		>
			Open Fields
		</button>
	{/if}

	<!-- A segmented control: three equal cells on a grey track, the selected one
	     filled in its status colour. The `!` utilities beat the toggle group's
	     `data-[spacing=0]` border and radius rules, which outrank a plain class.
	     Labels wrap inside their cell, so a 20px root still fits three. -->
	<ToggleGroup.Root
		type="single"
		variant="outline"
		size="sm"
		spacing={0}
		class="grid w-full grid-cols-3 items-stretch gap-1 rounded-xl bg-muted p-1"
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
				class="h-auto min-h-11 min-w-0 rounded-[9px]! border-0! bg-transparent px-1! py-1 text-sm leading-tight font-semibold whitespace-normal text-slate-700 disabled:text-sfds-slate-l3 disabled:opacity-100 data-[state=on]:text-white data-[state=on]:shadow-sm data-[state=on]:hover:text-white {decision.tone}"
			>
				{decision.label}
			</ToggleGroup.Item>
		{/each}
	</ToggleGroup.Root>

	{#if liveRecord && missingNote && onWriteFeedback}
		<button
			type="button"
			onclick={onWriteFeedback}
			class="{PRIMARY} bg-sfds-action text-white hover:bg-sfds-blue-dark"
		>
			Write feedback to send back
		</button>
	{:else if nextPath}
		<!-- The visible words start the name, which adds where it goes
		     (WCAG 2.5.3). -->
		<a
			href={resolve(reviewHrefFor(nextPath))}
			aria-label="{nextLabel}: {nextTitle}"
			title="Next undecided page: {nextTitle}"
			class="{PRIMARY} {nextTone}"
		>
			{nextLabel}
			{#if pageStore.shortcutsOn}
				<!-- The key that does the same. Decorative: the link's name is the
				     words beside it, and the keys are described at the decision. -->
				<kbd
					class="ml-2 flex-none rounded border border-current/40 px-1.5 font-mono text-xs font-semibold"
					aria-hidden="true">]</kbd
				>
			{/if}
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
</footer>
