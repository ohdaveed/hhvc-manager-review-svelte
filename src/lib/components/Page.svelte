<script lang="ts">
	import Section from './Section.svelte';
	import EditTarget from './EditTarget.svelte';
	import Breadcrumb from './sfgov/Breadcrumb.svelte';
	import WhatToKnow from './WhatToKnow.svelte';
	import SpotlightBlock from './blocks/SpotlightBlock.svelte';
	import LinkGrid from './blocks/LinkGrid.svelte';
	import ContactSection from './blocks/ContactSection.svelte';

	let { page } = $props();

	// The label live sf.gov prints in the type pill, measured 2026-11-22. Agency
	// pages print an empty pill and Campaign, Report, Resource Collection and
	// About us had no live example, so those keep the corpus type name.
	const typeLabels: Record<string, string> = {
		Transaction: 'Service',
		Information: 'Info Page',
		'Step by step': 'Step-by-step'
	};
</script>

{#snippet pageHeader()}
	{#if page.type}
		<div class="page-type-eyebrow">{typeLabels[page.type] ?? page.type}</div>
	{/if}

	<!-- Ordering follows a live sf.gov page: eyebrow, breadcrumb, title, summary,
	     the owning agency, the What-to-know box, then the sections.
	     
	     The prototype put an "On this page" TOC between summary and What-to-know
	     and `OnThisPage.svelte` says plainly that no Karl field backs it. Three
	     live pages captured 2026-08-30 -- a Transaction, an Information and a
	     Topic -- carry no such nav, so it is not rendered here. The component is
	     kept (the design-system specimen still shows it) and this is one line to
	     put back if the prototype is the standard rather than sf.gov. -->
	<Breadcrumb partOf={page.partOf} />

	<!-- `title` and `summary` are the exact keys the Karl fold splits out
	     (src/lib/karl/reviewRecord.ts) -- anything else lands in the generic
	     section_edits bucket instead of edited_title/edited_summary. -->
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

	<!-- About us pages carry a link back to the department's main page under
	     the title, as on live sf.gov (`departments--department-public-health--
	     about`, 2026-11-26). Inert like the rest of the mockup chrome: a span,
	     because a link that goes nowhere is an axe failure. -->
	{#if page.type === 'About us'}
		<p class="about-back">
			<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="24" aria-hidden="true">
				<path
					d="M1.58578 12L10.2929 20.7071L11.7071 19.2929L5.4142 13L22 13V11L5.41423 11L11.7071 4.70712L10.2929 3.29291L1.58578 12Z"
				/>
			</svg>
			<span>Back to main page</span>
		</p>
	{/if}
{/snippet}

<div class="page-body" data-page-type={page.type}>
	{#if page.type === 'About us'}
		<!-- Live's agency template puts the title in a white card over the
		     department's banner photo, with its logo in the card (measured
		     2026-11-26 on `departments--department-public-health--about`). The
		     department supplies both images; the mockup has neither, so each is a
		     labelled placeholder of the size live gives it rather than an
		     invented picture. -->
		<div class="about-hero" aria-hidden="true">
			<span>Banner photo, supplied by the department</span>
		</div>
		<div class="about-card">
			<div class="about-logo" aria-hidden="true">Department logo</div>
			<div class="about-card-text">
				{@render pageHeader()}
			</div>
		</div>
	{:else}
		{@render pageHeader()}
	{/if}

	<WhatToKnow whatToKnow={page.whatToKnow} type={page.type} />

	<div class="page-content">
		{#if page.sections}
			{#each page.sections as section, index (section.fieldKey ?? index)}
				<Section {section} {index} />
			{/each}
		{/if}

		<!-- `partnerAgencies`, after the sections as on live. Inside `.page-content`
		     so it sits in the same 7/12 reading column live gives it. -->
		<LinkGrid
			heading="Partner agencies"
			items={page.partnerAgencies}
			fieldPrefix="partnerAgencies"
			label="Partner agency"
		/>
	</div>

	<!-- `contact`: full grid width on live, so outside `.page-content`. No page
	     carries both `contact` and a page-level `spotlight`, so their order has
	     no live reference. -->
	<ContactSection contact={page.contact} />

	<!-- Page-level `spotlight`, which one page carries. Not to be confused with
	     a SECTION whose `component` is 'spotlight' -- those are ordinary
	     heading/paragraph/button sections `Section.svelte` already renders. -->
	{#if page.spotlight}
		<SpotlightBlock spotlight={page.spotlight} />
	{/if}
</div>
