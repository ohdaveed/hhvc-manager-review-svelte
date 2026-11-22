<script lang="ts">
	import EditTarget from '../EditTarget.svelte';

	/**
	 * The sf.gov callout, shared by a section's `callout` and a step's.
	 *
	 * Measured on live `report-health-nuisance-or-hazards` (2026-11-22,
	 * "Track your case."): #DAEBFF fill, 1px #6FAAFF border, square corners,
	 * 20px 28px padding, a 24px info glyph in #0046C2, and the title as a bold
	 * lead-in run on with the text rather than a heading. The glyph sits above
	 * the text on a phone and in a left gutter from sf.gov's `md` step (see
	 * app.css).
	 *
	 * Run-on is exact signed out. Signed in, each part is its own selection
	 * `<button>`, which a browser always lays out as an atomic inline box, so a
	 * long text drops below the title instead of flowing after it.
	 * ponytail: accepted; one field per button is what keeps edits addressable.
	 *
	 * Field ids and names are passed in, unchanged, by each caller.
	 */
	let {
		title,
		text,
		titleFieldId,
		textFieldId,
		titleName,
		textName
	}: {
		title?: unknown;
		text?: string;
		titleFieldId: string;
		textFieldId: string;
		titleName: string;
		textName: string;
	} = $props();
</script>

<div class="callout">
	<!-- sf.gov's own info glyph, copied from the live markup (as WhatToKnow). -->
	<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="callout-icon">
		<path
			d="M11 7C11 6.44772 11.4477 6 12 6C12.5523 6 13 6.44772 13 7C13 7.55228 12.5523 8 12 8C11.4477 8 11 7.55228 11 7Z"
		/>
		<path d="M11 10L11 18H13L13 10H11Z" />
		<path
			fill-rule="evenodd"
			clip-rule="evenodd"
			d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20Z"
		/>
	</svg>
	<p class="callout-body">
		{#if typeof title === 'string' && title}
			<EditTarget
				as="b"
				class="callout-title"
				fieldId={titleFieldId}
				name={titleName}
				value={title}
			/>
		{/if}
		{#if text}
			<EditTarget
				as="span"
				class="callout-text"
				fieldId={textFieldId}
				name={textName}
				value={text}
			/>
		{/if}
	</p>
</div>
