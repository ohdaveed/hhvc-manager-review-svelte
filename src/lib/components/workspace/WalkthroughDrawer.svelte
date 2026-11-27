<script lang="ts">
	import { tick } from 'svelte';
	import { pageStore } from '$lib/stores/pageData.svelte';
	import type { Walkthrough, WalkthroughStep } from '$lib/karl/walkthrough';

	/**
	 * The Karl rebuild drawer: steps on the left, the mockup beside it.
	 *
	 * The tool's second job. A reviewer who has approved a mockup then rebuilds
	 * it BY HAND in the real Karl CMS, in another tab, and this walks them down
	 * the form panel by panel with one Copy button per field.
	 *
	 * Three details here are requirements rather than styling, and each has a
	 * reason that is easy to lose:
	 *
	 * 1. **A completed step keeps its number.** The numeral is the step's
	 *    identity -- it is how a reviewer says where they are -- so a checkmark
	 *    never replaces it. Done renders the same numeral in green plus the word
	 *    "Copied".
	 * 2. **Copy yields plain, unstyled text.** That is the entire point of the
	 *    feature: the value goes into a Wagtail field, so a highlight span or a
	 *    markdown wrapper riding along would be pasted into the CMS. The step
	 *    values come from the transcript as plain strings and are written to the
	 *    clipboard unchanged.
	 * 3. **Scrolling uses `scrollTop`, not `scrollIntoView`.** The drawer is a
	 *    nested scroll container inside a fixed-height grid; `scrollIntoView`
	 *    scrolls the nearest ancestor it likes, which here drags the whole app
	 *    shell sideways. Computing the offset keeps the movement inside the list.
	 */
	// No exit control here: the navy header above owns both it and the add-page
	// link, and two copies of the same two controls is just noise on screen.
	let { walkthrough, pageId }: { walkthrough: Walkthrough; pageId: string } = $props();

	let listEl = $state<HTMLDivElement | null>(null);
	let cardEl = $state<HTMLDivElement | null>(null);
	/** Step id -> its host element, for scrolling. A plain record: nothing
	    subscribes to it, it is written during render and read in an effect. */
	const stepEls: Record<string, HTMLElement> = {};
	/** Which value's Copy button just fired, for the transient confirmation. */
	let justCopied = $state<string | null>(null);
	/** The step whose Copy & next could not reach the clipboard. */
	let copyFailed = $state<string | null>(null);
	/** Read out by the live region: a copy is otherwise silent. */
	let announcement = $state('');

	const steps = $derived(walkthrough.steps);
	const flagGaps = $derived(walkthrough.gaps.filter((g) => g.kind === 'flag'));
	const unmappedGaps = $derived(walkthrough.gaps.filter((g) => g.kind === 'unmapped'));
	const index = $derived(Math.min(pageStore.stepIndex, Math.max(steps.length - 1, 0)));
	const active = $derived(steps[index]);

	/**
	 * Focus moves into the drawer on open, onto the active step's card. The
	 * card rather than the drawer's heading: that heading is screen-reader-only
	 * (the navy bar above already shows the page title), and focus on an
	 * invisible element leaves a sighted keyboard user with no ring to follow.
	 * Without it a keyboard user tabs from wherever they were into a drawer that
	 * has replaced the page, with no announcement that anything changed.
	 */
	let focusedOnOpen = false;
	$effect(() => {
		if (cardEl && !focusedOnOpen) {
			focusedOnOpen = true;
			cardEl.focus({ preventScroll: true });
		}
	});

	/** Bring the active step into view within the LIST, never the whole page. */
	async function revealActive() {
		await tick();
		const el = active ? stepEls[active.id] : null;
		if (!el || !listEl) return;
		const top = el.offsetTop - listEl.offsetTop;
		listEl.scrollTop = Math.max(0, top - 12);
	}

	$effect(() => {
		void index;
		revealActive();
	});

	/**
	 * The active step's section, scrolled into the mockup preview and marked
	 * there, so an editor can check its formatting (numbered or bulleted, where
	 * the links are) before pasting. Positional on purpose: the transcript
	 * indexes `page.sections`, and a field id built from `fieldKey` need not
	 * match it. The mark is a data attribute, not a class -- Svelte owns the
	 * section's `class` and would drop an added one on its next update -- and
	 * the effect's cleanup clears it on every step change and when the drawer
	 * closes. Same `scrollTop` arithmetic as the layout's `showOnPage`, for
	 * the reason at the top of this file.
	 */
	$effect(() => {
		const n = active?.sectionIndex;
		if (n === undefined) return;
		const region = document.querySelector<HTMLElement>(
			'[role="region"][aria-label="Mockup preview"]'
		);
		const el = region?.querySelector<HTMLElement>(`[data-section-index="${n}"]`);
		if (!region || !el) return;
		region.scrollTop += el.getBoundingClientRect().top - region.getBoundingClientRect().top - 32;
		el.setAttribute('data-walkthrough-active', '');
		return () => el.removeAttribute('data-walkthrough-active');
	});

	function goTo(n: number) {
		pageStore.stepIndex = Math.max(0, Math.min(n, steps.length - 1));
	}

	/** Copy one value; true when it reached the clipboard. */
	async function copyValue(step: WalkthroughStep, label: string, value: string): Promise<boolean> {
		try {
			await navigator.clipboard.writeText(value);
			justCopied = `${step.id}:${label}`;
			copyFailed = null;
			announcement = `Copied ${label}`;
			setTimeout(() => {
				if (justCopied === `${step.id}:${label}`) justCopied = null;
			}, 1400);
			return true;
		} catch {
			// Clipboard is permission-gated and unavailable over plain http. The
			// value is on screen and selectable either way, so a failure here is
			// an inconvenience, not a dead end -- and a thrown error would take
			// the drawer down mid-rebuild.
			justCopied = null;
			return false;
		}
	}

	/** After advancing, the button that was pressed is gone: put focus on the new card. */
	async function advance(step: WalkthroughStep) {
		pageStore.markCopied(pageId, step.id);
		goTo(index + 1);
		await tick();
		cardEl?.focus({ preventScroll: true });
	}

	/**
	 * One click for a one-value step: copy, mark it, move on. It refuses to
	 * advance on a failed copy -- marking a step copied with nothing on the
	 * clipboard sends an editor to Karl to paste the previous field.
	 */
	async function copyAndNext(step: WalkthroughStep) {
		const [only] = step.values;
		if (await copyValue(step, only.label, only.value)) await advance(step);
		else copyFailed = step.id;
	}

	/**
	 * Split a value label like `Then add an Image block — alt text` into the
	 * group it belongs to and its own name, so three image values read as one
	 * "Then add an Image block" heading over File / Alt text / Attribution
	 * rather than the same prefix three times. Display only: the copy state
	 * and the accessible name keep the full label.
	 */
	function labelParts(label: string): { group: string; name: string } {
		const at = label.indexOf(' — ');
		if (at < 0) return { group: '', name: label };
		const name = label.slice(at + 3);
		return { group: label.slice(0, at), name: name.charAt(0).toUpperCase() + name.slice(1) };
	}

	/**
	 * A row's badge when there is nothing to paste, so an editor can see which
	 * steps those are without opening each one. Named by what the step asks
	 * for: a chooser and a gap are not blanks, and calling them "Empty" would
	 * invite skipping a field Karl will not save without.
	 */
	function badgeFor(step: WalkthroughStep): { text: string; tone: string } | null {
		if (step.values.length > 0) return null;
		if (step.outcome === 'CHOOSE') return { text: 'Choose', tone: 'choose' };
		if (step.outcome === 'FLAG')
			return step.severity === 'blocking'
				? { text: 'Blocking', tone: 'blocking' }
				: { text: 'Decide', tone: 'advisory' };
		return { text: 'Empty', tone: 'empty' };
	}
</script>

<!-- A gap's reason is written for the Markdown export, so a field name in it is
     wrapped in backticks. Shown as text, those backticks reached the reviewer
     literally; split on them instead, every odd part being code. -->
{#snippet reasonText(reason: string)}
	{#each reason.split('`') as part, i (i)}{#if i % 2 === 1}<code>{part}</code
			>{:else}{part}{/if}{/each}
{/snippet}

<div class="drawer" aria-label="Karl rebuild steps">
	<div class="drawer-head">
		<div class="drawer-head-row">
			<span class="drawer-tab">{walkthrough.navPath || 'Content tab'}</span>
			<span class="drawer-position">Step {index + 1} of {steps.length}</span>
		</div>
		<div class="drawer-bar">
			<!-- scaleX rather than width: the bar moves on every step change, and
			     animating width relayouts the header each time. -->
			<div
				class="drawer-bar-fill"
				style="transform: scaleX({steps.length ? (index + 1) / steps.length : 0})"
			></div>
		</div>
		<!-- Screen-reader-only: the navy bar above shows the title and the copied
		     count, and repeating both here pushed the step list down. -->
		<h2 class="sr-only">Rebuild {walkthrough.title} in Karl</h2>
		<p class="drawer-sub">
			<!-- Over all steps, not "N of copyableCount": the badged rows are the
			     rest, so the two numbers and the list agree. -->
			{walkthrough.copyableCount} of {steps.length} have values to paste
		</p>
		<p class="sr-only" aria-live="polite">{announcement}</p>
	</div>

	<div bind:this={listEl} class="drawer-list">
		{#each steps as step, i (step.id)}
			{@const done = pageStore.isCopied(pageId, step.id)}
			{@const isActive = i === index}
			<div
				class="step-host"
				bind:this={() => stepEls[step.id] ?? null, (el) => el && (stepEls[step.id] = el)}
			>
				{#if isActive}
					<div
						bind:this={cardEl}
						class="step-card"
						class:step-card-blocking={step.severity === 'blocking'}
						class:step-card-advisory={step.severity === 'advisory'}
						role="group"
						aria-labelledby={`step-name-${i}`}
						tabindex="-1"
					>
						<!-- One header: the name, then one muted line naming where it goes
						     in Karl -- the panel to add from the block menu (when the
						     heading replaced it as the name) and the raw field name. -->
						<div class="step-card-head">
							<span
								class="numeral numeral-active"
								class:numeral-blocking={step.severity === 'blocking'}>{step.n}</span
							>
							<span class="step-card-titles">
								<span class="step-card-name" id={`step-name-${i}`}
									>{step.heading ?? step.uiLabel}</span
								>
								<span class="step-card-panel"
									>{#if step.heading}{step.uiLabel} ·
									{/if}<code>{step.rawName}</code></span
								>
							</span>
						</div>

						<!-- No FLAG hint: the coloured box below says the same thing. -->
						{#if step.outcome === 'CHOOSE'}
							<p class="step-hint">A chooser: search Karl for the entry rather than typing it.</p>
						{/if}

						{#if step.outcome === 'FLAG'}
							<div
								class="gap"
								class:gap-blocking={step.severity === 'blocking'}
								class:gap-advisory={step.severity === 'advisory'}
							>
								<p class="gap-title">
									{step.severity === 'blocking'
										? 'Karl requires this and the mockup cannot supply it'
										: 'Needs a decision, but does not block saving'}
								</p>
								{#each step.notes as note, n (n)}
									<p class="gap-body">{note}</p>
								{/each}
							</div>
						{/if}

						{#if step.choices.length > 0}
							<div class="choices">
								<p class="choices-label">Karl asks you to choose</p>
								<ul class="choices-list">
									{#each step.choices as choice, c (c)}
										<!-- The label is what a reviewer types into Karl's page chooser,
										     so it leads. The corpus key follows only where it differs
										     from the label, which is the case worth seeing: it means the
										     target resolved to a page whose title is not its key. -->
										<li class="choice">
											{choice.label}
											{#if choice.pageKey && choice.pageKey !== choice.label}
												<code class="choice-key">{choice.pageKey}</code>
											{/if}
										</li>
									{/each}
								</ul>
							</div>
						{/if}

						{#each step.values as value, v (v)}
							{@const part = labelParts(value.label)}
							{#if part.group && part.group !== labelParts(step.values[v - 1]?.label ?? '').group}
								<p class="value-group">{part.group}</p>
							{/if}
							<div class="value" class:value-in-group={part.group}>
								<div class="value-strip">
									<!-- A lone value named like its panel ("Page title" under
									     "Page title") is the header said again. -->
									{#if value.label !== step.uiLabel || step.values.length > 1}
										<span class="value-label">{part.name}</span>
									{/if}
									<!-- Kept beside Copy & next: re-copying a value without
									     advancing is a normal thing to need mid-paste. -->
									<button
										type="button"
										class="value-copy"
										aria-label={step.values.length > 1 ? `Copy ${value.label}` : undefined}
										onclick={() => copyValue(step, value.label, value.value)}
									>
										{justCopied === `${step.id}:${value.label}`
											? 'Copied'
											: step.values.length === 1
												? 'Copy only'
												: 'Copy'}
									</button>
								</div>
								<p class="value-text">{value.value}</p>
							</div>
						{/each}

						{#if step.links.length > 0}
							<!-- Not decoration, and not a Copy target. Pasting the markdown
							     into a Wagtail rich-text field stores the brackets as literal
							     text, so each link has to be rebuilt with Karl's own Link
							     tool. The transcript has always said so; the drawer did not. -->
							<div class="links">
								<p class="links-label">Rebuild these with Karl's Link tool</p>
								<ul class="links-list">
									{#each step.links as link, l (l)}
										<li class="link">
											<span class="link-text">“{link.label}”</span>
											<span class="link-target">{link.representation}</span>
										</li>
									{/each}
								</ul>
								<p class="links-note">Do not paste the link markup into the field.</p>
							</div>
						{/if}

						{#if step.notes.length > 0 && step.outcome !== 'FLAG'}
							<!-- The prose lives here, collapsed. The header carries the structure. -->
							<details class="why">
								<summary>Why this mapping</summary>
								{#each step.notes as note, n (n)}
									<p class="why-body">{note}</p>
								{/each}
							</details>
						{/if}

						<!-- One click only where one clipboard write can serve the step.
						     Title + Text, image file/alt/credit and the like go into
						     separate Wagtail fields, so those keep a Copy per value. -->
						<div class="step-actions">
							{#if step.values.length === 1}
								<button type="button" class="btn-primary" onclick={() => copyAndNext(step)}>
									Copy &amp; next →
								</button>
							{:else}
								<button type="button" class="btn-primary" onclick={() => advance(step)}>
									{step.values.length > 1 ? 'Done · next →' : 'Mark done · next →'}
								</button>
							{/if}
							<button type="button" class="btn-ghost" onclick={() => goTo(index + 1)}>Skip</button>
						</div>
						{#if copyFailed === step.id}
							<p class="copy-failed" role="alert">
								Couldn’t reach the clipboard. Select the text above and copy it by hand.
							</p>
						{/if}
					</div>
				{:else}
					{@const badge = badgeFor(step)}
					{@const name = step.heading ?? step.uiLabel}
					<button type="button" class="step-row" title={name} onclick={() => goTo(i)}>
						<!-- The numeral is the step's identity and survives completion; a
						     checkmark replacing it would take away the thing a reviewer
						     uses to say where they are. -->
						<span class="numeral" class:numeral-done={done}>{step.n}</span>
						<span class="step-row-name" class:step-row-name-done={done}>{name}</span>
						<!-- No raw field name here: ten rows of `information_section`
						     in a column was the noisiest thing in the drawer, and the
						     open card names the field. -->
						{#if badge || done}
							<span class="step-row-meta">
								{#if badge}<span class="badge badge-{badge.tone}">{badge.text}</span>{/if}
								{#if done}<span class="step-row-copied">Copied</span>{/if}
							</span>
						{/if}
					</button>
				{/if}
			</div>
		{/each}

		<!-- Two registers, kept apart because they ask for different things. A
		     flag is work to do before saving; an unmapped finding has nowhere to
		     be typed at all, and is listed so that content leaving the migration
		     is visible rather than silently absent. -->
		{#if flagGaps.length > 0}
			<div class="gap gap-advisory page-gap">
				<p class="gap-title">Resolve before saving</p>
				{#each flagGaps as gap (gap.path)}
					<p class="gap-body"><code>{gap.path}</code> — {@render reasonText(gap.reason)}</p>
				{/each}
			</div>
		{/if}

		{#if unmappedGaps.length > 0}
			<div class="gap page-gap gap-unmapped">
				<p class="gap-title">No Karl field for this content</p>
				<p class="gap-body gap-lede">
					Nothing here has a field to be typed into. It is listed rather than dropped, because an
					absence reads as “there was nothing there”.
				</p>
				{#each unmappedGaps as gap (gap.path)}
					<p class="gap-body"><code>{gap.path}</code> — {@render reasonText(gap.reason)}</p>
				{/each}
			</div>
		{/if}

		<!-- Saved edits that no longer answer their base copy (ADR 0001): settle
		     these before typing anything into Karl. -->
		{#if walkthrough.stale.length > 0}
			<div class="gap gap-advisory page-gap">
				<p class="gap-title">Saved edits that need a decision</p>
				{#each walkthrough.stale as edit (edit.fieldId)}
					<p class="gap-body">
						<code>{edit.fieldId}</code> —
						{#if edit.kind === 'expired'}
							expired: the base copy changed after “{edit.accepted}” was saved. Base copy now: “{edit.base}”.
						{:else}
							orphaned: the field is no longer on the page. Saved wording: “{edit.accepted}”.
						{/if}
					</p>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.drawer {
		flex: none;
		width: 440px;
		background: #ffffff;
		border-right: 1px solid var(--sfds-color-grey-l2);
		box-shadow: 4px 0 12px rgba(12, 20, 100, 0.06);
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	.drawer-head {
		flex: none;
		padding: 16px 20px;
		border-bottom: 1px solid var(--sfds-color-grey-l2);
	}

	.drawer-head-row {
		display: flex;
		align-items: baseline;
		gap: 8px;
		margin-bottom: 8px;
	}

	.drawer-tab {
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-secondary, #5a7a92);
	}

	.drawer-position {
		margin-left: auto;
		font-size: 0.75rem;
		color: var(--text-secondary, #5a7a92);
	}

	.drawer-bar {
		height: 5px;
		border-radius: 999px;
		background: var(--sfds-color-grey-l2);
		overflow: hidden;
	}

	.drawer-bar-fill {
		width: 100%;
		height: 100%;
		transform-origin: left center;
		background: var(--color-sfds-action, #495ed4);
		transition: transform 150ms ease;
	}

	.drawer-sub {
		margin: 8px 0 0;
		font-size: 0.75rem;
		color: var(--text-secondary, #5a7a92);
	}

	.drawer-list {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.numeral {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		flex: none;
		border-radius: 999px;
		border: 1px solid #c2c2c2;
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--text-secondary, #5a7a92);
	}

	.numeral-done {
		background: #eaf5eb;
		border-color: #eaf5eb;
		color: #16651f;
	}

	.numeral-active {
		background: var(--color-sfds-action, #495ed4);
		border-color: var(--color-sfds-action, #495ed4);
		color: #ffffff;
	}

	.numeral-blocking {
		background: #c0392b;
		border-color: #c0392b;
		color: #ffffff;
	}

	.step-row {
		display: flex;
		width: 100%;
		align-items: center;
		gap: 10px;
		padding: 10px 12px;
		border: 0;
		border-radius: 6px;
		background: transparent;
		text-align: left;
		cursor: pointer;
		font: inherit;
	}

	.step-row:hover {
		background: #f0f0f0;
	}

	/* A heading can run to sixty characters. Two lines at most keeps the list
	   scannable; one line left about twenty characters beside the raw-name tag,
	   which cut most headings before the word that tells them apart (observed at
	   1600px). The row's title attribute carries the whole of it. */
	.step-row-name {
		flex: 1;
		min-width: 0;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		overflow: hidden;
		font-size: 0.875rem;
		line-height: 1.25rem;
	}

	.badge {
		flex: none;
		padding: 1px 6px;
		border-radius: 999px;
		font-size: 0.6875rem;
		font-weight: 600;
		line-height: 1rem;
	}

	.badge-empty,
	.badge-choose {
		background: #f0f0f0;
		color: #4f4f4f;
	}

	.badge-advisory {
		background: #fff7e6;
		color: #6f4a00;
	}

	.badge-blocking {
		background: #fff1f0;
		color: #8f1d15;
	}

	.step-row-name-done {
		color: var(--text-secondary, #5a7a92);
	}

	.step-row-meta {
		margin-left: auto;
		flex: none;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.gap-body code {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.6875rem;
		color: var(--text-secondary, #5a7a92);
	}

	.step-row-copied {
		font-size: 0.6875rem;
		font-weight: 700;
		color: #16651f;
	}

	.step-card {
		display: flex;
		flex-direction: column;
		border: 2px solid var(--color-sfds-action, #495ed4);
		border-radius: 6px;
		padding: 14px;
		background: #ffffff;
		box-shadow:
			0 2px 4px rgba(12, 20, 100, 0.06),
			0 4px 12px rgba(12, 20, 100, 0.1);
	}

	.step-card-blocking {
		border-color: #c0392b;
		background: #fff1f0;
	}

	.step-card-advisory {
		border-color: #f2c94c;
		background: #fff7e6;
	}

	/* Top-aligned: a heading that wraps would otherwise float the numeral
	   between its lines. */
	.step-card-head {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		margin-bottom: 10px;
	}

	.step-card:focus-visible {
		outline: 2px solid var(--color-sfds-action, #495ed4);
		outline-offset: 3px;
	}

	.step-card-titles {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.step-card-name {
		font-size: 0.9375rem;
		line-height: 1.25rem;
		font-weight: 700;
	}

	.step-card-panel {
		font-size: 0.75rem;
		color: var(--text-secondary, #5a7a92);
	}

	.step-card-panel code {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.6875rem;
	}

	.copy-failed {
		margin: 8px 0 0;
		font-size: 0.75rem;
		color: #8f1d15;
	}

	.step-hint {
		margin: 0 0 10px;
		font-size: 0.75rem;
		line-height: 1.0625rem;
		color: var(--sfds-color-slate-l3, #1d4d70);
	}

	.gap {
		border-radius: 4px;
		padding: 10px 12px;
		margin-bottom: 8px;
	}

	.gap-blocking {
		background: #fff1f0;
		border-left: 4px solid #c0392b;
	}

	.gap-advisory {
		background: #fff7e6;
		border-left: 4px solid #f2c94c;
	}

	.page-gap {
		margin-top: 12px;
	}

	.gap-title {
		margin: 0 0 4px;
		font-size: 0.8125rem;
		font-weight: 700;
		color: #8f1d15;
	}

	.gap-advisory .gap-title {
		color: #6f4a00;
	}

	.gap-body {
		margin: 0 0 4px;
		font-size: 0.8125rem;
		line-height: 1.1875rem;
		color: #8f1d15;
	}

	.gap-advisory .gap-body {
		color: #6f4a00;
	}

	.choices {
		border: 1px solid #c2c2c2;
		border-radius: 4px;
		padding: 10px;
		margin-bottom: 8px;
	}

	.choices-label {
		margin: 0 0 8px;
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-secondary, #5a7a92);
	}

	.choices-list {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	/* `min-height`, not `height`. These used to be short because every label
	   was the string "[object Object]"; a real page title is up to 50
	   characters and wrapped straight out through the bottom of a fixed 26px
	   pill. Observed in Chromium at 1600x1000 on the Agency page. */
	.choice {
		display: inline-flex;
		align-items: baseline;
		gap: 6px;
		min-height: 26px;
		padding: 4px 12px;
		border-radius: 13px;
		border: 1px solid #c2c2c2;
		font-size: 0.75rem;
		line-height: 1.0625rem;
	}

	.choice-key {
		flex: none;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.6875rem;
		color: var(--text-secondary, #5a7a92);
	}

	/* Bordered like .choices rather than coloured like .gap: a link to rebuild
	   is part of the step's work, not a problem with the page. */
	.links {
		border: 1px solid #c2c2c2;
		border-radius: 4px;
		padding: 10px;
		margin-bottom: 8px;
	}

	.links-label {
		margin: 0 0 8px;
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-secondary, #5a7a92);
	}

	.links-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.link {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-size: 0.75rem;
		line-height: 1.0625rem;
	}

	.link-text {
		font-weight: 600;
	}

	.link-target {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.6875rem;
		color: var(--text-secondary, #5a7a92);
	}

	.links-note {
		margin: 8px 0 0;
		font-size: 0.6875rem;
		color: var(--text-secondary, #5a7a92);
	}

	/* Grey, not amber: there is nothing here for the reviewer to fix, so
	   colouring it like a flag would send them looking for an action. */
	.gap-unmapped {
		background: var(--sfds-color-grey-l3, #f4f4f4);
		border-left: 4px solid #c2c2c2;
	}

	.gap-unmapped .gap-title,
	.gap-unmapped .gap-body {
		color: var(--sfds-color-black, #1c1c1c);
	}

	.gap-lede {
		color: var(--text-secondary, #5a7a92);
	}

	.gap-unmapped .gap-lede {
		color: var(--text-secondary, #5a7a92);
	}

	/* Values are the content, so they carry the least chrome: a small
	   sentence-case label with Copy beside it, then the text on a light panel.
	   The bordered box, grey strip and uppercase tracking each value used to
	   get made five values read as five forms. */
	.value {
		margin-bottom: 12px;
	}

	.value-group {
		margin: 4px 0 6px;
		font-size: 0.8125rem;
		font-weight: 700;
	}

	.value-in-group {
		padding-left: 10px;
		border-left: 2px solid var(--sfds-color-grey-l2);
	}

	.value-strip {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 4px;
	}

	.value-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-secondary, #5a7a92);
	}

	.value-copy {
		margin-left: auto;
		flex: none;
		height: 24px;
		padding: 0 10px;
		border: 1px solid var(--color-sfds-action, #495ed4);
		border-radius: 6px;
		background: #ffffff;
		color: var(--color-sfds-action, #495ed4);
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
	}

	/* `pre-line`: the text arrives with its paragraph breaks and one bullet per
	   line, and collapsing them ran a whole list into a single paragraph.
	   `anywhere`: an image credit carries a bare URL, which did not wrap and
	   gave the whole step list a sideways scrollbar (bed-bugs page, step 9).
	   Both display only -- Copy still writes the value exactly as it is. */
	.value-text {
		white-space: pre-line;
		overflow-wrap: anywhere;
		margin: 0;
		padding: 8px 10px;
		border-radius: 4px;
		background: #f7f7f7;
		font-size: 0.8125rem;
		line-height: 1.25rem;
	}

	.why {
		margin-bottom: 8px;
	}

	.why summary {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-sfds-action, #495ed4);
		cursor: pointer;
	}

	.why-body {
		margin: 6px 0 0;
		font-size: 0.75rem;
		line-height: 1.125rem;
		color: var(--text-secondary, #5a7a92);
	}

	.step-actions {
		display: flex;
		gap: 8px;
	}

	.btn-primary {
		flex: 1;
		height: 34px;
		border: 0;
		border-radius: 6px;
		background: var(--color-sfds-action, #495ed4);
		color: #ffffff;
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
	}

	.btn-ghost {
		flex: none;
		height: 34px;
		padding: 0 12px;
		border: 1px solid #c2c2c2;
		border-radius: 6px;
		background: #ffffff;
		font-size: 0.8125rem;
		cursor: pointer;
	}
</style>
