<script lang="ts">
	let { section, index } = $props();
</script>

<div class="page-section {section.kind || 'body'}">
	{#if section.heading}
		<h2 class="section-heading" id={section.heading.toLowerCase().replace(/\s+/g, '-')}>
			{section.heading}
		</h2>
	{/if}

	{#if section.paragraphs}
		{#each section.paragraphs as p, i}
			<p data-rewrite-field="sections.{index}.paragraphs.{i}">{p}</p>
		{/each}
	{/if}

	{#if section.bullets}
		<ul>
			{#each section.bullets as b, i}
				<li data-rewrite-field="sections.{index}.bullets.{i}">{b}</li>
			{/each}
		</ul>
	{/if}

	{#if section.callout}
		<div class="callout">
			{#if section.callout.title}
				<h3>{section.callout.title}</h3>
			{/if}
			<p data-rewrite-field="sections.{index}.callout.text">{section.callout.text}</p>
		</div>
	{/if}
	
	<!-- Additional components like cards, resources, etc., can be added here incrementally -->
</div>
