<script lang="ts">
	import Section from './Section.svelte';
	import EditTarget from './EditTarget.svelte';

	let { page } = $props();
</script>

<div class="page-body">
	{#if page.type}
		<div class="page-type-eyebrow">{page.type}</div>
	{/if}

	<!-- `title` and `summary` are the exact keys HelpPanel folds on
	     (src/lib/components/workspace/HelpPanel.svelte) -- anything else lands in
	     the generic section_edits bucket instead of edited_title/edited_summary. -->
	<EditTarget
		as="h1"
		class="page-title"
		name="Title"
		fieldId="title"
		value={page.title}
		update={(v) => (page.title = v)}
	/>

	{#if page.summary}
		<div class="page-summary">
			<EditTarget
				name="Summary"
				fieldId="summary"
				value={page.summary}
				update={(v) => (page.summary = v)}
			/>
		</div>
	{/if}

	{#if page.audience && page.audience.length > 0}
		<div class="page-audience">
			{#each page.audience as a, i (i)}
				<EditTarget
					name={`Audience [${i + 1}]`}
					fieldId={`audience.${i}`}
					value={a}
					update={(v) => (page.audience[i] = v)}
				/>
			{/each}
		</div>
	{/if}

	<div class="page-content">
		{#if page.sections}
			{#each page.sections as section, index (section.fieldKey ?? index)}
				<Section {section} {index} />
			{/each}
		{/if}
	</div>
</div>
