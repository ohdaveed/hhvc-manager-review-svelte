<script lang="ts">
	import type { ChoiceOption } from './types';
	import ErrorMessage from './ErrorMessage.svelte';
	import { nextFieldId } from './fieldId';

	/**
	 * Checkbox or radio group in a fieldset.
	 *
	 * Rules the frames settle:
	 * - Six or more options is a Dropdown; fewer is radios. Radios show every
	 *   answer without opening anything.
	 * - Checkbox corners are 2px, not the site's usual 4px — a 4px corner on a
	 *   24px box reads as a mistake. Radios are circles.
	 *
	 * WCAG 2.1 AA:
	 * - 1.3.1 / 4.1.2. Real `<input type="checkbox">` and `<input type="radio">`
	 *   in a real `<fieldset>` with a `<legend>`. The JSX draws `<span>` boxes
	 *   because a static specimen has no state to bind; shipping that would
	 *   leave the group invisible to assistive tech and unreachable by keyboard.
	 *   The boxes here are the inputs themselves, styled with `appearance: none`,
	 *   so native semantics, focus order and radio arrow-key roving all survive.
	 * - 2.5.8 Target Size. Each label row is at least 44px tall.
	 * - 1.4.11. Focus ring is 3px white then 3px focus blue — the white stop is
	 *   inside the fieldset's own white ground, so it reads on both.
	 * - 1.4.1. Checked state is a filled box plus a glyph, never hue alone.
	 */
	interface Props {
		type?: 'checkbox' | 'radio';
		legend: string;
		help?: string;
		error?: string;
		options?: ChoiceOption[];
		/** Radio: the selected value. Checkbox: the array of selected values. */
		value?: string | string[];
		name?: string;
		disabled?: boolean;
		class?: string;
	}

	let {
		type = 'checkbox',
		legend,
		help,
		error,
		options = [],
		value = $bindable(type === 'radio' ? '' : []),
		name,
		disabled = false,
		class: className = ''
	}: Props = $props();

	const uid = nextFieldId(type);
	const groupName = name ?? uid;
	const helpId = $derived(help ? `${uid}-help` : undefined);
	const errorId = $derived(error ? `${uid}-error` : undefined);
	const describedBy = $derived([helpId, errorId].filter(Boolean).join(' ') || undefined);
</script>

<fieldset
	class="ds-choice flex flex-col gap-4 {className}"
	{disabled}
	aria-describedby={describedBy}
	aria-invalid={error ? 'true' : undefined}
>
	<legend class="ds-legend text-lg leading-7 font-bold">{legend}</legend>

	{#if help}
		<span id={helpId} class="ds-help text-sm leading-5">{help}</span>
	{/if}

	{#each options as option (option.value)}
		<label class="ds-row flex items-center gap-3" class:is-disabled={option.disabled || disabled}>
			{#if type === 'radio'}
				<input
					type="radio"
					class="ds-box ds-radio flex-none"
					name={groupName}
					value={option.value}
					disabled={option.disabled || disabled}
					bind:group={value}
				/>
			{:else}
				<input
					type="checkbox"
					class="ds-box ds-check flex-none"
					name={groupName}
					value={option.value}
					disabled={option.disabled || disabled}
					bind:group={value}
				/>
			{/if}
			<span class="ds-row-label text-base leading-6">{option.label}</span>
		</label>
	{/each}

	{#if error}
		<ErrorMessage id={errorId}>{error}</ErrorMessage>
	{/if}
</fieldset>

<style>
	.ds-choice {
		margin: 0;
		padding: 24px;
		border: 1px solid var(--color-site-border-subtle, #e9eaea);
		background: #ffffff;
		font-family: var(--site-font-body);
	}

	.ds-legend {
		padding: 0 8px;
		margin-left: -8px;
		color: var(--color-site-ink, #0b0c0c);
	}

	.ds-help {
		color: var(--color-site-ink-secondary, #3a3e42);
	}

	.ds-row {
		min-height: var(--site-tap-min, 44px);
		color: var(--color-site-ink, #0b0c0c);
		cursor: pointer;
	}
	.ds-row.is-disabled {
		color: var(--color-site-disabled-fg, #aaabab);
		cursor: default;
	}

	/* The input IS the box. `appearance: none` strips the UA control and leaves
	   a stylable element that is still a real checkbox to the accessibility
	   tree. */
	.ds-box {
		appearance: none;
		-webkit-appearance: none;
		box-sizing: border-box;
		width: 24px;
		height: 24px;
		margin: 0;
		border: 1px solid var(--color-site-ink-muted, #5b5f63);
		background: #ffffff;
		background-repeat: no-repeat;
		background-position: center;
		cursor: inherit;
	}

	.ds-check {
		border-radius: 2px;
	}
	.ds-radio {
		border-radius: 50%;
	}

	.ds-check:checked {
		border-color: var(--color-site-action, #1b519e);
		background-color: var(--color-site-action, #1b519e);
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none'%3E%3Cpath d='M2 11L7 16L18 4' stroke='%23FFFFFF' stroke-width='2.5'/%3E%3C/svg%3E");
		background-size: 16px 16px;
	}

	.ds-radio:checked {
		border: 2px solid var(--color-site-action, #1b519e);
		background-image: radial-gradient(
			circle at center,
			var(--color-site-action, #1b519e) 0 6px,
			#ffffff 6px
		);
	}

	/* Inside a white fieldset, so the first stop is white rather than the page
	   colour. */
	.ds-box:focus-visible {
		outline: none;
		box-shadow:
			0 0 0 3px #ffffff,
			0 0 0 6px var(--color-site-focus, #386ebf);
	}

	.ds-box:disabled {
		border-color: var(--color-site-border, #c9caca);
		background-color: var(--color-site-disabled-bg, #e9eaea);
		background-image: none;
	}
</style>
