<script lang="ts">
	import { pageStore } from '$lib/stores/pageData.svelte';
	import { sessionStore } from '$lib/stores/session.svelte';
	import MarkdownText from './MarkdownText.svelte';
	import KarlChip from './KarlChip.svelte';
	import { outlineContext } from '$lib/karl/outlineContext';

	/**
	 * One editable piece of mockup copy.
	 *
	 * Every edit target went through four separate problems, and they are one
	 * problem: what an edit target *is*.
	 *
	 * 1. Keyboard. These were `<p role="button" tabindex="0" onclick>` with no
	 *    key handler, so a keyboard-only reviewer could not edit anything --
	 *    on an SF.gov property, where the edit targets are the whole
	 *    interaction. Now a real `<button>` does it: Enter and Space, focus
	 *    order and the accessible role all come free and correct.
	 * 2. Identity. `fieldId` is the value written to `edits.field_id` and must
	 *    match `data-rewrite-field` exactly; `reviewRecordFor` folds edits by it.
	 * 3. Signed-out. With no session `saveInlineEdit` rolls back and returns,
	 *    so an editable-looking mockup silently discards work. Signed out, the
	 *    copy renders as plain text with no affordance.
	 * 4. Selection is now a SET, not one field (design 1b). The badge number is
	 *    the field's position in `selectedFieldIds`, which is what ties a
	 *    highlight on the page to its suggestion card in the panel.
	 * 5. There is no `update` prop. Every caller used to hand one down, closing
	 *    over `section.paragraphs[i]` -- which is a stale closure after a
	 *    re-render, and the reason `fieldResolver` walks the live corpus by id
	 *    instead. The panel writes through the resolver; nothing wrote through
	 *    this, and a required prop nobody calls is a trap for the next caller.
	 */
	let {
		as = 'p',
		fieldId,
		name,
		value,
		unverified = false,
		class: className = '',
		id = undefined
	}: {
		/** Semantic wrapper element -- `h1`, `h2`, `p`, `li`, `div`. */
		as?: string;
		fieldId: string;
		/** Human-facing label for the panel. Display only. */
		name: string;
		value: string;
		/** Corpus copy HHVC has not confirmed; drives the panel's callout. */
		unverified?: boolean;
		class?: string;
		/** Anchor id, kept on the wrapper so in-page links still resolve. */
		id?: string | undefined;
	} = $props();

	// Undefined while the session check is in flight: treat as editable so a
	// signed-in reviewer never sees the controls flicker out and back.
	const editable = $derived(!sessionStore.knownSignedOut);

	// The Karl outline (see `$lib/karl/outlineContext`). `placement` is undefined
	// when the outline is off, so every attribute below drops away with it.
	const outline = outlineContext();
	const placement = $derived(outline?.placements?.fields.get(fieldId));
	const karlStatus = $derived(placement?.status);
	const karlField = $derived(placement ? (placement.rawName ?? 'unplaced') : undefined);
	// A chip only where this field has something of its own to say, or is a
	// page-level block no section chip speaks for (`placement.chip`). A field
	// that merely shares its section's status is covered by the section's chip.
	const chip = $derived(placement?.chip ? placement : undefined);
	// Outlined on its own only when it says something its section does not:
	// placed strings inside a placed section stay quiet (decision 9).
	const karlFlag = $derived(chip || karlStatus === 'unplaced' ? '' : undefined);
	const chipId = $derived(`karl-chip-${fieldId.replace(/[^a-zA-Z0-9_-]/g, '-')}`);
	// Text inside a heading becomes part of its name, so a chip there is never
	// read inline -- signed in, the button's description carries it.
	const inHeading = $derived(/^h[1-6]$/.test(as));

	const selected = $derived(pageStore.isSelected(fieldId));
	const badge = $derived(pageStore.badgeNumber(fieldId));

	function select(event: MouseEvent | KeyboardEvent) {
		event.stopPropagation();
		// Shift extends the selection. `metaKey`/`ctrlKey` too, because that is
		// what every list in every OS does and a reviewer will try it.
		const additive = event.shiftKey || event.metaKey || event.ctrlKey;
		pageStore.select(fieldId, additive);
	}
</script>

{#if editable}
	<svelte:element
		this={as}
		{id}
		class="{className} {selected ? 'edit-target-host' : ''}"
		data-karl-status={karlStatus}
		data-karl-field={karlField}
		data-karl-flag={karlFlag}
	>
		<button
			type="button"
			class="edit-target {selected ? 'edit-target-selected' : ''}"
			data-rewrite-field={fieldId}
			aria-pressed={selected}
			aria-label={selected ? `${name}, selected, field ${badge}` : name}
			aria-describedby={chip ? chipId : undefined}
			onclick={select}
		>
			{#if selected}
				<!-- Absolutely positioned, and never with a negative horizontal
				     margin: that overflows the mockup sideways. Vertical room is
				     made by the host element instead. -->
				<span class="edit-target-badge" aria-hidden="true">{badge} · {name}</span>
			{/if}
			<!-- `interactive={false}`: this is inside the selection `<button>`, and an
			     `<a>` nested in a `<button>` is invalid HTML. `value` itself is
			     untouched -- the raw markdown is still what `select` puts on the
			     panel and what any rewrite writes back. -->
			<MarkdownText {value} interactive={false} />
		</button>
		{#if chip}
			<!-- Inside the host, never beside it: the host may be an `li`, `dt` or
			     `dd`, where a sibling would be invalid markup. Hidden, because the
			     button's `aria-describedby` already reads it out. -->
			<KarlChip id={chipId} status={chip.status} label={chip.label} reasons={chip.reasons} hidden />
		{/if}
	</svelte:element>
{:else}
	<!-- No button, no tabindex, no pointer affordance: signed out, this is
	     just copy. The mockups are static, so reading still works. -->
	<svelte:element
		this={as}
		{id}
		class={className}
		data-rewrite-field={fieldId}
		data-unverified={unverified || undefined}
		data-karl-status={karlStatus}
		data-karl-field={karlField}
		data-karl-flag={karlFlag}
	>
		<MarkdownText {value} />
		{#if chip}
			<!-- Signed out there is no button to describe, so the chip is read
			     inline -- except inside a heading, where it would rename it. -->
			<KarlChip status={chip.status} label={chip.label} reasons={chip.reasons} hidden={inHeading} />
		{/if}
	</svelte:element>
{/if}
