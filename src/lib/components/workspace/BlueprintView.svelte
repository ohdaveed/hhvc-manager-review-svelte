<script lang="ts">
	import KarlChip from '$lib/components/KarlChip.svelte';
	import { outlineSummary, type PagePlacements } from '$lib/karl/placement';

	// Every "Show on page" button's accessible name STARTS with its visible text
	// (WCAG 2.5.3 Label in Name), so a voice-control user saying the words on
	// screen reaches it; the panel name and status follow.

	/**
	 * The Blueprint: the page redrawn as its content type's Karl form, panel by
	 * panel in the form's own order, with this page's copy placed in each slot.
	 *
	 * Three things a rendered mockup cannot show, which is why this view exists:
	 * - an EMPTY panel (dashed: "Contact us (empty)"), including a required one
	 *   Karl will not save without;
	 * - the ORDER Karl will present the copy in, which can differ from the
	 *   mockup's;
	 * - everything that WON'T CARRY OVER, collected in one tray.
	 *
	 * Every slot and tray item that has copy on the page offers "Show on page",
	 * which returns to the mockup with the Karl outline on and focuses it.
	 * Panels disabled by design (`inert`) get no slot: they are nothing to fill.
	 */
	let {
		placements,
		title,
		onExit,
		onShow
	}: {
		placements: PagePlacements;
		title: string;
		onExit: () => void;
		onShow: (fieldId: string) => void;
	} = $props();

	const slots = $derived(placements.panels.filter((p) => !p.inert));
	const MAX_VALUES = 3;
	const statusWord: Record<string, string> = {
		placed: 'placed',
		'needs-fix': 'needs a fix',
		unconfirmed: 'unconfirmed',
		unplaced: 'will not carry over'
	};
</script>

<div class="blueprint">
	<nav class="bp-header" aria-label="Blueprint">
		<div class="bp-head-left">
			<h2 class="bp-title">Blueprint</h2>
			<p class="bp-meta">{title} · {placements.type} form, in Karl’s order</p>
		</div>
		<button type="button" class="bp-exit" onclick={onExit}>Back to review</button>
	</nav>

	<div class="bp-body">
		<p class="bp-summary">{outlineSummary(placements)}</p>

		{#if placements.url}
			<p class="bp-url">
				<strong>URL:</strong>
				{placements.url.pattern}
				{#if placements.url.status === 'unconfirmed'}
					<span class="bp-url-note">— Karl’s own pages disagree on this pattern.</span>
				{/if}
			</p>
		{/if}

		<ol class="bp-slots" aria-label="Karl form panels, in order">
			{#each slots as slot (slot.rawName)}
				<li class="bp-slot" data-filled={slot.filled} data-karl-panel={slot.rawName}>
					{#if slot.filled}
						<div class="bp-slot-head">
							<h3 class="bp-slot-title">{slot.label}</h3>
							<KarlChip status={slot.status} />
						</div>
						{#each slot.reasons as reason, i (i)}
							<p class="bp-reason">{reason}</p>
						{/each}
						<ul class="bp-values">
							{#each slot.values.slice(0, MAX_VALUES) as v, i (i)}
								<li><span class="bp-value-label">{v.label}:</span> {v.value}</li>
							{/each}
						</ul>
						{#if slot.values.length > MAX_VALUES}
							<p class="bp-more">and {slot.values.length - MAX_VALUES} more</p>
						{/if}
						{#if slot.fieldIds.length}
							<button
								type="button"
								class="bp-show"
								aria-label={`Show on page: ${slot.label}, ${statusWord[slot.status]}`}
								onclick={() => onShow(slot.fieldIds[0])}
							>
								Show on page
							</button>
						{/if}
					{:else}
						<h3 class="bp-slot-title">{slot.label} <span class="bp-empty">(empty)</span></h3>
						{#if slot.required}
							<p class="bp-required">Required: Karl won’t save the page without this.</p>
						{/if}
					{/if}
					{#each slot.caveats as caveat, i (i)}
						<p class="bp-caveat">
							<strong>Karl’s rule unconfirmed:</strong>
							{caveat}
						</p>
					{/each}
				</li>
			{/each}
		</ol>

		<section class="bp-tray" aria-labelledby="bp-tray-title">
			<h3 id="bp-tray-title" class="bp-tray-title">Won’t carry over to Karl</h3>
			{#if placements.unplaced.length === 0}
				<p class="bp-tray-empty">Everything on this page has a Karl panel.</p>
			{:else}
				<ul class="bp-tray-list">
					{#each placements.unplaced as item, i (i)}
						<li class="bp-tray-item">
							<p class="bp-tray-subject">{item.subject}</p>
							<p class="bp-tray-reason">{item.reason}</p>
							{#if item.fieldIds.length}
								<button
									type="button"
									class="bp-show"
									aria-label={`Show on page: ${item.subject}`}
									onclick={() => onShow(item.fieldIds[0])}
								>
									Show on page
								</button>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</div>

<style>
	.blueprint {
		display: flex;
		flex-direction: column;
		min-height: 0;
		flex: 1;
	}

	.bp-header {
		height: 48px;
		flex: none;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 0 20px;
		background: #ffffff;
		border-bottom: 1px solid var(--sfds-color-grey-l2);
	}

	.bp-head-left {
		display: flex;
		align-items: baseline;
		gap: 12px;
		min-width: 0;
	}

	.bp-title {
		margin: 0;
		font-family: var(--font-display);
		font-size: 15px;
		font-weight: 700;
	}

	.bp-meta {
		margin: 0;
		font-size: 13px;
		color: #3d4551;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.bp-exit,
	.bp-show {
		flex: none;
		height: 28px;
		padding: 0 12px;
		border: 1px solid var(--sfds-color-grey-l2);
		border-radius: 6px;
		background: #f7f7f7;
		color: #1c2b39;
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
	}

	.bp-show {
		margin-top: 8px;
	}

	.bp-body {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 20px 24px 80px;
		background: #f5f7fa;
	}

	.bp-summary,
	.bp-url {
		max-width: 760px;
		margin: 0 auto 12px;
		font-size: 14px;
		color: #1c2b39;
	}

	.bp-url-note {
		color: #3d4551;
	}

	.bp-slots {
		max-width: 760px;
		margin: 0 auto;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.bp-slot {
		padding: 12px 14px;
		border: 1px solid #c6cdd4;
		border-radius: 6px;
		background: #ffffff;
	}

	/* An empty panel: dashed, and named as empty in text, not by the line alone. */
	.bp-slot[data-filled='false'] {
		border: 2px dashed #8b949e;
		background: transparent;
	}

	.bp-slot-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	.bp-slot-title {
		margin: 0;
		font-size: 15px;
		font-weight: 700;
		color: #1c2b39;
	}

	.bp-slot-head :global(.karl-chip) {
		margin: 0;
	}

	.bp-empty {
		font-weight: 400;
		color: #3d4551;
	}

	.bp-reason {
		margin: 6px 0 0;
		font-size: 13px;
		color: #6f4a00;
	}

	.bp-caveat {
		margin: 6px 0 0;
		font-size: 13px;
		color: #3d4551;
	}

	.bp-required {
		margin: 4px 0 0;
		font-size: 13px;
		color: #8c1d18;
	}

	.bp-values {
		margin: 8px 0 0;
		padding-left: 18px;
		font-size: 13px;
		line-height: 18px;
		color: #1c2b39;
	}

	.bp-values li {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.bp-value-label {
		font-weight: 600;
	}

	.bp-more {
		margin: 4px 0 0;
		font-size: 12px;
		color: #3d4551;
	}

	.bp-tray {
		max-width: 760px;
		margin: 24px auto 0;
		padding: 12px 14px;
		border: 2px solid #b3261e;
		border-radius: 6px;
		background: #fdecea;
	}

	.bp-tray-title {
		margin: 0 0 8px;
		font-size: 15px;
		font-weight: 700;
		color: #8c1d18;
	}

	.bp-tray-empty,
	.bp-tray-reason {
		margin: 0;
		font-size: 13px;
		color: #1c2b39;
	}

	.bp-tray-list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.bp-tray-subject {
		margin: 0 0 2px;
		font-weight: 700;
		font-size: 14px;
		color: #1c2b39;
	}
</style>
