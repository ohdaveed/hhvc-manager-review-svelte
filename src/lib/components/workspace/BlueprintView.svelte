<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Check from '@lucide/svelte/icons/check';
	import Copy from '@lucide/svelte/icons/copy';
	import KarlChip from '$lib/components/KarlChip.svelte';
	import Page from '$lib/components/Page.svelte';
	import SiteFooter from '$lib/components/sfgov/SiteFooter.svelte';
	import SiteHeader from '$lib/components/sfgov/SiteHeader.svelte';
	import { setMockupReadonly } from '$lib/components/mockupReadonly';
	import { setOutlineContext } from '$lib/karl/outlineContext';
	import { outlineSummary, type PagePlacements } from '$lib/karl/placement';
	import { STATUS_LABELS, type ReviewStatus } from '$lib/review/statusLabels';
	import { fitFrame, pageStore } from '$lib/stores/pageData.svelte';

	// Every "Show on page" and "Copy" button's accessible name STARTS with its
	// visible text (WCAG 2.5.3 Label in Name), so a voice-control user saying
	// the words on screen reaches it; the panel name follows.

	/**
	 * The Blueprint: the page as the public sees it, beside the same page as
	 * its content type's Karl form, panel by panel in the form's own order.
	 *
	 * The right column is a build list for whoever enters the page in Karl:
	 * every value a panel takes, each with its own Copy button, and an
	 * "Entered in Karl" check per panel. Picking a panel outlines its copy in
	 * the mockup on the left, and clicking copy in the mockup picks its panel,
	 * so the two columns always say which words go where. Numbers tie them:
	 * a panel's number is drawn on its first piece of copy in the mockup.
	 *
	 * Three things a rendered mockup cannot show, which is why this view exists:
	 * - an EMPTY panel (dashed: "Contact us (empty)"), including a required one
	 *   Karl will not save without;
	 * - the ORDER Karl will present the copy in, which can differ from the
	 *   mockup's;
	 * - everything that WON'T CARRY OVER, collected in one tray.
	 *
	 * The mockup here is read-only (`setMockupReadonly`): edits belong to the
	 * review view, whose unsaved-change count this view never shows. And it
	 * carries no Karl outline -- the right column says all of that, once.
	 * Progress (panels entered, page built) is per device, in `localStorage`,
	 * for the reasons `pageStore.copiedSteps` gives.
	 */
	let {
		placements,
		page,
		pageId,
		status,
		onExit,
		onShow
	}: {
		placements: PagePlacements;
		/** The page as shown in the review: the copy the mockup renders. */
		page: { title?: unknown } & Record<string, unknown>;
		/** The routable id, which progress is stored under. */
		pageId: string;
		/** The review decision; `undefined` when the page is not in the review. */
		status: ReviewStatus | undefined;
		onExit: () => void;
		onShow: (fieldId: string) => void;
	} = $props();

	setOutlineContext({ placements: null, always: null });
	setMockupReadonly();

	const title = $derived(String(page.title ?? ''));
	const slots = $derived(
		placements.panels.filter((p) => !p.inert).map((slot, i) => ({ ...slot, n: i + 1 }))
	);
	const filled = $derived(slots.filter((s) => s.filled));
	const enteredCount = $derived(
		filled.filter((s) => pageStore.isPanelEntered(pageId, s.rawName)).length
	);
	const allEntered = $derived(enteredCount === filled.length);
	const built = $derived(pageStore.isPageBuilt(pageId));
	const fixCount = $derived(slots.filter((s) => s.status === 'needs-fix').length);
	const approved = $derived(status === 'approved');

	const statusWord: Record<string, string> = {
		placed: 'placed',
		'needs-fix': 'needs a fix',
		unconfirmed: 'unconfirmed',
		unplaced: 'will not carry over'
	};

	// ---- which panel is picked ---------------------------------------------

	let picked = $state<string | null>(null);
	// A pick from another page, or none yet, falls back to the first panel
	// with copy on the mockup.
	const active = $derived(
		slots.find((s) => s.rawName === picked && s.fieldIds.length) ??
			slots.find((s) => s.fieldIds.length)
	);

	let mockPane = $state<HTMLElement>();
	let listPane = $state<HTMLElement>();
	let mockPaneWidth = $state(0);

	/** True when `el` is its own scroll container, i.e. the two-column layout. */
	const scrolls = (el: HTMLElement) => getComputedStyle(el).overflowY !== 'visible';

	/**
	 * Scroll a pane, never its ancestors: `scrollIntoView` would also scroll
	 * the workspace's fixed-height grid (see the layout's `showOnPage`).
	 */
	function reveal(pane: HTMLElement | undefined, el: Element | null | undefined) {
		if (!pane || !el || !scrolls(pane)) return;
		const top = el.getBoundingClientRect().top - pane.getBoundingClientRect().top;
		if (top < 0 || top > pane.clientHeight - 64) pane.scrollTop += top - 32;
	}

	const fieldEls = (ids: readonly string[]) =>
		ids.flatMap((id) => [
			...(mockPane?.querySelectorAll<HTMLElement>(`[data-rewrite-field="${CSS.escape(id)}"]`) ?? [])
		]);

	// The panel's number on its first piece of copy. Data attributes, not
	// classes, for the walkthrough drawer's reason: Svelte owns `class`.
	$effect(() => {
		const marked = slots.flatMap((s) => {
			const [first] = fieldEls(s.fieldIds);
			if (!first) return [];
			first.setAttribute('data-bp-n', String(s.n));
			return [first];
		});
		return () => marked.forEach((el) => el.removeAttribute('data-bp-n'));
	});

	// The picked panel's copy, outlined, and scrolled into the mockup pane.
	$effect(() => {
		const els = active ? fieldEls(active.fieldIds) : [];
		els.forEach((el) => el.setAttribute('data-bp-active', ''));
		reveal(mockPane, els[0]);
		return () => els.forEach((el) => el.removeAttribute('data-bp-active'));
	});

	// Clicking copy in the mockup picks its panel. A pointer convenience only:
	// the panel buttons on the right do the same from the keyboard, so this is
	// a listener rather than a handler that would make the copy look operable.
	$effect(() => {
		const pane = mockPane;
		if (!pane) return;
		const onClick = (event: MouseEvent) => {
			const id = (event.target as Element | null)
				?.closest('[data-rewrite-field]')
				?.getAttribute('data-rewrite-field');
			const slot = id ? slots.find((s) => s.fieldIds.includes(id)) : undefined;
			if (!slot) return;
			picked = slot.rawName;
			reveal(listPane, listPane?.querySelector(`[data-karl-panel="${CSS.escape(slot.rawName)}"]`));
		};
		pane.addEventListener('click', onClick);
		return () => pane.removeEventListener('click', onClick);
	});

	// Under Fit the review canvas zooms a 1024px frame down so the page keeps
	// its desktop layout; the mockup pane here does the same, for the same
	// reason (`fitFrame`). Measured on the column's header, which spans the
	// pane's content box.
	const fit = $derived(fitFrame(mockPaneWidth));
	const frameStyle = $derived(
		fit ? `width:${fit.width}px;max-width:none;zoom:${fit.scale};--fit-scale:${fit.scale}` : ''
	);

	// ---- copying -------------------------------------------------------------

	let copied = $state<string | null>(null);
	let failed = $state<string | null>(null);
	let announcement = $state('');
	let copyTimer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => () => clearTimeout(copyTimer));

	async function copyValue(key: string, what: string, value: string) {
		try {
			await navigator.clipboard.writeText(value);
			copied = key;
			failed = null;
			announcement = `Copied ${what}.`;
			clearTimeout(copyTimer);
			copyTimer = setTimeout(() => {
				if (copied === key) copied = null;
			}, 1600);
		} catch {
			// Permission-gated, and unavailable over plain http. The value is on
			// screen and selects in one click, so this is a detour, not a dead end.
			copied = null;
			failed = key;
			announcement = `Couldn’t reach the clipboard. Select the ${what} text and copy it by hand.`;
		}
	}
</script>

<div class="blueprint">
	<nav class="bp-header" aria-label="Blueprint">
		<div class="bp-head-left">
			<h2 class="bp-title">Blueprint</h2>
			<!-- The cards are Karl panels; the summary below counts the mockup's
			     sections. Naming both units keeps "4 sections" over 14 cards from
			     reading as a miscount. -->
			<p class="bp-meta">
				{title} · {placements.type} form, {slots.length}
				{slots.length === 1 ? 'panel' : 'panels'} in Karl’s order, {filled.length} with copy
			</p>
		</div>
		<div class="bp-progress">
			<span class="bp-progress-text">{enteredCount} of {filled.length} entered in Karl</span>
			<span
				class="bp-meter"
				role="img"
				aria-label={`${enteredCount} of ${filled.length} panels entered in Karl`}
			>
				<span
					class="bp-meter-fill"
					style:width={`${filled.length ? (enteredCount / filled.length) * 100 : 0}%`}
				></span>
			</span>
		</div>
		<button type="button" class="bp-exit" onclick={onExit}>
			<ArrowLeft class="size-3.5" aria-hidden="true" />
			Back to review
		</button>
	</nav>

	{#if !approved}
		<div class="bp-approval" role="note">
			<strong class="bp-approval-title">Not approved yet</strong>
			<span class="bp-approval-text">
				{status
					? `This page is ${STATUS_LABELS[status].label} in the review`
					: 'This page has no review decision yet'}{fixCount
					? ` and ${fixCount} Karl ${fixCount === 1 ? 'panel needs' : 'panels need'} a fix`
					: ''}. Don’t publish it in Karl until it’s approved.
			</span>
			<button type="button" class="bp-link" onclick={onExit}>Go to review</button>
		</div>
	{/if}

	<div class="bp-split">
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<!-- `tabindex="0"` for the same conflict the review canvas documents:
		     from 1024px this column scrolls on its own and, read-only, holds
		     nothing focusable, so without a tab stop axe's
		     `scrollable-region-focusable` (serious) fails and a keyboard user
		     cannot scroll it -- measured on three pilot pages. axe gates CI. -->
		<section
			class="bp-col bp-col-mock"
			aria-labelledby="bp-mock-title"
			tabindex="0"
			bind:this={mockPane}
		>
			<div class="bp-col-head" bind:clientWidth={mockPaneWidth}>
				<p id="bp-mock-title" class="bp-col-title">What the public sees</p>
				<p class="bp-col-meta">SF.gov mockup · read only</p>
			</div>
			<figure
				style={frameStyle}
				class="bp-frame mockup-frame mx-auto w-full overflow-hidden rounded-[4px] border border-sfds-grey-l2 bg-site-surface shadow-[0_2px_4px_rgba(12,20,100,.06),0_4px_12px_rgba(12,20,100,.1)]"
			>
				<SiteHeader />
				<div id="mockPage" class="mock-page" data-presenting="">
					<div class="mx-auto max-w-[1076px]">
						<Page {page} />
					</div>
				</div>
				<SiteFooter />
			</figure>
		</section>

		<section class="bp-col bp-col-karl" aria-labelledby="bp-karl-title" bind:this={listPane}>
			<div class="bp-col-head">
				<p id="bp-karl-title" class="bp-col-title">How it’s built in Karl</p>
				<p class="bp-col-meta">
					{placements.type} page{#if fixCount}
						· <strong class="bp-fix-count">{fixCount} to fix</strong>{/if}
				</p>
			</div>

			<p class="bp-summary"><strong>On the mockup:</strong> {outlineSummary(placements)}</p>

			{#if placements.url}
				<p class="bp-url">
					<strong>URL:</strong>
					{placements.url.pattern}
					{#if placements.url.status === 'unconfirmed'}
						<span class="bp-url-note">— Karl’s own pages disagree on this pattern.</span>
					{/if}
				</p>
			{/if}

			{#each placements.pageCaveats as caveat, i (i)}
				<p class="bp-page-caveat"><strong>Before you start:</strong> {caveat}</p>
			{/each}

			<p class="bp-howto">
				Copy each value, then paste it into the matching Karl field. Click a text box to select all
				of it.
			</p>
			<p class="bp-live" role="status" aria-live="polite">{announcement}</p>

			<ol class="bp-slots" aria-label="Karl form panels, in order">
				{#each slots as slot (slot.rawName)}
					{@const on = active?.rawName === slot.rawName}
					{@const entered = pageStore.isPanelEntered(pageId, slot.rawName)}
					<li
						class="bp-slot"
						data-filled={slot.filled}
						data-status={slot.status}
						data-active={on ? '' : undefined}
						data-karl-panel={slot.rawName}
					>
						<div class="bp-slot-head">
							<span class="bp-n" aria-hidden="true">{slot.n}</span>
							{#if slot.filled}
								<h3 class="bp-slot-title">
									{#if slot.fieldIds.length}
										<!-- Picks the panel: outlines its copy in the mockup. -->
										<button
											type="button"
											class="bp-pick"
											aria-pressed={on}
											onclick={() => (picked = slot.rawName)}>{slot.label}</button
										>
									{:else}
										{slot.label}
									{/if}
								</h3>
								<KarlChip status={slot.status} />
							{:else}
								<h3 class="bp-slot-title">
									{slot.label} <span class="bp-empty">(empty)</span>
								</h3>
							{/if}
						</div>

						{#if slot.filled}
							{#each slot.reasons as reason, i (i)}
								<p class="bp-reason">{reason}</p>
							{/each}
							<ul class="bp-values">
								{#each slot.values as v, i (i)}
									{@const key = `${slot.rawName}:${i}`}
									<!-- A one-value panel often names its value as itself ("Page
									     title"): say it once, on screen and in the button's name. -->
									{@const same = v.label === slot.label}
									{@const what = same ? slot.label : `${slot.label}, ${v.label}`}
									<li class="bp-value">
										<div class="bp-value-body">
											{#if !same}<span class="bp-value-label">{v.label}</span>{/if}
											<div class="bp-value-text">{v.value}</div>
										</div>
										<button
											type="button"
											class="bp-copy"
											data-copied={copied === key ? '' : undefined}
											aria-label={`Copy ${what}`}
											onclick={() => copyValue(key, what, v.value)}
										>
											{#if copied === key}
												<Check class="size-3.5" aria-hidden="true" />
												Copied
											{:else}
												<Copy class="size-3.5" aria-hidden="true" />
												Copy
											{/if}
										</button>
									</li>
									{#if failed === key}
										<li class="bp-copy-failed">
											Couldn’t reach the clipboard. Select the text above and copy it by hand.
										</li>
									{/if}
								{/each}
							</ul>
						{:else if slot.required}
							<p class="bp-required">Required: Karl won’t save the page without this.</p>
						{/if}

						{#each slot.notes as note, i (i)}
							<p class="bp-note">
								<strong>Good to know:</strong>
								{note}
							</p>
						{/each}
						{#each slot.caveats as caveat, i (i)}
							<p class="bp-caveat">
								<strong>Karl’s rule unconfirmed:</strong>
								{caveat}
							</p>
						{/each}

						{#if slot.filled}
							<div class="bp-slot-foot">
								<label class="bp-entered" data-entered={entered ? '' : undefined}>
									<input
										type="checkbox"
										checked={entered}
										onchange={(e) =>
											pageStore.setPanelEntered(pageId, slot.rawName, e.currentTarget.checked)}
									/>
									Entered in Karl
								</label>
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
							</div>
						{/if}
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
		</section>
	</div>

	<div class="bp-footer">
		<p class="bp-footer-hint">
			{#if built}
				Built in Karl. Marked on this device.
			{:else if allEntered}
				Every panel with copy is entered. Mark the page built.
			{:else}
				{filled.length - enteredCount}
				{filled.length - enteredCount === 1 ? 'panel' : 'panels'} left to enter in Karl. Check each one
				off as you paste it.
			{/if}
		</p>
		{#if built}
			<button
				type="button"
				class="bp-mark bp-mark-undo"
				onclick={() => pageStore.setPageBuilt(pageId, false)}
			>
				Unmark as built
			</button>
		{:else}
			<button
				type="button"
				class="bp-mark"
				disabled={!allEntered}
				onclick={() => pageStore.setPageBuilt(pageId, true)}
			>
				Mark page as built in Karl
			</button>
		{/if}
	</div>
</div>

<style>
	.blueprint {
		display: flex;
		flex-direction: column;
		min-height: 0;
		flex: 1;
		background: #f5f7fa;
	}

	/* ---- header ---------------------------------------------------------- */

	.bp-header {
		min-height: 48px;
		flex: none;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 20px;
		padding: 6px 20px;
		background: #ffffff;
		border-bottom: 1px solid var(--sfds-color-grey-l2);
	}

	.bp-head-left {
		display: flex;
		align-items: baseline;
		gap: 12px;
		min-width: 0;
		flex: 1 1 320px;
	}

	.bp-title {
		margin: 0;
		font-family: var(--font-display);
		font-size: 0.9375rem;
		font-weight: 700;
	}

	.bp-meta {
		margin: 0;
		font-size: 0.8125rem;
		color: #3d4551;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.bp-progress {
		display: flex;
		align-items: center;
		gap: 10px;
		flex: none;
	}

	.bp-progress-text {
		font-size: 0.8125rem;
		color: #3d4551;
		white-space: nowrap;
	}

	.bp-meter {
		display: block;
		width: 120px;
		height: 8px;
		border-radius: 4px;
		background: #e3e7ec;
		overflow: hidden;
	}

	.bp-meter-fill {
		display: block;
		height: 100%;
		background: #1f7a4d;
		transition: width 0.2s;
	}

	.bp-exit,
	.bp-show {
		flex: none;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 28px;
		padding: 0 12px;
		border: 1px solid var(--sfds-color-grey-l2);
		border-radius: 6px;
		background: #f7f7f7;
		color: #1c2b39;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
	}

	/* ---- approval banner -------------------------------------------------- */

	.bp-approval {
		flex: none;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 16px;
		margin: 12px 20px 0;
		padding: 8px 14px;
		border: 1px solid #f0c9a4;
		border-radius: 8px;
		background: #fff7ef;
		font-size: 0.875rem;
	}

	.bp-approval-title {
		color: #8a3a06;
	}

	.bp-approval-text {
		flex: 1 1 320px;
		color: #1c2b39;
	}

	.bp-link {
		min-height: 32px;
		padding: 0;
		border: 0;
		background: none;
		color: #1b519e;
		font-weight: 600;
		text-decoration: underline;
		text-underline-offset: 2px;
		cursor: pointer;
	}

	/* ---- two columns -------------------------------------------------------
	   Side by side from 1024px, each its own scroll container, so the mockup
	   stays in view while the list is worked through. Narrower, they stack and
	   the whole body scrolls. */

	.bp-split {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
	}

	.bp-col {
		min-width: 0;
		padding: 16px 24px 32px;
	}

	@media (min-width: 1024px) {
		.bp-split {
			overflow: hidden;
			/* The mockup takes two thirds: 25% wider than the 1.15 : 1 split it
			   started at (~890px against ~715px at 1440), by request. */
			grid-template-columns: minmax(0, 2fr) minmax(380px, 1fr);
		}

		.bp-col {
			overflow-y: auto;
		}

		.bp-col-karl {
			border-left: 1px solid var(--sfds-color-grey-l2);
		}
	}

	.bp-col-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 4px 8px;
		margin-bottom: 10px;
	}

	.bp-col-title {
		margin: 0;
		font-size: 0.8125rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: #3d4551;
	}

	.bp-col-meta {
		margin: 0;
		font-size: 0.75rem;
		color: #545b64;
	}

	.bp-fix-count {
		color: #8a3a06;
	}

	/* Copy in the mockup that belongs to a panel can be clicked to pick it. */
	.bp-col-mock :global([data-rewrite-field]) {
		cursor: pointer;
	}

	/* The picked panel's copy. Outline, not border, so the mockup does not
	   reflow when the pick moves. */
	.bp-col-mock :global([data-bp-active]) {
		outline: 2px solid #0b5f67;
		outline-offset: 4px;
		border-radius: 2px;
		background: #f2fafa;
	}

	/* A panel's number on its first piece of copy, matching the badge in the
	   list. Sized against the Fit zoom, like the review's own annotations. */
	.bp-col-mock :global([data-bp-n]) {
		position: relative;
	}

	.bp-col-mock :global([data-bp-n])::before {
		content: attr(data-bp-n);
		position: absolute;
		top: calc(-10px / var(--fit-scale, 1));
		right: calc(-10px / var(--fit-scale, 1));
		width: calc(20px / var(--fit-scale, 1));
		height: calc(20px / var(--fit-scale, 1));
		border-radius: 999px;
		background: #0b5f67;
		color: #ffffff;
		font:
			700 calc(11px / var(--fit-scale, 1)) / calc(20px / var(--fit-scale, 1)) system-ui,
			sans-serif;
		text-align: center;
	}

	/* From sf.gov's 96px desktop gutter there is room to number the copy from
	   the left, where the eye starts each line. Narrower, the gutter is 20-28px
	   and a left badge clips at the frame, so it overlaps the top-right corner.
	   800px, not the frame's 1000: the nearest `mockup` container here is
	   #mockPage, whose content box is 830px at desktop and 710px at tablet. */
	@container mockup (min-width: 800px) {
		.bp-col-mock :global([data-bp-n])::before {
			right: auto;
			left: calc(-32px / var(--fit-scale, 1));
		}
	}

	/* ---- the Karl list ---------------------------------------------------- */

	.bp-summary,
	.bp-url,
	.bp-howto {
		margin: 0 0 10px;
		font-size: 0.875rem;
		color: #1c2b39;
	}

	.bp-howto {
		padding: 8px 12px;
		border: 1px solid #c9d7f5;
		border-radius: 8px;
		background: #eef3fd;
		font-size: 0.8125rem;
	}

	.bp-live {
		min-height: 18px;
		margin: 0 0 4px;
		font-size: 0.75rem;
		color: #1f7a4d;
	}

	.bp-page-caveat {
		margin: 0 0 10px;
		padding: 8px 12px;
		border-left: 3px solid #545b64;
		background: #eef0f3;
		font-size: 0.875rem;
		color: #1c2b39;
	}

	.bp-url-note {
		color: #3d4551;
	}

	.bp-slots {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.bp-slot {
		padding: 12px 14px;
		border: 1px solid #c6cdd4;
		border-radius: 8px;
		background: #ffffff;
	}

	.bp-slot[data-status='needs-fix'] {
		border-color: #f0c9a4;
		background: #fff9f3;
	}

	.bp-slot[data-active] {
		border: 2px solid #0b5f67;
		padding: 11px 13px;
		background: #eaf5f6;
	}

	/* An empty panel: dashed, and named as empty in text, not by the line alone. */
	.bp-slot[data-filled='false'] {
		border: 2px dashed #8b949e;
		padding: 11px 13px;
		background: transparent;
	}

	.bp-slot-head {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.bp-n {
		flex: none;
		width: 22px;
		height: 22px;
		border-radius: 999px;
		background: #0b5f67;
		color: #ffffff;
		font-size: 0.6875rem;
		font-weight: 700;
		line-height: 22px;
		text-align: center;
	}

	.bp-slot[data-status='needs-fix'] .bp-n {
		background: #a84b00;
	}

	.bp-slot[data-filled='false'] .bp-n {
		background: #6b7280;
	}

	.bp-slot-title {
		margin: 0;
		flex: 1 1 auto;
		min-width: 0;
		font-size: 0.9375rem;
		font-weight: 700;
		color: #1c2b39;
	}

	.bp-pick {
		padding: 0;
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
		text-decoration: underline;
		text-decoration-color: transparent;
		text-underline-offset: 3px;
	}

	.bp-pick:hover {
		text-decoration-color: currentColor;
	}

	.bp-slot-head :global(.karl-chip) {
		margin: 0;
	}

	.bp-empty {
		font-weight: 400;
		color: #3d4551;
	}

	.bp-reason {
		margin: 6px 0 0 32px;
		font-size: 0.8125rem;
		color: #6f4a00;
	}

	.bp-note,
	.bp-caveat,
	.bp-required {
		margin: 6px 0 0 32px;
		font-size: 0.8125rem;
		color: #3d4551;
	}

	.bp-required {
		color: #8c1d18;
	}

	.bp-values {
		margin: 10px 0 0 32px;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.bp-value {
		display: flex;
		align-items: flex-end;
		gap: 8px;
	}

	.bp-value-body {
		flex: 1 1 auto;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.bp-value-label {
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		color: #545b64;
	}

	/* One click selects the whole value, for when the clipboard is refused. */
	.bp-value-text {
		padding: 7px 10px;
		border: 1px solid #c6cdd4;
		border-radius: 4px;
		background: #ffffff;
		font-size: 0.8125rem;
		line-height: 1.125rem;
		color: #1c2b39;
		white-space: pre-line;
		overflow-wrap: anywhere;
		user-select: all;
		-webkit-user-select: all;
		cursor: text;
	}

	.bp-copy {
		flex: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-width: 84px;
		min-height: 34px;
		padding: 0 12px;
		border: 1px solid #1b519e;
		border-radius: 6px;
		background: #ffffff;
		color: #1b519e;
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
	}

	.bp-copy[data-copied] {
		border-color: #1f7a4d;
		background: #e7f4ec;
		color: #1f7a4d;
	}

	.bp-copy-failed {
		font-size: 0.75rem;
		color: #8c1d18;
	}

	.bp-slot-foot {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin: 10px 0 0 32px;
		padding-top: 6px;
		border-top: 1px solid #e6e9ed;
	}

	.bp-entered {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 36px;
		font-size: 0.8125rem;
		color: #3d4551;
		cursor: pointer;
	}

	.bp-entered[data-entered] {
		color: #1f7a4d;
		font-weight: 600;
	}

	.bp-entered input {
		width: 18px;
		height: 18px;
		margin: 0;
		accent-color: #1f7a4d;
	}

	.bp-tray {
		margin: 24px 0 0;
		padding: 12px 14px;
		border: 2px solid #b3261e;
		border-radius: 6px;
		background: #fdecea;
	}

	.bp-tray-title {
		margin: 0 0 8px;
		font-size: 0.9375rem;
		font-weight: 700;
		color: #8c1d18;
	}

	.bp-tray-empty,
	.bp-tray-reason {
		margin: 0;
		font-size: 0.8125rem;
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
		font-size: 0.875rem;
		color: #1c2b39;
	}

	.bp-tray-item .bp-show {
		margin-top: 8px;
	}

	/* ---- footer ------------------------------------------------------------ */

	.bp-footer {
		flex: none;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 16px;
		padding: 10px 20px;
		border-top: 1px solid #c6cdd4;
		background: #ffffff;
		box-shadow: 0 -4px 12px rgba(16, 24, 40, 0.06);
	}

	.bp-footer-hint {
		flex: 1 1 280px;
		margin: 0;
		font-size: 0.875rem;
		color: #3d4551;
	}

	.bp-mark {
		min-height: 40px;
		padding: 0 18px;
		border: 0;
		border-radius: 6px;
		background: #1f7a4d;
		color: #ffffff;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
	}

	.bp-mark:disabled {
		background: #6b7280;
		cursor: not-allowed;
	}

	.bp-mark-undo {
		border: 1px solid #c6cdd4;
		background: #ffffff;
		color: #1c2b39;
	}
</style>
