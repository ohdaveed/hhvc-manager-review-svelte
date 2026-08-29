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
	let {
		walkthrough,
		pageId,
		onExit
	}: { walkthrough: Walkthrough; pageId: string; onExit: () => void } = $props();

	let listEl = $state<HTMLDivElement | null>(null);
	let headingEl = $state<HTMLHeadingElement | null>(null);
	/** Step id -> its host element, for scrolling. A plain record: nothing
	    subscribes to it, it is written during render and read in an effect. */
	const stepEls: Record<string, HTMLElement> = {};
	/** Which value's Copy button just fired, for the transient confirmation. */
	let justCopied = $state<string | null>(null);

	const steps = $derived(walkthrough.steps);
	const index = $derived(Math.min(pageStore.stepIndex, Math.max(steps.length - 1, 0)));
	const active = $derived(steps[index]);
	const copiedCount = $derived(steps.filter((s) => pageStore.isCopied(pageId, s.id)).length);

	/**
	 * Focus moves into the drawer on open and returns to the opener on exit.
	 * Without it a keyboard user tabs from wherever they were into a drawer that
	 * has replaced the page, with no announcement that anything changed.
	 */
	$effect(() => {
		if (headingEl) headingEl.focus();
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

	function goTo(n: number) {
		pageStore.stepIndex = Math.max(0, Math.min(n, steps.length - 1));
	}

	async function copyValue(step: WalkthroughStep, label: string, value: string) {
		try {
			await navigator.clipboard.writeText(value);
			justCopied = `${step.id}:${label}`;
			setTimeout(() => {
				if (justCopied === `${step.id}:${label}`) justCopied = null;
			}, 1400);
		} catch {
			// Clipboard is permission-gated and unavailable over plain http. The
			// value is on screen and selectable either way, so a failure here is
			// an inconvenience, not a dead end -- and a thrown error would take
			// the drawer down mid-rebuild.
			justCopied = null;
		}
	}

	function markCopiedAndNext(step: WalkthroughStep) {
		pageStore.markCopied(pageId, step.id);
		goTo(index + 1);
	}

	/** The structured path the mapping block shows, e.g. `things_to_know → Title and text`. */
	function mappingPath(step: WalkthroughStep): string {
		const sub = step.values.map((v) => v.label).join(', ');
		return sub ? `${step.rawName} → ${sub}` : step.rawName;
	}
</script>

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
		<h2 bind:this={headingEl} tabindex="-1" class="drawer-title">
			Rebuild {walkthrough.title} in Karl
		</h2>
		<p class="drawer-sub">
			{copiedCount} of {walkthrough.copyableCount} fields copied
		</p>
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
						class="step-card"
						class:step-card-blocking={step.severity === 'blocking'}
						class:step-card-advisory={step.severity === 'advisory'}
					>
						<div class="step-card-head">
							<span
								class="numeral numeral-active"
								class:numeral-blocking={step.severity === 'blocking'}>{step.n}</span
							>
							<span class="step-card-name">{step.uiLabel}</span>
						</div>

						<div class="mapping">
							<p class="mapping-path">{mappingPath(step)}</p>
							<p class="mapping-note">
								Karl field <code>{step.rawName}</code>
								{#if step.outcome === 'CHOOSE'}
									· a chooser: search Karl for the entry rather than typing it
								{:else if step.outcome === 'FLAG'}
									· the mockup has nothing to supply here
								{/if}
							</p>
						</div>

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
										<li class="choice">{choice}</li>
									{/each}
								</ul>
							</div>
						{/if}

						{#each step.values as value, v (v)}
							<div class="value">
								<div class="value-strip">
									<span class="value-label">{value.label}</span>
									<button
										type="button"
										class="value-copy"
										onclick={() => copyValue(step, value.label, value.value)}
									>
										{justCopied === `${step.id}:${value.label}` ? 'Copied' : 'Copy'}
									</button>
								</div>
								<p class="value-text">{value.value}</p>
							</div>
						{/each}

						{#if step.notes.length > 0 && step.outcome !== 'FLAG'}
							<!-- The prose lives here, collapsed. The header carries the structure. -->
							<details class="why">
								<summary>Why this mapping</summary>
								{#each step.notes as note, n (n)}
									<p class="why-body">{note}</p>
								{/each}
							</details>
						{/if}

						<div class="step-actions">
							<button type="button" class="btn-primary" onclick={() => markCopiedAndNext(step)}>
								Mark copied · next
							</button>
							<button type="button" class="btn-ghost" onclick={() => goTo(index + 1)}>Skip</button>
						</div>
					</div>
				{:else}
					<button type="button" class="step-row" onclick={() => goTo(i)}>
						<!-- The numeral is the step's identity and survives completion; a
						     checkmark replacing it would take away the thing a reviewer
						     uses to say where they are. -->
						<span class="numeral" class:numeral-done={done}>{step.n}</span>
						<span class="step-row-name" class:step-row-name-done={done}>{step.uiLabel}</span>
						<span class="step-row-meta">
							<code class="step-row-raw">{step.rawName}</code>
							{#if done}<span class="step-row-copied">Copied</span>{/if}
						</span>
					</button>
				{/if}
			</div>
		{/each}

		{#if walkthrough.gaps.length > 0}
			<div class="gap gap-advisory page-gap">
				<p class="gap-title">About this page as a whole</p>
				{#each walkthrough.gaps as gap (gap.path)}
					<p class="gap-body"><code>{gap.path}</code> — {gap.reason}</p>
				{/each}
			</div>
		{/if}
	</div>

	<div class="drawer-foot">
		<!-- api.sf.gov is the real Karl admin, not a route in this app. -->
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
		<a class="drawer-form" href={walkthrough.formUrl} target="_blank" rel="noreferrer">
			Open the Karl add-page form ↗
		</a>
		<button type="button" class="btn-ghost" onclick={onExit}>Exit walkthrough</button>
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
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-secondary, #5a7a92);
	}

	.drawer-position {
		margin-left: auto;
		font-size: 12px;
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

	.drawer-title {
		margin: 12px 0 2px;
		font-family: var(--font-display);
		font-size: 15px;
		line-height: 20px;
		font-weight: 700;
	}

	.drawer-title:focus-visible {
		outline: 2px solid var(--color-sfds-action, #495ed4);
		outline-offset: 3px;
	}

	.drawer-sub {
		margin: 0;
		font-size: 12px;
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
		font-size: 12px;
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

	.step-row-name {
		min-width: 0;
		font-size: 14px;
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

	.step-row-raw,
	.mapping-note code,
	.gap-body code {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 11px;
		color: var(--text-secondary, #5a7a92);
	}

	.step-row-copied {
		font-size: 11px;
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

	.step-card-head {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 10px;
	}

	.step-card-name {
		font-size: 15px;
		font-weight: 700;
	}

	.mapping {
		background: var(--color-sfds-blue-l1, #edf4f7);
		border-radius: 4px;
		padding: 8px 10px;
		margin-bottom: 12px;
	}

	.mapping-path {
		margin: 0 0 4px;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 12px;
		line-height: 18px;
		color: var(--sfds-color-blue-dark, #0c1464);
	}

	.mapping-note {
		margin: 0;
		font-size: 12px;
		line-height: 17px;
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
		font-size: 13px;
		font-weight: 700;
		color: #8f1d15;
	}

	.gap-advisory .gap-title {
		color: #6f4a00;
	}

	.gap-body {
		margin: 0 0 4px;
		font-size: 13px;
		line-height: 19px;
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
		font-size: 11px;
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

	.choice {
		display: inline-flex;
		align-items: center;
		height: 26px;
		padding: 0 12px;
		border-radius: 999px;
		border: 1px solid #c2c2c2;
		font-size: 12px;
	}

	.value {
		border: 1px solid var(--sfds-color-grey-l2);
		border-radius: 4px;
		margin-bottom: 8px;
		background: #ffffff;
	}

	.value-strip {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 10px;
		border-bottom: 1px solid var(--sfds-color-grey-l2);
		background: #f7f7f7;
	}

	.value-label {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
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
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
	}

	.value-text {
		margin: 0;
		padding: 10px;
		font-size: 13px;
		line-height: 19px;
	}

	.why {
		margin-bottom: 8px;
	}

	.why summary {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-sfds-action, #495ed4);
		cursor: pointer;
	}

	.why-body {
		margin: 6px 0 0;
		font-size: 12px;
		line-height: 18px;
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
		font-size: 13px;
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
		font-size: 13px;
		cursor: pointer;
	}

	.drawer-foot {
		flex: none;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 20px;
		border-top: 1px solid var(--sfds-color-grey-l2);
	}

	.drawer-form {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-sfds-action, #495ed4);
		text-underline-offset: 3px;
	}
</style>
