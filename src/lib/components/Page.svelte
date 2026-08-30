<script lang="ts">
	import Section from './Section.svelte';
	import EditTarget from './EditTarget.svelte';
	import Breadcrumb from './sfgov/Breadcrumb.svelte';
	import WhatToKnow from './WhatToKnow.svelte';
	import SpotlightBlock from './blocks/SpotlightBlock.svelte';

	let { page } = $props();
</script>

<div class="page-body">
	{#if page.type}
		<div class="page-type-eyebrow">{page.type}</div>
	{/if}

	<!-- Ordering follows a live sf.gov page: eyebrow, breadcrumb, title, summary,
	     the owning agency, the What-to-know box, audience, then the sections.
	     
	     The prototype put an "On this page" TOC between summary and What-to-know
	     and `OnThisPage.svelte` says plainly that no Karl field backs it. Three
	     live pages captured 2026-08-30 -- a Transaction, an Information and a
	     Topic -- carry no such nav, so it is not rendered here. The component is
	     kept (the design-system specimen still shows it) and this is one line to
	     put back if the prototype is the standard rather than sf.gov. -->
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

	<!-- `primary_agency` -- the department that owns the service. On every live
	     sf.gov page captured it sits directly under the summary as a link, and it
	     was the most consistent element across the captures and absent from all
	     29 mockups. Inert like the rest of the mockup chrome (see `Breadcrumb`):
	     a non-functional anchor is an axe failure, so this is a styled span. -->
	{#if page.primaryAgency}
		<div class="page-primary-agency">
			<EditTarget name="Primary agency" fieldId="primaryAgency" value={page.primaryAgency} />
		</div>
	{/if}

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
