<script lang="ts">
	import { pageStore } from '$lib/stores/pageData.svelte';
	import { sessionStore } from '$lib/stores/session.svelte';

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
	 *    match `data-rewrite-field` exactly; HelpPanel folds edits by it.
	 * 3. Signed-out. With no session `saveInlineEdit` rolls back and returns,
	 *    so an editable-looking mockup silently discards work. Signed out, the
	 *    copy renders as plain text with no affordance.
	 * 4. Selection is now a SET, not one field (design 1b). The badge number is
	 *    the field's position in `selectedFieldIds`, which is what ties a
	 *    highlight on the page to its suggestion card in the panel.
	 */
	let {
		as = 'p',
		fieldId,
		name,
		value,
		update,
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
		update: (next: string) => void;
		/** Corpus copy HHVC has not confirmed; drives the panel's callout. */
		unverified?: boolean;
		class?: string;
		/** Anchor id, kept on the wrapper so in-page links still resolve. */
		id?: string | undefined;
	} = $props();

	// Undefined while the session check is in flight: treat as editable so a
	// signed-in reviewer never sees the controls flicker out and back.
	const editable = $derived(!sessionStore.knownSignedOut);

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
	<svelte:element this={as} {id} class="{className} {selected ? 'edit-target-host' : ''}">
		<button
			type="button"
			class="edit-target {selected ? 'edit-target-selected' : ''}"
			data-rewrite-field={fieldId}
			aria-pressed={selected}
			aria-label={selected ? `${name}, selected, field ${badge}` : name}
			onclick={select}
		>
			{#if selected}
				<!-- Absolutely positioned, and never with a negative horizontal
				     margin: that overflows the mockup sideways. Vertical room is
				     made by the host element instead. -->
				<span class="edit-target-badge" aria-hidden="true">{badge} · {name}</span>
			{/if}
			{value}
		</button>
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
	>
		{value}
	</svelte:element>
{/if}
