<script lang="ts">
	import type { SelectOption, SelectGroup } from './types';
	import ErrorMessage from './ErrorMessage.svelte';
	import { nextFieldId } from './fieldId';

	/**
	 * Dropdown — a native `<select>`.
	 *
	 * This is the one component that departs from its JSX counterpart in
	 * structure rather than syntax, and the departure is deliberate.
	 *
	 * The JSX renders `<div role="combobox">` over `<div role="listbox">` with
	 * `<div role="option">` rows. As a static specimen that is fine: it shows
	 * the open menu, the group headers, the hover row and the selected tick.
	 * As a shipped control it would have to implement roving focus,
	 * `aria-activedescendant`, type-ahead, Home/End/PageUp/PageDown, Escape to
	 * close with focus restored, click-outside, scroll-into-view of the active
	 * option, and the mobile picker — and every one of those is a place the
	 * WCAG 2.1 AA gate can regress silently later.
	 *
	 * A native `<select>` has all of it, on every platform, permanently.
	 *
	 * What is lost, recorded honestly:
	 * - The open menu cannot be styled. Row height, hover fill, the 700-weight
	 *   selected row and the tick glyph are the OS's, not the frames'.
	 * - The closed control is styled to the frames exactly: 48px (56px mobile),
	 *   4px radius, the same border ramp and the same two-stop focus ring.
	 * - Group headers become `<optgroup label>`, which the OS renders in its own
	 *   way — usually bold and indented, not the frames' uppercase 14px eyebrow.
	 *
	 * WCAG 2.1 AA:
	 * - 4.1.2 Name, Role, Value — native, and cannot drift.
	 * - 3.3.2. Visible `<label for>`, help text between label and control.
	 * - 1.4.11. Two-stop focus ring; the chevron is a background image and is
	 *   never the only indicator of anything.
	 * - The placeholder row is `disabled` and `selected` so it can be shown but
	 *   not chosen — a required select then fails validation rather than
	 *   silently submitting the prompt text.
	 */
	interface Props {
		label: string;
		help?: string;
		error?: string;
		placeholder?: string;
		value?: string;
		options?: (SelectOption | SelectGroup)[];
		disabled?: boolean;
		required?: boolean;
		mobile?: boolean;
		id?: string;
		name?: string;
		class?: string;
	}

	let {
		label,
		help,
		error,
		placeholder = 'Choose an option',
		value = $bindable(''),
		options = [],
		disabled = false,
		required = false,
		mobile = false,
		id,
		name,
		class: className = ''
	}: Props = $props();

	const uid = id ?? nextFieldId('select');
	const helpId = $derived(help ? `${uid}-help` : undefined);
	const errorId = $derived(error ? `${uid}-error` : undefined);
	const describedBy = $derived([helpId, errorId].filter(Boolean).join(' ') || undefined);

	function isGroup(o: SelectOption | SelectGroup): o is SelectGroup {
		return 'group' in o;
	}
</script>

<div class="ds-field flex flex-col gap-2 {className}" class:is-disabled={disabled}>
	<label for={uid} class="ds-label text-base leading-6 font-bold">
		{label}{#if required}<span class="ds-req" aria-hidden="true"> *</span>{/if}
	</label>

	{#if help}
		<span id={helpId} class="ds-help text-sm leading-5">{help}</span>
	{/if}

	<select
		id={uid}
		{name}
		{disabled}
		{required}
		bind:value
		aria-describedby={describedBy}
		aria-invalid={error ? 'true' : undefined}
		class="ds-select"
		class:is-error={!!error}
		class:is-mobile={mobile}
		class:is-placeholder={!value}
	>
		<option value="" disabled selected={!value}>{placeholder}</option>
		{#each options as option, i (i)}
			{#if isGroup(option)}
				<optgroup label={option.group}>
					{#each option.options as child (child.value)}
						<option value={child.value} disabled={child.disabled}>{child.label}</option>
					{/each}
				</optgroup>
			{:else}
				<option value={option.value} disabled={option.disabled}>{option.label}</option>
			{/if}
		{/each}
	</select>

	{#if error}
		<ErrorMessage id={errorId}>{error}</ErrorMessage>
	{/if}
</div>

<style>
	.ds-field {
		font-family: var(--site-font-body);
	}
	.ds-label {
		color: var(--color-site-ink, #0b0c0c);
	}
	.ds-help {
		color: var(--color-site-ink-secondary, #3a3e42);
	}
	.ds-req {
		color: var(--color-site-danger, #ac0000);
	}

	.ds-select {
		appearance: none;
		-webkit-appearance: none;
		box-sizing: border-box;
		width: 100%;
		height: var(--site-field-height, 48px);
		padding: 0 48px 0 16px;
		border: 1px solid var(--color-site-ink-muted, #5b5f63);
		border-radius: var(--site-radius, 4px);
		background-color: var(--color-site-surface-input, #ffffff);
		/* The frames' chevron, as a background image so it cannot take focus or
		   intercept the click the way an overlaid SVG would. */
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none'%3E%3Cpath d='M3 7L10 14L17 7' stroke='%230B0C0C' stroke-width='2'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 16px center;
		background-size: 20px 20px;
		font-family: inherit;
		font-size: 16px;
		line-height: 24px;
		color: var(--color-site-ink, #0b0c0c);
		cursor: pointer;
	}

	.ds-select.is-mobile {
		height: var(--site-field-height-mobile, 56px);
	}

	/* The prompt row is muted; a chosen value is full ink. Matches the frames'
	   placeholder treatment without using a real placeholder attribute, which
	   `<select>` does not have. */
	.ds-select.is-placeholder {
		color: var(--color-site-ink-muted, #5b5f63);
	}

	.ds-select:hover:not(:disabled) {
		border-color: var(--color-site-ink, #0b0c0c);
	}

	.ds-select:focus-visible {
		outline: none;
		border-color: var(--color-site-action, #1b519e);
		box-shadow: var(--site-focus-ring, 0 0 0 4px #fcfcfc, 0 0 0 7px #386ebf);
	}

	.ds-select.is-error {
		border: 2px solid var(--color-site-danger, #ac0000);
	}

	.ds-select:disabled {
		border-color: var(--color-site-border, #c9caca);
		background-color: var(--color-site-disabled-bg, #e9eaea);
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none'%3E%3Cpath d='M3 7L10 14L17 7' stroke='%23AAABAB' stroke-width='2'/%3E%3C/svg%3E");
		color: var(--color-site-disabled-fg, #aaabab);
		cursor: default;
	}

	.is-disabled .ds-label,
	.is-disabled .ds-help {
		color: var(--color-site-disabled-fg, #aaabab);
	}
</style>
