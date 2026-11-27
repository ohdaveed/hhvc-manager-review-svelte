<script lang="ts">
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import Layers from '@lucide/svelte/icons/layers';
	import LayoutTemplate from '@lucide/svelte/icons/layout-template';
	import PanelTop from '@lucide/svelte/icons/panel-top';
	import { Button } from '$lib/components/ui/button/index.js';
	import { pageStore } from '$lib/stores/pageData.svelte';
	import { pagesStore } from '$lib/stores/reviewState';

	let {
		pageId,
		views = true
	}: {
		pageId?: string;
		/** Offer the three canvas views. Off on drafts, which have no Karl outline. */
		views?: boolean;
	} = $props();

	const approved = $derived($pagesStore.find((p) => p.path === pageId)?.status === 'approved');

	// Steps already ticked off in the walkthrough, on this device. A count, not
	// "N of M": the total needs the walkthrough built, and the panel is not the
	// place to walk the page against the whole Karl inventory just to say it.
	const copiedHere = $derived(pageId ? (pageStore.copiedSteps[pageId]?.length ?? 0) : 0);

	/**
	 * What the canvas shows. Three states of two store fields: the blueprint is
	 * a mode of its own, and the overlay is the mockup with its Karl fields
	 * outlined. One pressed button at a time, so it reads as a choice of view
	 * rather than a switch and a button that could disagree.
	 */
	const view = $derived(
		pageStore.mode === 'blueprint' ? 'blueprint' : pageStore.karlOutline ? 'overlay' : 'mockup'
	);

	const VIEWS = [
		{ id: 'mockup', label: 'Mockup', hint: 'The page as it would appear', icon: PanelTop },
		{
			id: 'blueprint',
			label: 'Build in Karl',
			hint: 'Its Karl blocks, beside the mockup',
			icon: LayoutTemplate
		},
		{ id: 'overlay', label: 'Overlay', hint: 'The mockup with Karl fields marked', icon: Layers }
	] as const;

	function show(id: (typeof VIEWS)[number]['id']) {
		if (id === 'blueprint') {
			pageStore.showBlueprint();
			return;
		}
		if (pageStore.mode === 'blueprint') pageStore.showReview();
		pageStore.setKarlOutline(id === 'overlay');
	}
</script>

<div class="flex flex-col gap-4 p-3">
	{#if views}
		<div role="group" aria-label="Karl views" class="flex flex-col gap-2">
			{#each VIEWS as v (v.id)}
				<button
					type="button"
					aria-pressed={view === v.id}
					onclick={() => show(v.id)}
					class="flex min-h-16 items-center gap-3.5 rounded-xl px-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sfds-black {view ===
					v.id
						? 'border-2 border-sfds-action bg-sfds-blue-l1 text-sfds-blue-dark'
						: 'border border-slate-300 bg-white text-sfds-black hover:bg-sfds-blue-l1/60'}"
				>
					<v.icon class="size-[1.375rem] shrink-0" aria-hidden="true" />
					<span class="flex min-w-0 flex-col">
						<span class="font-semibold">{v.label}</span>
						<span class="text-[0.8125rem] font-normal text-sfds-slate-l3">{v.hint}</span>
					</span>
				</button>
			{/each}
		</div>
	{/if}

	<!-- The way into the walkthrough, and its only entry besides the landing
	     list's Move to Karl. It says what it is for, because a button name alone
	     did not tell anyone the transfer step existed. -->
	<section
		class="space-y-3 rounded-xl bg-white p-3.5 shadow-[0_0_0_1px_var(--color-sfds-grey-l2)]"
		aria-labelledby="karl-handoff"
	>
		<div class="flex items-baseline justify-between gap-2">
			<h3 id="karl-handoff" class="text-sm font-bold">Move it into Karl</h3>
			{#if approved}
				<span class="text-xs font-semibold text-sfds-green">Ready to move</span>
			{/if}
		</div>
		<p class="text-sm text-sfds-black">
			The Karl walkthrough takes you through this page one Karl field at a time, with the copy ready
			to paste and anything that won’t carry over flagged.
		</p>
		<Button
			variant={approved ? 'default' : 'outline'}
			class="h-10 w-full gap-1.5"
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
</div>
