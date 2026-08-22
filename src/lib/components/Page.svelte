<script lang="ts">
	import Section from './Section.svelte';
	let { page } = $props();
</script>

<div class="page-body">
	{#if page.type}
		<div class="page-type-eyebrow">{page.type}</div>
	{/if}
	
	<h1 class="page-title" data-rewrite-field="title">{page.title}</h1>
	
	{#if page.summary}
		<div class="page-summary" data-rewrite-field="summary">
			<p>{page.summary}</p>
		</div>
	{/if}

	{#if page.audience && page.audience.length > 0}
		<div class="page-audience">
			{#each page.audience as a, i}
				<p data-rewrite-field="audience.{i}">{a}</p>
			{/each}
		</div>
	{/if}

	<div class="page-content">
		{#if page.sections}
			{#each page.sections as section, index}
				<Section {section} {index} />
			{/each}
		{/if}
	</div>
</div>
