<script lang="ts">
	import { pageStore } from '$lib/stores/pageData.svelte';
	import { sessionStore } from '$lib/stores/session.svelte';

	/**
	 * One editable piece of mockup copy.
	 *
	 * Every edit target went through three separate problems, and they are one
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
	 */
	let {
		as = 'p',
		fieldId,
		name,
		value,
		update,
		class: className = '',
		id = undefined
	}: {
		/** Semantic wrapper element -- `h1`, `h2`, `p`, `li`, `div`. */
		as?: string;
		fieldId: string;
		/** Human-facing label for the ActionBar. Display only. */
		name: string;
		value: string;
		update: (next: string) => void;
		class?: string;
		/** Anchor id, kept on the wrapper so in-page links still resolve. */
		id?: string | undefined;
	} = $props();

	// Undefined while the session check is in flight: treat as editable so a
	// signed-in reviewer never sees the controls flicker out and back.
	const editable = $derived(!sessionStore.knownSignedOut);

	function select(event: Event) {
		event.stopPropagation();
		pageStore.activeField = { name, fieldId, content: value, update };
	}
</script>

{#if editable}
	<svelte:element this={as} {id} class={className}>
		<button type="button" class="edit-target" data-rewrite-field={fieldId} onclick={select}>
			{value}
		</button>
	</svelte:element>
{:else}
	<!-- No button, no tabindex, no pointer affordance: signed out, this is
	     just copy. The mockups are static, so reading still works. -->
	<svelte:element this={as} {id} class={className} data-rewrite-field={fieldId}>
		{value}
	</svelte:element>
{/if}
