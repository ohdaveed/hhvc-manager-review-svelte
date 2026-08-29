<script lang="ts">
	import Section from './Section.svelte';
	import EditTarget from './EditTarget.svelte';
	import Breadcrumb from './sfgov/Breadcrumb.svelte';
	import OnThisPage from './sfgov/OnThisPage.svelte';
	import WhatToKnow from './WhatToKnow.svelte';
	import SpotlightBlock from './blocks/SpotlightBlock.svelte';

	let { page } = $props();
</script>

<div class="page-body">
	{#if page.type}
		<div class="page-type-eyebrow">{page.type}</div>
	{/if}

	<!-- Ordering follows the design prototype's own DOM order: eyebrow,
	     breadcrumb, title, summary, contents, the What-to-know box, audience,
	     then the sections. -->
	<Breadcrumb partOf={page.partOf} />

	<!-- `title` and `summary` are the exact keys HelpPanel folds on
	     (src/lib/components/workspace/HelpPanel.svelte) -- anything else lands in
	     the generic section_edits bucket instead of edited_title/edited_summary. -->
	<EditTarget as="h1" class="page-title" name="Title" fieldId="title" value={page.title} />

	{#if page.summary}
		<div class="page-summary">
			<EditTarget name="Summary" fieldId="summary" value={page.summary} />
		</div>
	{/if}

	<OnThisPage sections={page.sections} />

	<WhatToKnow whatToKnow={page.whatToKnow} type={page.type} />

	{#if page.audience && page.audience.length > 0}
		<div class="page-audience">
			{#each page.audience as a, i (i)}
				<EditTarget name={`Audience [${i + 1}]`} fieldId={`audience.${i}`} value={a} />
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

	<!-- Page-level `spotlight`, which one page carries. Not to be confused with
	     a SECTION whose `component` is 'spotlight' -- those are ordinary
	     heading/paragraph/button sections `Section.svelte` already renders. -->
	{#if page.spotlight}
		<SpotlightBlock spotlight={page.spotlight} />
	{/if}
</div>
