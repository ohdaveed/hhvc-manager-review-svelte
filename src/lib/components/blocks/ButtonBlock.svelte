<script>
	import EditTarget from '../EditTarget.svelte';

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
	 * rather than a functional `href`.
	 */
	let { text, url, fieldId, urlFieldId, name } = $props();
</script>

{#if text}
	<div class="button-block">
		<EditTarget as="span" class="button-block-cta" {fieldId} name={`${name}`} value={text} />
		{#if url}
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
		margin: 16px 0;
	}

	/* `.edit-target` is a global Tailwind `@utility` (`block w-full ...`), built
	   for full-width copy like a paragraph. A CTA pill needs to hug its text
	   instead, so the override lives here rather than on the shared utility --
	   plain component CSS is unlayered and outranks the Tailwind utility layer
	   in this app regardless of specificity (see app.css's own note on the
	   same cascade fact). Padding sits on the outer element so the signed-out
	   branch (plain text, no inner button) still gets the same pill shape. */
	:global(.button-block-cta) {
		display: inline-flex;
		padding: 10px 20px;
		border-radius: 6px;
		background: var(--color-sfds-action, #495ed4);
		color: #ffffff;
		font-weight: 600;
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
