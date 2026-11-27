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
	import { hashTextBrowser } from '$lib/corpus/hashBrowser';
	import { changeKey, isChanged, pageStore, type Suggestion } from '$lib/stores/pageData.svelte';
	import { saveInlineEdit } from '$lib/stores/reviewState';
	import { sessionStore } from '$lib/stores/session.svelte';
	import { resolve } from '$app/paths';

	let { pageData, livePageId }: { pageData: unknown; livePageId?: string } = $props();
	const uid = $props.id();

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

	/** What `Save N changes` commits: typed or accepted, on this page. */
	const unsavedHere = $derived(pageStore.unsavedChangesOn(pageId).length);
	const pendingCount = $derived(cards.filter(([, s]) => s.status === 'pending').length);
	/** Decided but not yet committed -- exactly the set `Undo all` can reverse. */
	const decidedCount = $derived(
		cards.filter(([, s]) => s.status === 'accepted' || s.status === 'rejected').length
	);

	let rewriting = $state(false);
	let saving = $state(false);
	let saveError = $state('');

	/**
	 * Per-change state for the edit controls, keyed by `changeKey` -- a
	 * field id alone names a field on every page, and unsaved changes outlive navigation.
	 */
	let changeErrors = $state<Record<string, string>>({});
	let savingChanges = $state<Record<string, boolean>>({});

	/** Unsaved changes on this page whose field is not selected: kept, so listed. */
	const otherUnsavedChanges = $derived(
		pageStore.unsavedChangesOn(pageId).filter((d) => !pageStore.isSelected(d.fieldId))
	);
	const changesElsewhere = $derived(pageStore.unsavedChangesElsewhere(pageId));

	const errorFor = (fieldId: string) => (pageId ? changeErrors[changeKey(pageId, fieldId)] : '');
	const isSavingChange = (fieldId: string) =>
		pageId ? savingChanges[changeKey(pageId, fieldId)] === true : false;

	function setChangeError(key: string, message: string) {
		const next = { ...changeErrors };
		if (message) next[key] = message;
		else delete next[key];
		changeErrors = next;
	}

	/**
	 * No field in the corpus holds a line break -- measured over every string in
	 * `pageStore.pages` -- so none is let in: Enter saves, and a paste that
	 * carries line breaks has them turned into spaces.
	 */
	function typeChange(fieldId: string, value: string) {
		if (!pageId) return;
		const key = changeKey(pageId, fieldId);
		setChangeError(key, '');
		if (!pageStore.setChange(pageId, fieldId, value.replace(/\s*[\r\n]+\s*/g, ' '))) {
			setChangeError(key, 'This field is no longer on the page, so the change was not applied.');
		}
	}

	/**
	 * Refused while that field's save is in flight: the insert would land after
	 * the cancel, and hydration would put the cancelled text back, recorded.
	 */
	function cancelChange(fieldId: string) {
		if (!pageId || isSavingChange(fieldId)) return;
		setChangeError(changeKey(pageId, fieldId), '');
		pageStore.cancelChange(pageId, fieldId);
	}

	function onChangeKeydown(e: KeyboardEvent, fieldId: string) {
		if (e.isComposing) return;
		if (e.key === 'Enter') {
			e.preventDefault();
			if (pageStore.hasUnsavedChange(pageId, fieldId)) saveChange(fieldId);
		} else if (e.key === 'Escape' && pageStore.getChange(pageId, fieldId)) {
			// Stopped here: Esc on a field with an unsaved change means "undo my typing",
			// and nothing around the panel should also act on it.
			e.preventDefault();
			e.stopPropagation();
			cancelChange(fieldId);
		}
	}

	/**
	 * Persists one unsaved change, typed or accepted. The mockup already shows
	 * it, so success only has to drop the change; failure keeps it, so the text
	 * is still there to retry. Resolves true once nothing is left unsaved.
	 *
	 * A suggestion for the same field is dropped once the save lands: its
	 * `original` is the copy the reviewer has just replaced, and accepting it
	 * later would quietly overwrite the edit that was saved.
	 */
	async function saveChange(
		fieldId: string,
		changePageId: string | undefined = pageId,
		liveId: string | undefined = livePageId
	): Promise<boolean> {
		const change = pageStore.getChange(changePageId, fieldId);
		if (!changePageId || !change) return true;
		const key = changeKey(changePageId, fieldId);
		if (savingChanges[key]) return false;
		if (!isChanged(change)) {
			pageStore.forgetChange(changePageId, fieldId);
			return true;
		}
		if (!liveId) {
			setChangeError(
				key,
				'This page is not part of a loaded review, so the change can only be shown, not saved.'
			);
			return false;
		}
		// Every edit is anchored to the base copy it answers (ADR 0001). A field
		// with no base copy on record cannot be anchored, so it is not saved.
		const base = pageStore.baseCopyOf(changePageId, fieldId);
		if (base === undefined) {
			setChangeError(
				key,
				'This field has no base copy on record, so the change cannot be saved against it.'
			);
			return false;
		}
		const value = change.value;
		savingChanges = { ...savingChanges, [key]: true };
		setChangeError(key, '');
		const persisted = await saveInlineEdit(liveId, fieldId, value, await hashTextBrowser(base));
		savingChanges = { ...savingChanges, [key]: false };
		if (!persisted) {
			setChangeError(key, 'The change could not be saved. It is still here to retry.');
			return false;
		}
		// Typing may have continued while the request was out; only an unsaved change that
		// still says what was saved is finished. One that moved on keeps going,
		// with the saved copy as what Cancel now returns to.
		const now = pageStore.getChange(changePageId, fieldId);
		if (now?.value === value) pageStore.forgetChange(changePageId, fieldId);
		else if (now)
			pageStore.unsavedChanges = {
				...pageStore.unsavedChanges,
				[key]: { ...now, original: value, savedElsewhere: false, reconfirm: false }
			};
		if (pageStore.suggestions[fieldId]?.pageId === changePageId)
			pageStore.forgetSuggestion(fieldId);
		return now === undefined || now.value === value;
	}

	/** Local, pre-flight: the instruction is over the backend's 2,000-char cap. */
	let instructionError = $state('');

	/** Says which selected fields a rewrite left out, and why. */
	let rewriteNotice = $state('');

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

		// Suggestions are keyed by field id alone, so a new rewrite would replace
		// an accepted one -- on this page, or for the same field id on another --
		// and its unsaved change could no longer be undone back to a waiting
		// card. Those fields are left out, and said so, rather than requested.
		const held = selected.filter(
			({ fieldId }) => pageStore.suggestions[fieldId]?.status === 'accepted'
		);
		rewriteNotice =
			held.length === 0
				? ''
				: `${held.length} ${held.length === 1 ? 'field was' : 'fields were'} not rewritten: ${held.length === 1 ? 'it has' : 'they have'} an accepted rewrite, here or on another page, that is not saved yet. Save or undo it first.`;
		const requested = selected
			.filter(({ fieldId }) => pageStore.suggestions[fieldId]?.status !== 'accepted')
			.map(({ fieldId, field }) => ({ fieldId, field }));
		if (requested.length === 0) return;
		rewriting = true;

		const requestPageId = pageId;

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
			// Accepted while this request was out: the acceptance stands.
			if (pageStore.suggestions[fieldId]?.status === 'accepted') return;
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
	 * `'pending'` is the undo. Accepting puts the rewrite on the mockup as an
	 * unsaved change, so undoing an acceptance cancels that change, which puts
	 * the original copy back and returns the card to waiting.
	 *
	 * `error` stays excluded: an errored card has no `suggested` text, and
	 * letting it become pending would render an empty green paragraph above an
	 * Accept button that writes nothing.
	 */
	function decide(fieldId: string, status: 'accepted' | 'rejected' | 'pending') {
		const current = pageStore.suggestions[fieldId];
		if (!current || current.status === 'error') return;
		if (status === 'accepted') {
			pageStore.acceptSuggestion(fieldId);
			return;
		}
		if (current.status === 'accepted') {
			// Undo takes back the acceptance, not typing done on top of it: the
			// field is restored only while it still says what was accepted.
			// Otherwise the card goes back to waiting and the typing stays, an
			// unsaved change of the reviewer's own.
			const change = pageStore.getChange(current.pageId, fieldId);
			if (change?.value === current.suggested) {
				if (isSavingChange(fieldId)) return;
				pageStore.cancelChange(current.pageId, fieldId);
				if (status === 'pending') return;
			}
		}
		pageStore.suggestions = {
			...pageStore.suggestions,
			[fieldId]: { ...pageStore.suggestions[fieldId], status }
		};
	}

	/**
	 * The bulk path reverses too, or `Accept all` is the same one-way trap at a
	 * coarser grain -- and the easier one to hit, being a single click that
	 * decides every card at once.
	 *
	 * Scoped to this page's cards. `pageStore.suggestions` also holds accepted
	 * work waiting on other pages, and a bulk control in this panel has no
	 * business reaching copy the reviewer cannot see.
	 */
	function decideAll(status: 'accepted' | 'rejected' | 'pending') {
		const from = status === 'pending' ? ['accepted', 'rejected'] : ['pending'];
		for (const [id, s] of cards) {
			if (from.includes(s.status)) decide(id, status);
		}
	}

	/**
	 * Saves every unsaved change on this page, typed or accepted, one field at a
	 * time through the same path as each field's own Save -- so a failure stays
	 * on its field, still unsaved and retryable, and the rest still land.
	 *
	 * The page, its live row and the list are captured before the first await
	 * and handed to every `saveChange`. The panel is not remounted on
	 * navigation, so reading `pageId` inside the loop would, after a navigation
	 * mid-save, save another page's change of the same field id -- or find
	 * none there and count this page's as saved.
	 */
	async function saveAll() {
		if (saving) return;
		saving = true;
		saveError = '';

		const savePageId = pageId;
		const saveLiveId = livePageId;
		const fieldIds = pageStore.unsavedChangesOn(savePageId).map((c) => c.fieldId);
		let failed = 0;
		for (const fieldId of fieldIds) {
			if (!(await saveChange(fieldId, savePageId, saveLiveId))) failed++;
		}

		if (failed > 0) {
			saveError = `${failed} ${failed === 1 ? 'change' : 'changes'} could not be saved and ${failed === 1 ? 'is' : 'are'} still here to retry.`;
		}

		saving = false;
	}
</script>

<div class="flex h-full min-h-0 flex-col">
	<div class="min-h-0 flex-1 overflow-y-auto">
		<!-- Typing is never thrown away by moving the selection. Edits whose field
		     is no longer selected wait here, still on the mockup, until they are
		     saved or discarded. -->
		{#if otherUnsavedChanges.length > 0}
			<section
				class="mx-5 mt-4 rounded-[4px] border-l-2 border-sfds-amber bg-sfds-amber-l1 px-3 py-2"
				aria-labelledby="{uid}-waiting"
			>
				<h3
					id="{uid}-waiting"
					class="text-xs font-bold tracking-[0.06em] text-sfds-black uppercase"
				>
					{otherUnsavedChanges.length} unsaved {otherUnsavedChanges.length === 1
						? 'change'
						: 'changes'}
				</h3>
				<ul class="mt-1.5 space-y-2">
					{#each otherUnsavedChanges as change (change.fieldId)}
						{@const name =
							resolveFields(pageData as never, [change.fieldId])[0]?.field.name ?? change.fieldId}
						<li class="text-xs leading-[1.0625rem] text-sfds-black">
							<span class="font-semibold">{name}:</span>
							<span class="line-clamp-2">{change.value}</span>
							{#if change.savedElsewhere}
								<p class="mt-1 text-sfds-amber" role="status">
									Someone else saved this field after you started. Saving replaces their wording.
								</p>
							{/if}
							{#if errorFor(change.fieldId)}
								<p class="mt-1 text-sfds-red" role="alert">{errorFor(change.fieldId)}</p>
							{/if}
							<span class="mt-1 flex justify-end gap-1">
								<Button
									variant="ghost"
									size="sm"
									class="h-7 px-2 text-xs"
									aria-label="Edit {name} again"
									onclick={() => pageStore.select(change.fieldId, true)}>Edit</Button
								>
								<Button
									variant="ghost"
									size="sm"
									class="h-7 px-2 text-xs"
									aria-label="Discard the change to {name}"
									disabled={isSavingChange(change.fieldId)}
									onclick={() => cancelChange(change.fieldId)}>Discard</Button
								>
								<Button
									size="sm"
									class="h-7 px-2 text-xs"
									aria-label="Save the change to {name}"
									disabled={isSavingChange(change.fieldId)}
									onclick={() => saveChange(change.fieldId)}
								>
									{isSavingChange(change.fieldId) ? 'Saving…' : 'Save'}
								</Button>
							</span>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
		{#if changesElsewhere > 0}
			<p class="mx-5 mt-3 text-xs leading-[1.0625rem] text-sfds-slate-l3" role="status">
				{changesElsewhere} unsaved {changesElsewhere === 1 ? 'change is' : 'changes are'} waiting on other
				pages. They are still there when you go back.
			</p>
		{/if}
		{#if selected.length === 0}
			<div class="px-5 py-6 text-sm text-sfds-slate-l3">
				<p class="font-semibold text-sfds-black">No field selected</p>
				<p class="mt-1.5 leading-5">
					Click any piece of copy in the mockup to select it. Shift-click to add more, and the
					assistant will rewrite them together.
				</p>
			</div>
		{:else}
			<!-- Selection header -->
			<div class="flex items-center justify-between gap-2 border-b px-5 py-3">
				<span class="text-[0.8125rem] font-semibold text-sfds-black">
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

			<ol class="space-y-3 px-5 py-3" aria-label="Selected fields">
				{#each selected as { fieldId, field }, i (fieldId)}
					{@const inputId = `${uid}-edit-${i}`}
					{@const dirty = pageStore.hasUnsavedChange(pageId, fieldId)}
					{@const error = errorFor(fieldId)}
					<li class="text-[0.8125rem]">
						<label for={inputId} class="flex items-start gap-2">
							<span
								class="mt-px inline-flex size-[18px] flex-none items-center justify-center rounded-[3px] bg-sfds-action text-[0.6875rem] font-bold text-white"
							>
								{i + 1}
							</span>
							<span class="min-w-0 truncate text-sfds-slate-l3">{field.name}</span>
						</label>
						<!-- One-way value: the field IS the unsaved change, because every keystroke
						     is written to the mockup through its setter. Esc cancels. -->
						<Textarea
							id={inputId}
							value={field.value}
							rows={2}
							class="mt-1.5 text-[0.8125rem]"
							aria-describedby="{inputId}-hint{error ? ` ${inputId}-error` : ''}"
							aria-invalid={error ? true : undefined}
							oninput={(e) => typeChange(fieldId, e.currentTarget.value)}
							onkeydown={(e) => onChangeKeydown(e, fieldId)}
						/>
						<p id="{inputId}-hint" class="sr-only">Enter saves. Escape cancels.</p>
						{#if error}
							<p
								id="{inputId}-error"
								class="mt-1.5 text-xs leading-[1.0625rem] text-sfds-red"
								role="alert"
							>
								{error}
							</p>
						{/if}
						{#if pageStore.getChange(pageId, fieldId)?.savedElsewhere}
							<p class="mt-1.5 text-xs leading-[1.0625rem] text-sfds-amber" role="status">
								Someone else saved this field after you started. Saving replaces their wording.
							</p>
						{/if}
						<!-- An expired edit (ADR 0001): its wording stays on the mockup, marked,
						     and the base copy now is one step away. Each action starts an unsaved
						     change; Save records it as a new edit anchored to the base now. -->
						{#if !dirty && pageId && pageStore.editStatusOf(pageId, fieldId) === 'expired'}
							<div
								class="mt-1.5 rounded-[4px] border border-sfds-amber bg-sfds-amber-l1 px-2 py-1.5 text-xs leading-[1.0625rem] text-sfds-black"
								role="group"
								aria-label="Expired wording for {field.name}"
							>
								<p>
									<span class="font-semibold">Expired.</span> The base copy changed after this wording
									was saved.
								</p>
								<p class="mt-1">
									<span class="font-semibold">Base copy now:</span>
									{pageStore.baseCopyOf(pageId, fieldId)}
								</p>
								<div class="mt-1.5 flex flex-wrap items-center justify-end gap-1">
									<span class="mr-auto text-sfds-slate-l3">Or edit it above.</span>
									<Button
										variant="ghost"
										size="sm"
										class="h-7 px-2 text-xs"
										onclick={() => pageId && pageStore.keepBaseCopy(pageId, fieldId)}
										>Use the base copy</Button
									>
									<Button
										size="sm"
										class="h-7 px-2 text-xs"
										onclick={() => pageId && pageStore.reconfirmChange(pageId, fieldId)}
										>Re-confirm wording</Button
									>
								</div>
							</div>
						{/if}
						{#if dirty}
							<div class="mt-1.5 flex items-center justify-end gap-1">
								<span class="mr-auto text-[0.6875rem] text-sfds-slate-l3" aria-hidden="true">
									Enter to save · Esc to cancel
								</span>
								<Button
									variant="ghost"
									size="sm"
									class="h-7 px-2 text-xs"
									aria-label="Cancel the change to {field.name}"
									disabled={isSavingChange(fieldId)}
									onclick={() => cancelChange(fieldId)}>Cancel</Button
								>
								<Button
									size="sm"
									class="h-7 px-2 text-xs"
									aria-label="Save the change to {field.name}"
									disabled={isSavingChange(fieldId)}
									onclick={() => saveChange(fieldId)}
								>
									{isSavingChange(fieldId) ? 'Saving…' : 'Save'}
								</Button>
							</div>
						{/if}
					</li>
				{/each}
			</ol>

			{#if stale.length > 0}
				<p
					class="mx-5 rounded-[4px] border-l-2 border-sfds-red bg-sfds-red-l1 px-3 py-2 text-xs text-sfds-red"
				>
					{stale.length}
					{stale.length === 1 ? 'selection is' : 'selections are'} no longer on this page and will be
					ignored.
				</p>
			{/if}

			{#if unverified.length > 0}
				<div
					class="mx-5 mt-3 rounded-[4px] border-l-2 border-sfds-amber bg-sfds-amber-l1 px-3 py-2"
				>
					<p class="text-xs font-bold tracking-[0.06em] text-sfds-amber uppercase">
						Unverified copy
					</p>
					<p class="mt-1 text-xs leading-[1.0625rem] text-sfds-black">
						{unverified.length}
						{unverified.length === 1 ? 'field has' : 'fields have'} no confirmed source. HHVC has to confirm
						the facts before this ships, whatever the wording.
					</p>
					<ul class="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-sfds-black">
						{#each unverified as { fieldId, field } (fieldId)}
							<li>{field.name}{field.unverifiedReason ? ` — ${field.unverifiedReason}` : ''}</li>
						{/each}
					</ul>
				</div>
			{/if}

			<!-- Agent recommendation -->
			<section class="mx-5 mt-4 rounded-[4px] border p-3" aria-label="Assistant recommendation">
				<div class="flex items-center justify-between gap-2">
					<span class="text-xs font-bold tracking-[0.06em] text-sfds-black uppercase">
						What to change
					</span>
					<Button
						variant="outline"
						size="sm"
						class="h-7 px-2 text-xs"
						disabled={pageStore.agentRec.state === 'loading'}
						onclick={recommend}
					>
						{pageStore.agentRec.state === 'loading' ? 'Reading…' : 'Ask'}
					</Button>
				</div>

				{#if pageStore.agentRec.state === 'idle'}
					<p class="mt-2 text-xs leading-[1.0625rem] text-sfds-slate-l3">
						Ask the assistant what it would change about the selected copy before rewriting it.
					</p>
				{:else if pageStore.agentRec.state === 'loading'}
					<p class="mt-2 text-xs text-sfds-slate-l3" role="status">Reading the selection…</p>
				{:else if pageStore.agentRec.state === 'error'}
					<p class="mt-2 text-xs leading-[1.0625rem] text-sfds-red" role="alert">
						{pageStore.agentRec.text}
					</p>
				{:else}
					<p class="mt-2 text-[0.8125rem] leading-[1.1875rem] text-sfds-black">
						{pageStore.agentRec.text}
					</p>
				{/if}
			</section>

			<!-- Batch rewrite -->
			<section class="mx-5 mt-4" aria-label="Rewrite">
				<div class="flex flex-wrap gap-2">
					{#each PRESETS as preset (preset.label)}
						<Button
							variant="outline"
							size="sm"
							class="h-8 text-xs"
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
					class="mt-2 text-[0.8125rem]"
					maxlength={MAX_INSTRUCTION_CHARS}
					aria-label="Rewrite instruction"
					placeholder="Or describe the change in your own words…"
				/>
				{#if instructionError}
					<p class="mt-1.5 text-xs leading-[1.0625rem] text-sfds-red" role="alert">
						{instructionError}
					</p>
				{/if}
				{#if rewriteNotice}
					<p class="mt-1.5 text-xs leading-[1.0625rem] text-sfds-amber" role="status">
						{rewriteNotice}
					</p>
				{/if}
				<Button
					size="sm"
					class="mt-2 h-8 w-full text-xs"
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
						<span class="text-xs font-bold tracking-[0.06em] text-sfds-black uppercase">
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
									class="h-7 px-2 text-xs"
									onclick={() => decideAll('pending')}>Undo all</Button
								>
							{/if}
							{#if pendingCount > 0}
								<Button
									variant="ghost"
									size="sm"
									class="h-7 px-2 text-xs"
									onclick={() => decideAll('rejected')}>Reject all</Button
								>
								<Button
									variant="ghost"
									size="sm"
									class="h-7 px-2 text-xs text-sfds-action"
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
											class="inline-flex size-[18px] flex-none items-center justify-center rounded-[3px] bg-sfds-action text-[0.6875rem] font-bold text-white"
										>
											{badge}
										</span>
									{/if}
									<span class="min-w-0 flex-1 truncate text-xs text-sfds-slate-l3">
										{resolveFields(pageData as never, [fieldId])[0]?.field.name ?? fieldId}
									</span>
									{#if suggestion.status === 'accepted'}
										<span class="text-[0.6875rem] font-bold text-sfds-green uppercase"
											>Accepted</span
										>
									{:else if suggestion.status === 'rejected'}
										<span class="text-[0.6875rem] font-bold text-sfds-slate-l3 uppercase"
											>Rejected</span
										>
									{/if}
								</div>

								{#if suggestion.status === 'error'}
									<p class="mt-2 text-xs leading-[1.0625rem] text-sfds-red" role="alert">
										{suggestion.message}
									</p>
								{:else}
									<!-- Deleted and inserted copy as separate paragraphs, never
									     interleaved: these are two different sentences, and an
									     inline word-diff of prose reads as neither of them. -->
									<p
										class="mt-2 rounded-[3px] bg-sfds-red-l1 px-2 py-1.5 text-[0.8125rem] leading-[1.1875rem] text-sfds-black line-through decoration-1"
									>
										{suggestion.original}
									</p>
									<p
										class="mt-1.5 rounded-[3px] bg-sfds-green-l1 px-2 py-1.5 text-[0.8125rem] leading-[1.1875rem] text-sfds-black"
									>
										{suggestion.suggested}
									</p>
								{/if}

								{#if suggestion.status === 'pending'}
									<div class="mt-2 flex justify-end gap-1">
										<Button
											variant="ghost"
											size="sm"
											class="h-7 px-2 text-xs"
											onclick={() => decide(fieldId, 'rejected')}>Reject</Button
										>
										<Button
											size="sm"
											class="h-7 px-2 text-xs"
											disabled={pageStore.hasUnsavedChange(pageId, fieldId)}
											title={pageStore.hasUnsavedChange(pageId, fieldId)
												? 'Save or cancel your unsaved change to this field first'
												: undefined}
											onclick={() => decide(fieldId, 'accepted')}>Accept</Button
										>
									</div>
								{:else if suggestion.status !== 'error'}
									<!-- Accepting is undoable until Save records it, and `original`
									     was captured with the rewrite, so there is always something
									     to go back to. Without this an accidental Accept could only
									     be undone by `Clear`, which throws the whole batch away. -->
									<div class="mt-2 flex justify-end">
										<Button
											variant="ghost"
											size="sm"
											class="h-7 px-2 text-xs"
											aria-label="Undo {suggestion.status === 'accepted'
												? 'accepting'
												: 'rejecting'} this rewrite"
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

	<!-- Footer. `Save N changes` counts this page's UNSAVED CHANGES -- typed or
	     accepted -- not selected fields: they look alike and are routinely
	     different numbers. Changes on other pages are named at the top of the
	     panel, not counted here: this button cannot save them. -->
	<!-- Only when there is something in play: a selection, an unsaved change on
	     this page, a save running or its error. With none, the panel's own
	     empty state already says what to do, and a permanent disabled "No
	     changes to save" bar was the loudest thing on it. Changes on OTHER pages
	     are named at the top of the panel; this button cannot save them. -->
	{#if selected.length > 0 || unsavedHere > 0 || saving || saveError}
		<div class="flex-none border-t px-5 py-3">
			{#if saveError}
				<p class="mb-2 text-xs leading-[1.0625rem] text-sfds-amber" role="status">{saveError}</p>
			{/if}
			{#if sessionStore.knownSignedOut}
				<p class="mb-2 text-xs leading-[1.0625rem] text-sfds-slate-l3">
					<a
						href={resolve('/login')}
						class="font-semibold text-sfds-action underline underline-offset-2">Sign in</a
					> to save changes
				</p>
			{/if}
			<!-- Disabled keeps its label legible: the default 50% opacity left
		     white-on-blue text well under 4.5:1. -->
			<Button
				class="w-full disabled:bg-muted disabled:text-sfds-slate-l3 disabled:opacity-100"
				disabled={unsavedHere === 0 || saving || sessionStore.knownSignedOut}
				onclick={saveAll}
			>
				<!-- "Save 0 changes" named an action that cannot happen; at zero the
			     disabled button says why it is disabled instead. -->
				{saving
					? 'Saving…'
					: unsavedHere === 0
						? 'No changes to save'
						: `Save ${unsavedHere} ${unsavedHere === 1 ? 'change' : 'changes'}`}
			</Button>
		</div>
	{/if}
</div>
