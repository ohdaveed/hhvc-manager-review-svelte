<script lang="ts">
	/**
	 * The Fields tab: what the reviewer does with a selection.
	 *
	 * This is where `ActionBar` went. The bar could only ever hold one field,
	 * because it was handed a captured `{name, content, update}`; the panel holds
	 * a list of ids and resolves each one against the live corpus when it renders
	 * or writes. A selection that no longer names a live field resolves to
	 * `null` and is reported as stale rather than written to.
	 */
	import { Button } from '$lib/components/ui/button/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { requestGeneration } from '$lib/ai/generate';
	import { resolveFields } from '$lib/corpus/fieldResolver';
	import { pageStore, type Suggestion } from '$lib/stores/pageData.svelte';
	import { saveInlineEdit } from '$lib/stores/reviewState';

	let { pageData, livePageId }: { pageData: unknown; livePageId?: string } = $props();

	/**
	 * The BACKEND's caps, not the proxy's.
	 *
	 * `build_scripts/ai/schemas.js` in HHVC_manager_review_current_tool_package
	 * declares `fieldText: z.string().min(1).max(8000)` and
	 * `instruction: z.string().max(2000).optional()`. This file previously read
	 * 20,000 -- the proxy's own limit -- so anything between the two was waved
	 * through to a 400 that `requestGeneration` flattens to a bare `API Error`.
	 * Checked here so the reviewer gets a number instead.
	 */
	const MAX_FIELD_TEXT_CHARS = 8_000;
	const MAX_INSTRUCTION_CHARS = 2_000;

	const PRESETS = [
		{
			label: 'Plain language',
			instruction:
				'Rewrite this text into simple plain language at a 6th-grade reading level. Keep every fact and every link.'
		},
		{
			label: 'Shorten',
			instruction:
				'Tighten this text. Remove filler and repetition without dropping any fact, instruction or link.'
		}
	];

	const selected = $derived(resolveFields(pageData as never, pageStore.selectedFieldIds));

	// Ids that no longer resolve: the corpus changed shape, or the reviewer
	// navigated. Reported rather than silently dropped, because a rewrite the
	// reviewer accepted for a field that is not there is work lost without a
	// message.
	const stale = $derived(
		pageStore.selectedFieldIds.filter((id) => !selected.some((s) => s.fieldId === id))
	);

	const unverified = $derived(selected.filter((s) => s.field.unverified));

	/** This page's routable id -- the identity every suggestion is scoped by. */
	const pageId = $derived((pageData as { id?: string } | undefined)?.id);

	/** Only this page's cards. A card for another page has no badge to point at. */
	const cards = $derived(pageStore.suggestionsFor(pageId));

	const acceptedCount = $derived(pageStore.acceptedFor(pageId));
	const pendingCount = $derived(cards.filter(([, s]) => s.status === 'pending').length);
	/** Decided but not yet committed -- exactly the set `Undo all` can reverse. */
	const decidedCount = $derived(
		cards.filter(([, s]) => s.status === 'accepted' || s.status === 'rejected').length
	);

	/** Approved work sitting on pages the reviewer has navigated away from. */
	const acceptedElsewhere = $derived(pageStore.acceptedElsewhere(pageId));

	let rewriting = $state(false);
	let saving = $state(false);
	let saveError = $state('');
	/** Local, pre-flight: the instruction is over the backend's 2,000-char cap. */
	let instructionError = $state('');

	/**
	 * One request per selected field, not one for the whole batch.
	 *
	 * The proxy's contract is `task: 'rewrite-field'` with a single `fieldText`,
	 * and the Railway backend is not ours to change. `allSettled` so one failure
	 * does not discard its siblings -- which is what per-card accept/reject
	 * implies anyway.
	 */
	async function rewrite(instruction: string) {
		if (rewriting || selected.length === 0) return;
		if (instruction.length > MAX_INSTRUCTION_CHARS) {
			instructionError = `That instruction is ${instruction.length.toLocaleString()} characters; the limit is ${MAX_INSTRUCTION_CHARS.toLocaleString()}.`;
			return;
		}
		instructionError = '';
		rewriting = true;

		const requestPageId = pageId;
		const requested = selected.map(({ fieldId, field }) => ({ fieldId, field }));

		/**
		 * Merges ONE result into the live map.
		 *
		 * The whole map used to be snapshotted before the requests went out and
		 * written back after they returned, which made every in-flight rewrite a
		 * lost update: navigating or changing the selection prunes cards, and the
		 * snapshot put them straight back -- along with the pre-request status of
		 * anything the reviewer had accepted or rejected in the meantime.
		 *
		 * A result is also dropped outright if its field is no longer selected or
		 * its page is no longer on screen. It has nothing to point at.
		 */
		const commit = (fieldId: string, suggestion: Omit<Suggestion, 'pageId'>) => {
			if (pageId !== requestPageId) return;
			if (!pageStore.isSelected(fieldId)) return;
			pageStore.suggestions = {
				...pageStore.suggestions,
				[fieldId]: { ...suggestion, pageId: requestPageId as string }
			};
		};

		await Promise.allSettled(
			requested.map(async ({ fieldId, field }) => {
				if (field.value.length > MAX_FIELD_TEXT_CHARS) {
					commit(fieldId, {
						original: field.value,
						suggested: '',
						status: 'error',
						message: `Too long to rewrite (${field.value.length.toLocaleString()} characters; the limit is ${MAX_FIELD_TEXT_CHARS.toLocaleString()}).`
					});
					return;
				}

				try {
					const data = await requestGeneration({
						task: 'rewrite-field',
						provider: 'gemini',
						fieldText: field.value,
						...(instruction ? { instruction } : {})
					});
					const suggested = data?.result?.rewrittenText;
					if (typeof suggested !== 'string' || suggested.trim() === '') {
						throw new Error('The backend returned no rewritten text.');
					}
					commit(fieldId, { original: field.value, suggested, status: 'pending' });
				} catch (e) {
					commit(fieldId, {
						original: field.value,
						suggested: '',
						status: 'error',
						message: e instanceof Error ? e.message : 'Rewrite failed.'
					});
				}
			})
		);

		rewriting = false;
	}

	/**
	 * The recommendation shares `task: 'rewrite-field'`, because that is the only
	 * task the proxy forwards. The instruction asks for an assessment rather than
	 * a rewrite, so what comes back in `rewrittenText` is prose about the copy.
	 */
	async function recommend() {
		if (selected.length === 0) return;

		// One payload for every selected field, so the cap applies to the JOIN,
		// not to each part. Several individually valid selections add up past
		// 8,000 easily, and the rewrite path's guard never covered this one.
		const fieldText = selected.map(({ field }) => `${field.name}: ${field.value}`).join('\n\n');
		if (fieldText.length > MAX_FIELD_TEXT_CHARS) {
			pageStore.agentRec = {
				state: 'error',
				text: `That selection is ${fieldText.length.toLocaleString()} characters together; the assistant reads at most ${MAX_FIELD_TEXT_CHARS.toLocaleString()}. Select fewer fields.`
			};
			return;
		}

		// The reading belongs to the page and selection that asked for it. A
		// single global `agentRec` meant a slow answer landed on whatever was on
		// screen when it arrived -- advice about copy the reviewer had left.
		const requestPageId = pageId;
		const requestSelection = pageStore.selectedFieldIds.join('|');
		const current = () =>
			pageId === requestPageId && pageStore.selectedFieldIds.join('|') === requestSelection;

		pageStore.agentRec = { state: 'loading', text: '' };
		try {
			const data = await requestGeneration({
				task: 'rewrite-field',
				provider: 'gemini',
				fieldText,
				instruction:
					'Do not rewrite this text. In two or three sentences, say what a plain-language editor would change about it and why.'
			});
			const text = data?.result?.rewrittenText;
			if (typeof text !== 'string' || text.trim() === '') throw new Error('No recommendation.');
			if (current()) pageStore.agentRec = { state: 'done', text };
		} catch (e) {
			if (current()) {
				pageStore.agentRec = {
					state: 'error',
					text: e instanceof Error ? e.message : 'Could not reach the assistant.'
				};
			}
		}
	}

	/**
	 * `'pending'` is the undo. A decision stands only until `Save` commits it,
	 * and `original` was captured when the rewrite was requested, so the card is
	 * never missing the text to go back to.
	 *
	 * `error` stays excluded: an errored card has no `suggested` text, and
	 * letting it become pending would render an empty green paragraph above an
	 * Accept button that writes nothing.
	 */
	function decide(fieldId: string, status: 'accepted' | 'rejected' | 'pending') {
		const current = pageStore.suggestions[fieldId];
		if (!current || current.status === 'error') return;
		pageStore.suggestions = { ...pageStore.suggestions, [fieldId]: { ...current, status } };
	}

	/**
	 * The bulk path reverses too, or `Accept all` is the same one-way trap at a
	 * coarser grain -- and the easier one to hit, being a single click that
	 * decides every card at once.
	 *
	 * Scoped to this page's cards. `pageStore.suggestions` also holds accepted
	 * work parked on other pages, and a bulk control in this panel has no
	 * business reaching copy the reviewer cannot see.
	 */
	function decideAll(status: 'accepted' | 'rejected' | 'pending') {
		const from = status === 'pending' ? ['accepted', 'rejected'] : ['pending'];
		const next = { ...pageStore.suggestions };
		for (const [id, s] of cards) {
			if (from.includes(s.status)) next[id] = { ...s, status };
		}
		pageStore.suggestions = next;
	}

	/**
	 * Writes this page's accepted suggestions into the corpus and persists them.
	 *
	 * The in-memory write always runs, so the mockup reflects the decision even
	 * with no live review row; `saveInlineEdit` is what needs one.
	 *
	 * Two things this loop must not do, both of which it used to.
	 *
	 * It must not save a suggestion approved for another page. Field ids are
	 * page-relative, so `title` resolves on all 29 of them: an edit accepted on
	 * page A, left unsaved, then saved from page B overwrote B's title and was
	 * persisted under B's row. `pageId` is the guard, and the page is captured
	 * before the loop so navigating mid-save cannot move the target either.
	 *
	 * And it must not forget a suggestion whose edit did not persist.
	 * `saveInlineEdit` rolls its optimistic entry back and, until it returned a
	 * boolean, resolved exactly as it does on success -- so the card was dropped,
	 * the corpus said the rewrite had landed, and the database held nothing. The
	 * suggestion now survives a failure, still accepted, still retryable.
	 */
	async function saveAccepted() {
		if (saving) return;
		saving = true;
		saveError = '';

		const savePageData = pageData;
		const savePageId = livePageId;
		const accepted = pageStore
			.suggestionsFor(pageId)
			.filter(([, suggestion]) => suggestion.status === 'accepted');

		const missing: string[] = [];
		const failed: string[] = [];

		for (const [fieldId, suggestion] of accepted) {
			const resolved = resolveFields(savePageData as never, [fieldId])[0];
			if (!resolved) {
				missing.push(fieldId);
				continue;
			}

			// Persist first, mutate second. The corpus write is what the reviewer
			// sees; doing it before the insert is known to have landed is how a
			// failed save still looked like a successful one.
			if (savePageId) {
				const persisted = await saveInlineEdit(savePageId, fieldId, suggestion.suggested);
				if (!persisted) {
					failed.push(fieldId);
					continue;
				}
			}

			resolved.field.set(suggestion.suggested);
			pageStore.forgetSuggestion(fieldId);
		}

		if (failed.length > 0) {
			saveError = `${failed.length} ${failed.length === 1 ? 'edit' : 'edits'} could not be saved and ${failed.length === 1 ? 'is' : 'are'} still here to retry.`;
		} else if (missing.length > 0) {
			saveError = `${missing.length} ${missing.length === 1 ? 'edit' : 'edits'} could not be applied: the field is no longer on this page.`;
		} else if (!savePageId) {
			saveError = 'Applied to the mockup only — this page is not part of a loaded review.';
		}

		saving = false;
	}
</script>

<div class="flex h-full min-h-0 flex-col">
	<div class="min-h-0 flex-1 overflow-y-auto">
		{#if selected.length === 0}
			<div class="text-sfds-slate-l2 px-5 py-6 text-sm">
				<p class="text-sfds-black font-semibold">No field selected</p>
				<p class="mt-1.5 leading-[20px]">
					Click any piece of copy in the mockup to select it. Shift-click to add more, and the
					assistant will rewrite them together.
				</p>
			</div>
		{:else}
			<!-- Selection header -->
			<div class="flex items-center justify-between gap-2 border-b px-5 py-3">
				<span class="text-sfds-black text-[13px] font-semibold">
					{selected.length}
					{selected.length === 1 ? 'field' : 'fields'} selected
				</span>
				<Button
					variant="ghost"
					size="sm"
					class="h-7 px-2"
					onclick={() => pageStore.clearSelection()}
				>
					Clear
				</Button>
			</div>

			<ol class="space-y-1 px-5 py-3" aria-label="Selected fields">
				{#each selected as { fieldId, field }, i (fieldId)}
					<li class="flex items-start gap-2 text-[13px]">
						<span
							class="bg-sfds-action mt-px inline-flex size-[18px] flex-none items-center justify-center rounded-[3px] text-[11px] font-bold text-white"
						>
							{i + 1}
						</span>
						<span class="text-sfds-slate-l2 min-w-0 truncate">{field.name}</span>
					</li>
				{/each}
			</ol>

			{#if stale.length > 0}
				<p
					class="border-sfds-red bg-sfds-red-l1 text-sfds-red mx-5 rounded-[4px] border-l-2 px-3 py-2 text-[12px]"
				>
					{stale.length}
					{stale.length === 1 ? 'selection is' : 'selections are'} no longer on this page and will be
					ignored.
				</p>
			{/if}

			{#if unverified.length > 0}
				<div
					class="border-sfds-amber bg-sfds-amber-l1 mx-5 mt-3 rounded-[4px] border-l-2 px-3 py-2"
				>
					<p class="text-sfds-amber text-[12px] font-bold tracking-[0.06em] uppercase">
						Unverified copy
					</p>
					<p class="text-sfds-black mt-1 text-[12px] leading-[17px]">
						{unverified.length}
						{unverified.length === 1 ? 'field has' : 'fields have'} no confirmed source. HHVC has to confirm
						the facts before this ships, whatever the wording.
					</p>
					<ul class="text-sfds-black mt-1.5 list-disc space-y-0.5 pl-4 text-[12px]">
						{#each unverified as { fieldId, field } (fieldId)}
							<li>{field.name}{field.unverifiedReason ? ` — ${field.unverifiedReason}` : ''}</li>
						{/each}
					</ul>
				</div>
			{/if}

			<!-- Agent recommendation -->
			<section class="mx-5 mt-4 rounded-[4px] border p-3" aria-label="Assistant recommendation">
				<div class="flex items-center justify-between gap-2">
					<span class="text-sfds-black text-[12px] font-bold tracking-[0.06em] uppercase">
						What to change
					</span>
					<Button
						variant="outline"
						size="sm"
						class="h-7 px-2 text-[12px]"
						disabled={pageStore.agentRec.state === 'loading'}
						onclick={recommend}
					>
						{pageStore.agentRec.state === 'loading' ? 'Reading…' : 'Ask'}
					</Button>
				</div>

				{#if pageStore.agentRec.state === 'idle'}
					<p class="text-sfds-slate-l2 mt-2 text-[12px] leading-[17px]">
						Ask the assistant what it would change about the selected copy before rewriting it.
					</p>
				{:else if pageStore.agentRec.state === 'loading'}
					<p class="text-sfds-slate-l2 mt-2 text-[12px]" role="status">Reading the selection…</p>
				{:else if pageStore.agentRec.state === 'error'}
					<p class="text-sfds-red mt-2 text-[12px] leading-[17px]" role="alert">
						{pageStore.agentRec.text}
					</p>
				{:else}
					<p class="text-sfds-black mt-2 text-[13px] leading-[19px]">{pageStore.agentRec.text}</p>
				{/if}
			</section>

			<!-- Batch rewrite -->
			<section class="mx-5 mt-4" aria-label="Rewrite">
				<div class="flex flex-wrap gap-2">
					{#each PRESETS as preset (preset.label)}
						<Button
							variant="outline"
							size="sm"
							class="h-8 text-[12px]"
							disabled={rewriting}
							onclick={() => rewrite(preset.instruction)}
						>
							{preset.label}
						</Button>
					{/each}
				</div>

				<Textarea
					bind:value={pageStore.rewriteInstruction}
					rows={2}
					class="mt-2 text-[13px]"
					maxlength={MAX_INSTRUCTION_CHARS}
					aria-label="Rewrite instruction"
					placeholder="Or describe the change in your own words…"
				/>
				{#if instructionError}
					<p class="text-sfds-red mt-1.5 text-[12px] leading-[17px]" role="alert">
						{instructionError}
					</p>
				{/if}
				<Button
					size="sm"
					class="mt-2 h-8 w-full text-[12px]"
					disabled={rewriting || pageStore.rewriteInstruction.trim() === ''}
					onclick={() => rewrite(pageStore.rewriteInstruction.trim())}
				>
					{rewriting
						? 'Rewriting…'
						: `Rewrite ${selected.length} ${selected.length === 1 ? 'field' : 'fields'}`}
				</Button>
			</section>

			<!-- Suggestions -->
			{#if cards.length > 0}
				<section class="mt-5" aria-label="Suggestions">
					<div class="flex items-center justify-between px-5">
						<span class="text-sfds-black text-[12px] font-bold tracking-[0.06em] uppercase">
							Suggestions
						</span>
						<span class="flex gap-1">
							<!-- Shown whenever anything is decided, including when NOTHING is
							     pending: `Accept all` is one click that decides every card, and
							     leaving it one-way is the same trap as a one-way Accept, just
							     easier to trigger by accident. -->
							{#if decidedCount > 0}
								<Button
									variant="ghost"
									size="sm"
									class="h-7 px-2 text-[12px]"
									disabled={saving}
									onclick={() => decideAll('pending')}>Undo all</Button
								>
							{/if}
							{#if pendingCount > 0}
								<Button
									variant="ghost"
									size="sm"
									class="h-7 px-2 text-[12px]"
									disabled={saving}
									onclick={() => decideAll('rejected')}>Reject all</Button
								>
								<Button
									variant="ghost"
									size="sm"
									class="text-sfds-action h-7 px-2 text-[12px]"
									disabled={saving}
									onclick={() => decideAll('accepted')}>Accept all</Button
								>
							{/if}
						</span>
					</div>

					<ul class="mt-2 space-y-2 px-5 pb-4">
						{#each cards as [fieldId, suggestion] (fieldId)}
							{@const badge = pageStore.badgeNumber(fieldId)}
							<li class="rounded-[4px] border p-3">
								<div class="flex items-center gap-2">
									{#if badge > 0}
										<span
											class="bg-sfds-action inline-flex size-[18px] flex-none items-center justify-center rounded-[3px] text-[11px] font-bold text-white"
										>
											{badge}
										</span>
									{/if}
									<span class="text-sfds-slate-l2 min-w-0 flex-1 truncate text-[12px]">
										{resolveFields(pageData as never, [fieldId])[0]?.field.name ?? fieldId}
									</span>
									{#if suggestion.status === 'accepted'}
										<span class="text-sfds-green text-[11px] font-bold uppercase">Accepted</span>
									{:else if suggestion.status === 'rejected'}
										<span class="text-sfds-slate-l2 text-[11px] font-bold uppercase">Rejected</span>
									{/if}
								</div>

								{#if suggestion.status === 'error'}
									<p class="text-sfds-red mt-2 text-[12px] leading-[17px]" role="alert">
										{suggestion.message}
									</p>
								{:else}
									<!-- Deleted and inserted copy as separate paragraphs, never
									     interleaved: these are two different sentences, and an
									     inline word-diff of prose reads as neither of them. -->
									<p
										class="bg-sfds-red-l1 text-sfds-black mt-2 rounded-[3px] px-2 py-1.5 text-[13px] leading-[19px] line-through decoration-1"
									>
										{suggestion.original}
									</p>
									<p
										class="bg-sfds-green-l1 text-sfds-black mt-1.5 rounded-[3px] px-2 py-1.5 text-[13px] leading-[19px]"
									>
										{suggestion.suggested}
									</p>
								{/if}

								{#if suggestion.status === 'pending'}
									<div class="mt-2 flex justify-end gap-1">
										<Button
											variant="ghost"
											size="sm"
											class="h-7 px-2 text-[12px]"
											onclick={() => decide(fieldId, 'rejected')}>Reject</Button
										>
										<Button
											size="sm"
											class="h-7 px-2 text-[12px]"
											onclick={() => decide(fieldId, 'accepted')}>Accept</Button
										>
									</div>
								{:else if suggestion.status !== 'error'}
									<!-- The decision stands until `Save` commits it, and `original`
									     was captured with the rewrite, so there is always something
									     to go back to. Without this an accidental Accept could only
									     be undone by `Clear`, which throws the whole batch away. -->
									<div class="mt-2 flex justify-end">
										<Button
											variant="ghost"
											size="sm"
											class="h-7 px-2 text-[12px]"
											aria-label="Undo {suggestion.status === 'accepted'
												? 'accepting'
												: 'rejecting'} this rewrite"
											disabled={saving}
											onclick={() => decide(fieldId, 'pending')}>Undo</Button
										>
									</div>
								{/if}
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		{/if}
	</div>

	<!-- Footer. `Save N edits` counts ACCEPTED suggestions, not selected fields:
	     they look alike and are routinely different numbers. -->
	<div class="flex-none border-t px-5 py-3">
		<!-- Accepted work does not follow the reviewer, and the count above is
		     scoped to this page, so without this line it simply vanishes when they
		     navigate. Named here rather than added to the count: the button below
		     cannot save it, and a number the button disagrees with is worse than
		     no number. -->
		{#if acceptedElsewhere > 0}
			<p class="text-sfds-amber mb-2 text-[12px] leading-[17px]" role="status">
				{acceptedElsewhere} accepted {acceptedElsewhere === 1 ? 'edit' : 'edits'} on other pages
				{acceptedElsewhere === 1 ? 'is' : 'are'} still unsaved. Open that page to save
				{acceptedElsewhere === 1 ? 'it' : 'them'}.
			</p>
		{/if}
		{#if saveError}
			<p class="text-sfds-amber mb-2 text-[12px] leading-[17px]" role="status">{saveError}</p>
		{/if}
		<Button class="w-full" disabled={acceptedCount === 0 || saving} onclick={saveAccepted}>
			{saving ? 'Saving…' : `Save ${acceptedCount} ${acceptedCount === 1 ? 'edit' : 'edits'}`}
		</Button>
	</div>
</div>
