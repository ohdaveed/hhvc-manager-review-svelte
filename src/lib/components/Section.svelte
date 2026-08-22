<script lang="ts">
	import EditTarget from './EditTarget.svelte';

	let { section, index } = $props();

	// Assigned once from the pristine corpus in pageData.svelte.ts, so editing a
	// heading cannot renumber its own section's edits. The fallback covers a
	// section constructed outside the store, e.g. in a test fixture.
	const key = $derived(section.fieldKey ?? `section-${index}`);

	// Display only, and deliberately still positional: it is what a reviewer
	// reads in the ActionBar ("Section [2] Paragraph"), never what identifies a
	// field. `fieldId` below is the identity.
	const label = $derived(`Section [${index + 1}]`);
</script>

<div class="page-section {section.kind || 'body'}">
	{#if section.heading}
		<EditTarget
			as="h2"
			class="section-heading"
			id={section.heading.toLowerCase().replace(/\s+/g, '-')}
			name={`${label} Heading`}
			fieldId={`sections.${key}.heading`}
			value={section.heading}
			update={(v) => (section.heading = v)}
		/>
	{/if}

	{#if section.paragraphs}
		{#each section.paragraphs as p, i (i)}
			<EditTarget
				name={`${label} Paragraph`}
				fieldId={`sections.${key}.paragraphs.${i}`}
				value={p}
				update={(v) => (section.paragraphs[i] = v)}
			/>
		{/each}
	{/if}

	{#if section.bullets}
		{@render bulletsSnippet(section.bullets)}
	{/if}

	{#if section.callout}
		{@render calloutSnippet(section.callout)}
	{/if}
</div>

{#snippet bulletsSnippet(bullets)}
	<ul class="list-disc pl-5">
		{#each bullets as b, i (i)}
			<EditTarget
				as="li"
				class="my-1"
				name={`${label} Bullet`}
				fieldId={`sections.${key}.bullets.${i}`}
				value={b}
				update={(v) => (bullets[i] = v)}
			/>
		{/each}
	</ul>
{/snippet}

{#snippet calloutSnippet(callout)}
	<div class="callout my-4 border-l-4 border-blue-600 bg-blue-50 p-4">
		{#if callout.title}
			<EditTarget
				as="h3"
				class="mb-2 text-lg font-bold"
				name="Callout Title"
				fieldId={`sections.${key}.callout.title`}
				value={callout.title}
				update={(v) => (callout.title = v)}
			/>
		{/if}
		<EditTarget
			name="Callout Text"
			fieldId={`sections.${key}.callout.text`}
			value={callout.text}
			update={(v) => (callout.text = v)}
		/>
	</div>
{/snippet}
