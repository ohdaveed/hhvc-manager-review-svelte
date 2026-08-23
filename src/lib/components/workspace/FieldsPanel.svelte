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
	import { pageStore } from '$lib/stores/pageData.svelte';
	import { saveInlineEdit } from '$lib/stores/reviewState';

	let { pageData, livePageId }: { pageData: unknown; livePageId?: string } = $props();

	/** The proxy's own cap. Checked here because `requestGeneration` throws a
	 *  bare `API Error` and would report a 400 "Field text too long" as that. */
	const MAX_FIELD_TEXT_CHARS = 8_000;

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

	const acceptedCount = $derived(
		Object.values(pageStore.suggestions).filter((s) => s.status === 'accepted').length
	);
	const pendingCount = $derived(
		Object.values(pageStore.suggestions).filter((s) => s.status === 'pending').length
	);

	let rewriting = $state(false);
	let saving = $state(false);
	let saveError = $state('');

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
		rewriting = true;

		const requestPageId = (pageData as { id?: string })?.id;
		const requestFields = selected.map(({ fieldId, field }) => ({ fieldId, field }));

		await Promise.allSettled(
			requestFields.map(async ({ fieldId, field }) => {
				if (field.value.length > MAX_FIELD_TEXT_CHARS) {
					pageStore.suggestions = { ...pageStore.suggestions, [fieldId]: {
						pageId: requestPageId, original: field.value, suggested: '', status: 'error',
						message: `Too long to rewrite (${field.value.length.toLocaleString()} characters; the limit is ${MAX_FIELD_TEXT_CHARS.toLocaleString()}).`
					} };
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
					pageStore.suggestions = { ...pageStore.suggestions, [fieldId]: {
						pageId: requestPageId, original: field.value, suggested, status: 'pending'
					} };
				} catch (e) {
					pageStore.suggestions = { ...pageStore.suggestions, [fieldId]: {
						pageId: requestPageId, original: field.value, suggested: '', status: 'error',
						message: e instanceof Error ? e.message : 'Rewrite failed.'
					} };
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
		pageStore.agentRec = { state: 'loading', text: '' };
		const fieldText = selected.map(({ field }) => `${field.name}: ${field.value}`).join('\n\n`);
		if (fieldText.length > MAX_FIELD_TEXT_CHARS) {
			pageStore.agentRec = { state: 'error', text: `Too long to recommend (the limit is ${MAX_FIELD_TEXT_CHARS.toLocaleString()} characters).` };
			return;
		}
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
			pageStore.agentRec = { state: 'done', text };
		} catch (e) {
			pageStore.agentRec = {
				state: 'error',
				text: e instanceof Error ? e.message : 'Could not reach the assistant.'
			};
		}
	}

	function decide(fieldId: string, status: 'accepted' | 'rejected') {
		const current = pageStore.suggestions[fieldId];
		if (!current || current.status === 'error') return;
		pageStore.suggestions = { ...pageStore.suggestions, [fieldId]: { ...current, status } };
	}

	function decideAll(status: 'accepted' | 'rejected') {
		const next = { ...pageStore.suggestions };
		for (const [id, s] of Object.entries(next)) {
			if (s.status === 'pending') next[id] = { ...s, status };
		}
		pageStore.suggestions = next;
	}

	/**
	 * Writes every accepted suggestion into the corpus and persists it.
	 *
	 * The in-memory write always runs, so the mockup reflects the decision even
	 * with no live review row; `saveInlineEdit` is what needs one, and it rolls
	 * its own optimistic entry back when there is no authenticated user.
	 */
	async function saveAccepted() {
		if (saving) return;
		saving = true;
		saveError = '';

		const savePageData = pageData;
		const savePageId = livePageId;
		const accepted = Object.entries(pageStore.suggestions).filter(
			([, s]) => s.status === 'accepted' && (!s.pageId || s.pageId === (savePageData as { id?: string })?.id)
		);
		const missing: string[] = [];

		for (const [fieldId, suggestion] of accepted) {
			const resolved = resolveFields(savePageData as never, [fieldId])[0];
			if (!resolved) {
				missing.push(fieldId);
				continue;
			}
			resolved.field.set(suggestion.suggested);
			if (savePageId) {
				const persisted = await saveInlineEdit(savePageId, fieldId, suggestion.suggested);
				if (!persisted) {
					saveError = 'Some edits could not be saved; they remain available to retry.';
					continue;
				}
			}
			pageStore.forgetSuggestion(fieldId);
		}

		if (missing.length > 0) {
			saveError = `${missing.length} ${missing.length === 1 ? 'edit' : 'edits'} could not be applied: the field is no longer on this page.`;
		} else if (!livePageId) {
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
					aria-label="Rewrite instruction"
					placeholder="Or describe the change in your own words…"
				/>
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
			{#if Object.keys(pageStore.suggestions).length > 0}
				<section class="mt-5" aria-label="Suggestions">
					<div class="flex items-center justify-between px-5">
						<span class="text-sfds-black text-[12px] font-bold tracking-[0.06em] uppercase">
							Suggestions
						</span>
						{#if pendingCount > 0}
							<span class="flex gap-1">
								<Button
									variant="ghost"
									size="sm"
									class="h-7 px-2 text-[12px]"
									onclick={() => decideAll('rejected')}>Reject all</Button
								>
								<Button
									variant="ghost"
									size="sm"
									class="text-sfds-action h-7 px-2 text-[12px]"
									onclick={() => decideAll('accepted')}>Accept all</Button
								>
							</span>
						{/if}
					</div>

					<ul class="mt-2 space-y-2 px-5 pb-4">
						{#each Object.entries(pageStore.suggestions) as [fieldId, suggestion] (fieldId)}
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
		{#if saveError}
			<p class="text-sfds-amber mb-2 text-[12px] leading-[17px]" role="status">{saveError}</p>
		{/if}
		<Button class="w-full" disabled={acceptedCount === 0 || saving} onclick={saveAccepted}>
			{saving ? 'Saving…' : `Save ${acceptedCount} ${acceptedCount === 1 ? 'edit' : 'edits'}`}
		</Button>
	</div>
</div>
