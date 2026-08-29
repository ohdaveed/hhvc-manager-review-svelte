<script>
	import EditTarget from '../EditTarget.svelte';
	import ButtonBlock from './ButtonBlock.svelte';

	/**
	 * `page.spotlight`: a page-level callout box, distinct from a section
	 * whose `component` hint happens to say `'spotlight'` (those are plain
	 * heading/paragraph/button sections already rendered by `Section.svelte`
	 * and `ButtonBlock`). This is the one actual `spotlight` object per page,
	 * so its field ids have no `sections.{key}.` prefix -- just `spotlight.*`,
	 * per `extractCopy`.
	 */
	let { spotlight } = $props();
</script>

<div class="spotlight-block">
	{#if spotlight.title}
		<EditTarget
			as="h2"
			class="spotlight-block-title"
			fieldId="spotlight.title"
			name="Spotlight Title"
			value={spotlight.title}
		/>
	{/if}

	{#if spotlight.paragraphs}
		{#each spotlight.paragraphs as text, i (i)}
			<EditTarget
				as="p"
				fieldId={`spotlight.paragraphs.${i}`}
				name={`Spotlight Paragraph [${i + 1}]`}
				value={text}
			/>
		{/each}
	{/if}

	{#if spotlight.button}
		<ButtonBlock
			text={spotlight.button}
			url={spotlight.buttonUrl}
			fieldId="spotlight.button"
			urlFieldId="spotlight.buttonUrl"
			name="Spotlight Button"
		/>
	{/if}
</div>

<style>
	.spotlight-block {
		background: var(--brand-90, #dee5fa);
		border-radius: 4px;
		padding: 4px 24px 22px;
		margin: 16px 0;
	}

	:global(.spotlight-block-title) {
		font-family: var(--font-display);
		font-weight: 700;
	}
</style>
