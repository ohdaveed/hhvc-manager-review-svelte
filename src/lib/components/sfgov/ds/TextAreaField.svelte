<script lang="ts">
	import ErrorMessage from './ErrorMessage.svelte';
	import { nextFieldId } from './fieldId';

	/**
	 * Multi-line text field.
	 *
	 * Same label, help and error rules as TextField — see that file's header.
	 * The only differences here are a 4-row default and `resize: vertical`,
	 * which is disabled when the field is.
	 *
	 * WCAG 2.1 AA:
	 * - 1.4.4 / 1.4.10. Vertical resize is left on deliberately. Locking a
	 *   textarea to a fixed height forces horizontal scrolling inside it at
	 *   200% zoom.
	 * - 3.3.2 / 3.3.1. Same describedby + aria-invalid wiring as TextField.
	 */
	interface Props {
		label: string;
		help?: string;
		error?: string;
		value?: string;
		placeholder?: string;
		rows?: number;
		disabled?: boolean;
		required?: boolean;
		maxlength?: number;
		id?: string;
		name?: string;
		class?: string;
	}

	let {
		label,
		help,
		error,
		value = $bindable(''),
		placeholder,
		rows = 4,
		disabled = false,
		required = false,
		maxlength,
		id,
		name,
		class: className = ''
	}: Props = $props();

	const uid = id ?? nextFieldId('textarea');
	const helpId = $derived(help ? `${uid}-help` : undefined);
	const errorId = $derived(error ? `${uid}-error` : undefined);
	const describedBy = $derived([helpId, errorId].filter(Boolean).join(' ') || undefined);
</script>

<div class="ds-field flex flex-col gap-2 {className}" class:is-disabled={disabled}>
	<label for={uid} class="ds-label text-base leading-6 font-bold">
		{label}{#if required}<span class="ds-req" aria-hidden="true"> *</span>{/if}
	</label>

	{#if help}
		<span id={helpId} class="ds-help text-sm leading-5">{help}</span>
	{/if}

	<textarea
		id={uid}
		{name}
		{rows}
		{placeholder}
		{disabled}
		{required}
		{maxlength}
		bind:value
		aria-describedby={describedBy}
		aria-invalid={error ? 'true' : undefined}
		class="ds-textarea"
		class:is-error={!!error}></textarea>

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

	.ds-textarea {
		box-sizing: border-box;
		padding: 12px 16px;
		border: 1px solid var(--color-site-ink-muted, #5b5f63);
		border-radius: var(--site-radius, 4px);
		background: var(--color-site-surface-input, #ffffff);
		font-family: inherit;
		font-size: 16px;
		line-height: 24px;
		color: var(--color-site-ink, #0b0c0c);
		resize: vertical;
	}
	.ds-textarea::placeholder {
		color: var(--color-site-ink-muted, #5b5f63);
	}
	.ds-textarea:hover:not(:disabled) {
		border-color: var(--color-site-ink, #0b0c0c);
	}
	.ds-textarea:focus-visible {
		outline: none;
		border-color: var(--color-site-action, #1b519e);
		box-shadow: var(--site-focus-ring, 0 0 0 4px #fcfcfc, 0 0 0 7px #386ebf);
	}
	.ds-textarea.is-error {
		border: 2px solid var(--color-site-danger, #ac0000);
	}
	.ds-textarea:disabled {
		border-color: var(--color-site-border, #c9caca);
		background: var(--color-site-disabled-bg, #e9eaea);
		color: var(--color-site-disabled-fg, #aaabab);
		-webkit-text-fill-color: var(--color-site-disabled-fg, #aaabab);
		resize: none;
	}
	.is-disabled .ds-label,
	.is-disabled .ds-help {
		color: var(--color-site-disabled-fg, #aaabab);
	}
</style>
