<script lang="ts">
	import type { Snippet } from 'svelte';
	import ErrorMessage from './ErrorMessage.svelte';
	import { nextFieldId } from './fieldId';

	/**
	 * Single-line text field. 48px tall, 56px under 640px.
	 *
	 * Rules the frames settle:
	 * - The label is always visible and always above the field.
	 * - Help text sits between label and field, never below it.
	 * - A placeholder is an example of the format, never a label.
	 * - Errors are 2px, not colour, and the message says what to do.
	 *
	 * WCAG 2.1 AA:
	 * - 3.3.2 Labels or Instructions. A real `<label for>`, not an aria-label —
	 *   visible text is a stronger guarantee and survives translation.
	 * - 1.3.1 / 3.3.1. `aria-describedby` chains help text and the error message
	 *   onto the input, and `aria-invalid` marks the field so a screen reader
	 *   reports the state, not just the colour.
	 * - 1.4.11. The two-stop focus ring; the error border is 2px so the state is
	 *   carried by width as well as hue.
	 * - 1.4.4 Resize Text. Heights are px tokens but the input font is 16px,
	 *   which also stops iOS Safari zooming the viewport on focus.
	 */
	interface Props {
		label: string;
		help?: string;
		error?: string;
		value?: string;
		placeholder?: string;
		type?: 'text' | 'email' | 'tel' | 'url' | 'search' | 'password';
		disabled?: boolean;
		required?: boolean;
		/** 56px instead of 48px. The caller owns the breakpoint. */
		mobile?: boolean;
		id?: string;
		name?: string;
		autocomplete?: string;
		prefix?: Snippet;
		suffix?: Snippet;
		class?: string;
	}

	let {
		label,
		help,
		error,
		value = $bindable(''),
		placeholder,
		type = 'text',
		disabled = false,
		required = false,
		mobile = false,
		id,
		name,
		autocomplete,
		prefix,
		suffix,
		class: className = ''
	}: Props = $props();

	const uid = id ?? nextFieldId('text');
	const helpId = $derived(help ? `${uid}-help` : undefined);
	const errorId = $derived(error ? `${uid}-error` : undefined);
	const describedBy = $derived([helpId, errorId].filter(Boolean).join(' ') || undefined);
	const hasAffix = $derived(!!prefix || !!suffix);
</script>

<div class="ds-field flex flex-col gap-2 {className}" class:is-disabled={disabled}>
	<label for={uid} class="ds-label text-base leading-6 font-bold">
		{label}{#if required}<span class="ds-req" aria-hidden="true"> *</span>{/if}
	</label>

	{#if help}
		<span id={helpId} class="ds-help text-sm leading-5">{help}</span>
	{/if}

	<div
		class="ds-control flex items-center gap-3"
		class:is-error={!!error}
		class:is-mobile={mobile}
		class:has-affix={hasAffix}
	>
		{#if prefix}
			<span class="ds-affix ds-affix-start flex items-center self-stretch">{@render prefix()}</span>
		{/if}
		<input
			id={uid}
			{name}
			{type}
			{placeholder}
			{disabled}
			{required}
			{autocomplete}
			bind:value
			aria-describedby={describedBy}
			aria-invalid={error ? 'true' : undefined}
			class="ds-input min-w-0 flex-1"
		/>
		{#if suffix}
			<span class="ds-affix ds-affix-end flex items-center self-stretch">{@render suffix()}</span>
		{/if}
	</div>

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

	.ds-control {
		box-sizing: border-box;
		height: var(--site-field-height, 48px);
		padding: 0 16px;
		border: 1px solid var(--color-site-ink-muted, #5b5f63);
		border-radius: var(--site-radius, 4px);
		background: var(--color-site-surface-input, #ffffff);
	}
	.ds-control.is-mobile {
		height: var(--site-field-height-mobile, 56px);
	}
	.ds-control.has-affix {
		padding: 0;
		overflow: hidden;
	}

	.ds-control:hover {
		border-color: var(--color-site-ink, #0b0c0c);
	}

	/* :focus-within rather than :focus on the input — the ring belongs to the
	   whole control including its affixes, which are part of the same box. */
	.ds-control:focus-within {
		border-color: var(--color-site-action, #1b519e);
		box-shadow: var(--site-focus-ring, 0 0 0 4px #fcfcfc, 0 0 0 7px #386ebf);
	}

	/* 2px, so the state is carried by width and not by red alone. The border
	   colour still wins over :hover, which is why this rule follows it. */
	.ds-control.is-error {
		border: 2px solid var(--color-site-danger, #ac0000);
	}

	.ds-input {
		height: 100%;
		padding: 0;
		border: 0;
		outline: none;
		background: transparent;
		font: inherit;
		font-size: 16px;
		line-height: 24px;
		color: var(--color-site-ink, #0b0c0c);
	}
	.has-affix .ds-input {
		padding: 0 16px;
	}
	.ds-input::placeholder {
		color: var(--color-site-ink-muted, #5b5f63);
	}

	.ds-affix {
		padding: 0 16px;
		background: var(--color-site-tint, #f2f6fc);
		font-size: 16px;
		line-height: 24px;
		color: var(--color-site-ink-secondary, #3a3e42);
	}
	.ds-affix-start {
		border-right: 1px solid var(--color-site-ink-muted, #5b5f63);
	}
	.ds-affix-end {
		border-left: 1px solid var(--color-site-ink-muted, #5b5f63);
	}

	.is-disabled .ds-label,
	.is-disabled .ds-help {
		color: var(--color-site-disabled-fg, #aaabab);
	}
	.is-disabled .ds-control,
	.ds-control:has(.ds-input:disabled) {
		border-color: var(--color-site-border, #c9caca);
		background: var(--color-site-disabled-bg, #e9eaea);
	}
	.ds-input:disabled {
		color: var(--color-site-disabled-fg, #aaabab);
		-webkit-text-fill-color: var(--color-site-disabled-fg, #aaabab);
	}
</style>
