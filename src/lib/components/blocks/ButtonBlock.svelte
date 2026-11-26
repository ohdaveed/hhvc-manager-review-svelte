<script>
	import EditTarget from '../EditTarget.svelte';
	import { pageStore } from '$lib/stores/pageData.svelte';

	/**
	 * A mockup CTA button. Shared by section-level `button`/`buttonUrl`, step
	 * buttons, and the page-level `spotlight.button`/`spotlight.buttonUrl` --
	 * three callers with three different field-id prefixes, one render.
	 *
	 * The visible label is a real EditTarget (a real `<button>`, because
	 * selecting it for editing is a real action). It is NOT wrapped in an
	 * outer `<button>` or `<a href>`: this tool has nowhere for the link to
	 * go, and a second interactive element with no destination is exactly the
	 * "inert furniture" axe flags. The `url`, when present, is copy too
	 * (extractCopy includes it) so it renders as its own small edit target
	 * rather than a functional `href` -- but only while the button or its link
	 * is selected, since sf.gov never prints a destination.
	 */
	let { text, url, fieldId, urlFieldId, name, variant = 'primary' } = $props();
</script>

{#if text}
	<!-- `variant` is the corpus's `buttonStyle`. Only 'secondary' changes
	     anything; any other value draws the primary button. -->
	<div class="button-block" data-variant={variant}>
		<EditTarget as="span" class="button-block-cta" {fieldId} name={`${name}`} value={text} />
		<!-- The destination shows only while the button or its link is selected:
		     sf.gov prints neither, and a hidden field is still one click away. -->
		{#if url && (pageStore.isSelected(fieldId) || pageStore.isSelected(urlFieldId))}
			<EditTarget
				as="span"
				class="button-block-url"
				fieldId={urlFieldId}
				name={`${name} Link`}
				value={url}
			/>
		{/if}
	</div>
{/if}

<style>
	.button-block {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
		/* 40px above, 20px below: live's list-to-button and button-to-callout
		   gaps on `report-health-nuisance-or-hazards`, 2026-11-26. */
		margin: 40px 0 20px;
	}

	/* `.edit-target` is a global Tailwind `@utility` (`block w-full ...`), built
	   for full-width copy like a paragraph. A CTA pill needs to hug its text
	   instead, so the override lives here rather than on the shared utility --
	   plain component CSS is unlayered and outranks the Tailwind utility layer
	   in this app regardless of specificity (see app.css's own note on the
	   same cascade fact). Padding sits on the outer element so the signed-out
	   branch (plain text, no inner button) still gets the same pill shape. */
	/* Live sf.gov's "View 311 online services", measured 2026-11-22: 15px 16px
	   padding inside a 1px transparent border (52px tall), 4px radius, #2A60AF
	   fill, #FCFCFC text at 14/20 weight 400. */
	:global(.button-block-cta) {
		display: inline-flex;
		padding: 15px 16px;
		border: 1px solid transparent;
		border-radius: var(--site-radius);
		background: var(--color-site-action-fill);
		color: var(--color-site-surface);
		font-size: 0.875rem;
		font-weight: 400;
		line-height: 1.25rem;
	}

	/* Secondary, from the design system's own `SiteButton` (Figma-sourced, see
	   src/lib/components/sfgov/ds/README.md): soft action fill, dark action
	   text. No live HHVC page shows one to measure. */
	.button-block[data-variant='secondary'] :global(.button-block-cta) {
		border-color: var(--color-site-action-soft);
		background: var(--color-site-action-soft);
		color: var(--color-site-action-dark);
	}

	:global(.button-block-cta .edit-target) {
		display: inline;
		width: auto;
		padding: 0;
		margin: 0;
		color: inherit;
	}

	:global(.button-block-url) {
		font-size: 13px;
		color: var(--text-secondary, #1d4d70);
		word-break: break-all;
	}
</style>
