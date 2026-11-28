<!-- src/lib/components/workspace/RethinkPanel.svelte -->
<script lang="ts">
	/**
	 * The Rethink tab: AI-generated page suggestions grouped into Plain language,
	 * Structure, and Code & scope cards, each sendable to Decision notes.
	 */
	import { ArrowRight, RotateCw } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import { requestGeneration } from '$lib/ai/generate';
	import { pageStore, type SuggestionCategory } from '$lib/stores/pageData.svelte';
	import { pagesStore, updatePageNotes } from '$lib/stores/reviewState';
	import { sessionStore } from '$lib/stores/session.svelte';

	let {
		pageData,
		active = true,
		onGoToDecision
	}: {
		pageData: unknown;
		active?: boolean;
		onGoToDecision?: () => void;
	} = $props();

	const pageId = $derived((pageData as { id?: string } | undefined)?.id);
	const sectionKey = $derived(pageStore.selectedSectionKey);
	const suggestionState = $derived(pageStore.getPageSuggestions(pageId));
	const liveRecord = $derived($pagesStore.find((p) => p.path === pageId));

	const CATEGORIES: { key: SuggestionCategory; label: string }[] = [
		{ key: 'plainLanguage', label: 'Plain language' },
		{ key: 'structure', label: 'Structure' },
		{ key: 'codeAndScope', label: 'Code & scope' }
	];

	let controller: AbortController | undefined;
	let sendingCategory = $state<SuggestionCategory | null>(null);
	let sendError = $state('');

	async function generate(force = false) {
		if (!pageId || !pageData || typeof pageData !== 'object') return;
		if (sessionStore.knownSignedOut) return;
		const currentState = pageStore.getPageSuggestions(pageId);
		if (!force && currentState.status !== 'idle') return;
		if (currentState.status === 'loading') return;

		const requestPageId = pageId;
		const mine = new AbortController();
		controller?.abort();
		controller = mine;
		sendError = '';
		pageStore.setPageSuggestions(requestPageId, { status: 'loading' });

		try {
			const response = await requestGeneration(
				{
					task: 'page-suggestions',
					page: pageData,
					...(sectionKey ? { sectionKey } : {})
				},
				mine.signal
			);
			if (mine.signal.aborted) return;

			const res = response?.result as Record<string, unknown> | undefined;
			const plainLanguage = typeof res?.plainLanguage === 'string' ? res.plainLanguage.trim() : '';
			const structure = typeof res?.structure === 'string' ? res.structure.trim() : '';
			const codeAndScope = typeof res?.codeAndScope === 'string' ? res.codeAndScope.trim() : '';
			if (!plainLanguage || !structure || !codeAndScope) {
				throw new Error('The assistant returned incomplete suggestions.');
			}

			pageStore.setPageSuggestions(requestPageId, {
				status: 'ready',
				plainLanguage,
				structure,
				codeAndScope,
				disclosure: typeof response?.disclosure === 'string' ? response.disclosure : '',
				model: typeof response?.model === 'string' ? response.model : '',
				sent: { plainLanguage: false, structure: false, codeAndScope: false }
			});
		} catch (err) {
			if (mine.signal.aborted) {
				if (pageStore.getPageSuggestions(requestPageId).status === 'loading') {
					pageStore.setPageSuggestions(requestPageId, { status: 'idle' });
				}
				return;
			}
			pageStore.setPageSuggestions(requestPageId, {
				status: 'error',
				message: err instanceof Error ? err.message : 'Could not reach the assistant.'
			});
		} finally {
			if (controller === mine) controller = undefined;
		}
	}

	function cancel() {
		controller?.abort();
	}

	$effect(() => {
		const id = pageId;
		const isActive = active;
		const signedOut = sessionStore.knownSignedOut;
		if (!isActive || !id || signedOut) return;
		untrack(() => {
			if (pageStore.getPageSuggestions(id).status === 'idle') {
				void generate(false);
			}
		});
		return () => {
			controller?.abort();
		};
	});

	async function sendToNotes(category: SuggestionCategory, label: string, text: string) {
		if (!pageId || !liveRecord || sendingCategory) return;
		sendError = '';
		sendingCategory = category;
		const existing = (liveRecord.manager_notes ?? '').trim();
		const entry = `[${label}] ${text}`;
		const nextNotes = existing ? `${existing}\n\n${entry}` : entry;
		const saved = await updatePageNotes(liveRecord.id, nextNotes);
		sendingCategory = null;
		if (saved) {
			pageStore.markSuggestionSent(pageId, category);
		} else {
			sendError = 'Could not save to Decision notes. Try again.';
		}
	}
</script>

<div class="flex h-full min-h-0 flex-col">
	<div class="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
		{#if sessionStore.knownSignedOut}
			<div class="rounded-lg border border-border bg-background p-4 text-sm text-sfds-slate-l3">
				<p class="font-semibold text-sfds-black">Sign in for AI Rethink suggestions</p>
				<p class="mt-1.5 text-xs leading-5">
					<a
						href={resolve('/login')}
						class="font-semibold text-sfds-action underline underline-offset-2">Sign in</a
					> to generate plain-language, structure, and Karl scope suggestions for this page.
				</p>
			</div>
		{:else if suggestionState.status === 'loading'}
			<div class="rounded-lg border border-border bg-background p-4">
				<p class="text-sm font-medium text-sfds-black" role="status">
					Reviewing this page for Rethink suggestions…
				</p>
				<p class="mt-1 text-xs text-sfds-slate-l3">
					Checking plain language, structure, and Karl scope.
				</p>
				<Button variant="outline" size="sm" class="mt-3 h-7 text-xs" onclick={cancel}>
					Cancel
				</Button>
			</div>
		{:else if suggestionState.status === 'error'}
			<div class="rounded-lg border border-sfds-red bg-sfds-red-l1 p-4">
				<p class="text-xs leading-5 text-sfds-red" role="alert">{suggestionState.message}</p>
				<Button
					variant="outline"
					size="sm"
					class="mt-3 h-7 bg-background text-xs"
					onclick={() => generate(true)}
				>
					Try again
				</Button>
			</div>
		{:else if suggestionState.status === 'idle'}
			<div class="rounded-lg border border-border bg-background p-4">
				<p class="text-sm font-medium text-sfds-black">No suggestions generated yet</p>
				<Button size="sm" class="mt-3 h-8 text-xs" onclick={() => generate(true)}>
					Generate suggestions
				</Button>
			</div>
		{:else}
			<div class="flex items-center justify-between gap-2">
				<span class="text-xs font-medium text-sfds-slate-l3">AI suggestions for this page</span>
				<Button
					variant="ghost"
					size="sm"
					class="h-7 gap-1 px-2 text-xs text-sfds-slate-l3"
					onclick={() => generate(true)}
				>
					<RotateCw class="size-3" aria-hidden="true" />
					Regenerate
				</Button>
			</div>

			{#if sendError}
				<p class="rounded-md bg-sfds-red-l1 px-3 py-2 text-xs text-sfds-red" role="alert">
					{sendError}
				</p>
			{/if}

			{#each CATEGORIES as cat (cat.key)}
				{@const suggestionText = suggestionState[cat.key]}
				{@const sent = suggestionState.sent[cat.key]}
				<section class="rounded-lg border border-border bg-background p-3.5" aria-label={cat.label}>
					<span
						class="inline-flex items-center rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-[0.6875rem] font-semibold text-sfds-black"
					>
						{cat.label}
					</span>
					<p class="mt-2.5 text-[0.8125rem] leading-5 text-sfds-black">
						{suggestionText}
					</p>
					<div class="mt-3 flex justify-end">
						<Button
							variant="outline"
							size="sm"
							class="h-7 px-2.5 text-xs"
							disabled={!liveRecord || sendingCategory === cat.key || sent}
							onclick={() => sendToNotes(cat.key, cat.label, suggestionText)}
						>
							{#if sendingCategory === cat.key}
								Sending…
							{:else if sent}
								Sent to Decision notes
							{:else}
								Send to Decision notes
							{/if}
						</Button>
					</div>
				</section>
			{/each}

			{#if !liveRecord}
				<p class="text-xs text-sfds-slate-l3">
					No review record loaded — open a review session to send suggestions to Decision notes.
				</p>
			{/if}

			{#if suggestionState.disclosure}
				<p class="text-[0.6875rem] leading-4 text-sfds-slate-l3">
					{suggestionState.disclosure}{suggestionState.model ? ` (${suggestionState.model})` : ''}
				</p>
			{/if}
		{/if}
	</div>

	<div class="flex-none border-t border-border bg-background px-4 py-3">
		<button
			type="button"
			class="flex w-full items-center justify-between gap-2 text-sm font-semibold text-sfds-black hover:text-sfds-action"
			onclick={() => onGoToDecision?.()}
		>
			<span>Go to Decision</span>
			<ArrowRight class="size-4 shrink-0" aria-hidden="true" />
		</button>
	</div>
</div>
