<script lang="ts">
	import EditTarget from './EditTarget.svelte';
	import { entryText, entryUnverified, setEntry } from '$lib/corpus/fieldResolver';

	let { section, index } = $props();

	/**
	 * Ten paragraph/bullet entries across the corpus are
	 * `{text, unverified, unverifiedReason}` rather than plain strings — copy
	 * with no tier-1 source, flagged for HHVC to confirm before publication.
	 *
	 * They were passed straight to `EditTarget`, so seven pages of a
	 * copy-review tool rendered the literal string `[object Object]` where
	 * SF.gov copy belongs. `extractCopy` in `$lib/corpus/fields` already
	 * unwrapped them for hashing; the renderer never did, which is why the
	 * corpus hash was right while the page a reviewer read was wrong.
	 *
	 * Writes go back through the same helper pair in `$lib/corpus/fieldResolver`
	 * so the panel and the page cannot disagree about what a field says.
	 */

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
				value={entryText(p)}
				unverified={entryUnverified(p)}
				update={(v) => setEntry(section.paragraphs, i, v)}
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
	<!-- `list-style-position: outside` is the default and must stay: the badge on
	     a selected bullet is absolutely positioned, and `inside` pulls the marker
	     into the tinted highlight box with it. -->
	<ul class="list-disc pl-5">
		{#each bullets as b, i (i)}
			<EditTarget
				as="li"
				class="my-1"
				name={`${label} Bullet`}
				fieldId={`sections.${key}.bullets.${i}`}
				value={entryText(b)}
				unverified={entryUnverified(b)}
				update={(v) => setEntry(bullets, i, v)}
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
