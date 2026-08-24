<!-- src/lib/components/workspace/RethinkPanel.svelte -->
<script lang="ts">
	/**
	 * The Rethink tab: reconsider a whole section, block by block.
	 *
	 * Slice 1 is READ-ONLY. There is deliberately no Apply control here: the
	 * structural half of a proposal cannot survive a reload until the
	 * accepted-edit overlay exists, and a button that silently loses added
	 * copy is worse than no button.
	 */
	import { Button } from '$lib/components/ui/button/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { pageStore } from '$lib/stores/pageData.svelte';
	import { requestRethink } from '$lib/rethink/request';
	import type { Op } from '$lib/rethink/diff';

	let { pageData }: { pageData: unknown } = $props();

	const pageId = $derived((pageData as { id?: string } | undefined)?.id);
	const sectionKey = $derived(pageStore.selectedSectionKey);

	const heading = $derived.by(() => {
		const sections = (pageData as { sections?: { fieldKey?: string; heading?: string }[] })
			?.sections;
		return (sections ?? []).find((s) => s.fieldKey === sectionKey)?.heading ?? sectionKey;
	});

	let instruction = $state('');
	let controller: AbortController | undefined;

	const KIND_LABEL: Record<string, string> = {
		heading: 'heading',
		paragraph: 'paragraph',
		bullet: 'bullet',
		calloutTitle: 'callout title',
		calloutText: 'callout text'
	};

	const opLabel = (op: Op) => `${op.type} ${KIND_LABEL[op.kind] ?? op.kind}`;

	async function run() {
		if (!sectionKey || !pageId) return;
		if (pageStore.rethink.state === 'loading') return;

		// Captured before the request. A slow answer must not land on a section
		// the reviewer has since left -- the guard `recommend()` already uses.
		const requestPageId = pageId;
		const requestSectionKey = sectionKey;
		const current = () =>
			pageStore.selectedSectionKey === requestSectionKey &&
			(pageData as { id?: string } | undefined)?.id === requestPageId;

		controller = new AbortController();
		pageStore.rethink = { state: 'loading', pageId: requestPageId, sectionKey: requestSectionKey };

		try {
			const result = await requestRethink({
				page: pageData,
				pageId: requestPageId,
				sectionKey: requestSectionKey,
				instruction: instruction.trim() || undefined,
				signal: controller.signal
			});
			if (!current()) return;
			pageStore.rethink = {
				state: 'ready',
				pageId: requestPageId,
				sectionKey: requestSectionKey,
				result,
				decisions: {}
			};
		} catch (e) {
			if (!current()) return;
			const message =
				e instanceof Error && e.name === 'AbortError'
					? 'Cancelled.'
					: e instanceof Error
						? e.message
						: 'Could not reach the assistant.';
			pageStore.rethink = { state: 'error', message };
		} finally {
			controller = undefined;
		}
	}

	function cancel() {
		controller?.abort();
	}
</script>

<div class="flex h-full min-h-0 flex-col">
	<div class="min-h-0 flex-1 overflow-y-auto">
		{#if !sectionKey}
			<div class="px-5 py-6 text-sm">
				<p class="font-semibold">No section selected</p>
				<p class="mt-1.5 leading-[20px]">
					Choose <strong>Rethink section</strong> on any section of the mockup. The assistant will reconsider
					how it is written and structured, and say what it thinks is missing.
				</p>
			</div>
		{:else}
			<div class="border-b px-5 py-3">
				<span class="text-[13px] font-semibold">{heading}</span>
			</div>

			<section class="mx-5 mt-4" aria-label="Rethink">
				<Textarea
					bind:value={instruction}
					rows={2}
					class="text-[13px]"
					aria-label="What should this section accomplish?"
					placeholder="Optional: what should this section accomplish?"
				/>
				<div class="mt-2 flex gap-2">
					<Button
						size="sm"
						class="h-8 flex-1 text-[12px]"
						disabled={pageStore.rethink.state === 'loading'}
						onclick={run}
					>
						{pageStore.rethink.state === 'loading' ? 'Rethinking…' : 'Rethink this section'}
					</Button>
					{#if pageStore.rethink.state === 'loading'}
						<Button variant="outline" size="sm" class="h-8 text-[12px]" onclick={cancel}>
							Cancel
						</Button>
					{/if}
				</div>
				{#if pageStore.rethink.state === 'loading'}
					<p class="mt-2 text-[12px]" role="status">
						Reading the whole section. This usually takes about 30 seconds.
					</p>
				{/if}
			</section>

			{#if pageStore.rethink.state === 'error'}
				<p class="mx-5 mt-4 text-[12px] leading-[17px]" role="alert">
					{pageStore.rethink.message}
				</p>
			{/if}

			{#if pageStore.rethink.state === 'ready'}
				{@const result = pageStore.rethink.result}
				{#if result.rationale}
					<section class="mx-5 mt-4 rounded-[4px] border p-3" aria-label="Why">
						<span class="text-[12px] font-bold tracking-[0.06em] uppercase">Why</span>
						<p class="mt-1.5 text-[13px] leading-[19px]">{result.rationale}</p>
					</section>
				{/if}

				<ul class="mt-4 space-y-2 px-5 pb-4" aria-label="Proposed changes">
					{#each result.ops.filter((op) => op.type !== 'keep') as op (op.id)}
						<li class="rounded-[4px] border p-3">
							<label class="flex items-start gap-2 text-[12px]">
								<input
									type="checkbox"
									class="mt-0.5"
									aria-label={opLabel(op)}
									checked={pageStore.isOpAccepted(op)}
									onchange={(event) => pageStore.setOpAccepted(op.id, event.currentTarget.checked)}
								/>
								<span class="font-bold tracking-[0.06em] uppercase">{opLabel(op)}</span>
							</label>

							{#if op.type === 'rewrite'}
								<p class="mt-2 rounded-[3px] px-2 py-1.5 text-[13px] leading-[19px] line-through">
									{op.from}
								</p>
								<p class="mt-1.5 rounded-[3px] px-2 py-1.5 text-[13px] leading-[19px]">{op.to}</p>
								{#if op.moved}
									<p class="mt-1 text-[12px]">Also moves position.</p>
								{/if}
							{:else if op.type === 'add'}
								<p class="mt-2 rounded-[3px] px-2 py-1.5 text-[13px] leading-[19px]">{op.text}</p>
								<p class="mt-1 text-[12px]">
									Unverified — proposed by the assistant, with no confirmed source.
								</p>
							{:else}
								<p class="mt-2 rounded-[3px] px-2 py-1.5 text-[13px] leading-[19px]">{op.text}</p>
							{/if}
						</li>
					{/each}
				</ul>

				{#if result.otherSections.length > 0}
					<p class="mx-5 mb-4 text-[12px] leading-[17px]" role="status">
						The assistant also proposed changes to {result.otherSections.join(', ')}. Those are not
						applied here — rethink that section to see them.
					</p>
				{/if}

				<p class="mx-5 mb-4 text-[12px] leading-[17px]">
					{result.disclosure}
					{result.model ? ` (${result.model})` : ''}
				</p>
			{/if}
		{/if}
	</div>
</div>
