<script lang="ts">
	import EditTarget from './EditTarget.svelte';
	import ButtonBlock from './blocks/ButtonBlock.svelte';
	import CardsBlock from './blocks/CardsBlock.svelte';
	import FactsBlock from './blocks/FactsBlock.svelte';
	import StepsBlock from './blocks/StepsBlock.svelte';
	import TableBlock from './blocks/TableBlock.svelte';
	import { entryText, entryUnverified } from '$lib/corpus/fieldResolver';
	import { pageStore } from '$lib/stores/pageData.svelte';
	import { sessionStore } from '$lib/stores/session.svelte';

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

	// Undefined while the session check is in flight: treat as editable, so the
	// control does not flicker out and back for a signed-in reviewer. Same rule
	// `EditTarget` follows.
	const editable = $derived(!sessionStore.knownSignedOut);
	const sectionSelected = $derived(pageStore.selectedSectionKey === key);
</script>

<div class="page-section {section.kind || 'body'}" data-component={section.component}>
	{#if editable}
		<div class="page-section-chrome">
			<button
				type="button"
				class="rethink-section"
				data-rethink-section={key}
				aria-label={`Rethink ${section.heading || label}`}
				aria-pressed={sectionSelected}
				onclick={(event) => {
					event.stopPropagation();
					pageStore.selectSection(key);
				}}
			>
				Rethink section
			</button>
		</div>
	{/if}

	{#if section.heading}
		<EditTarget
			as="h2"
			class="section-heading"
			id={section.heading.toLowerCase().replace(/\s+/g, '-')}
			name={`${label} Heading`}
			fieldId={`sections.${key}.heading`}
			value={section.heading}
		/>
	{/if}

	{#if section.paragraphs}
		{#each section.paragraphs as p, i (i)}
			<EditTarget
				name={`${label} Paragraph`}
				fieldId={`sections.${key}.paragraphs.${i}`}
				value={entryText(p)}
				unverified={entryUnverified(p)}
			/>
		{/each}
	{/if}

	{#if section.bullets}
		{@render bulletsSnippet(section.bullets)}
	{/if}

	{#if section.callout}
		{@render calloutSnippet(section.callout)}
	{/if}

	<!-- Every block below keys its edits on `key` (the section's heading-derived
	     fieldKey), never on the array index, so reordering a section does not
	     orphan its saved edits. The field ids these produce are the ones
	     `extractCopy` already emits and `corpus.lock` already hashes. -->
	{#if section.steps}
		<StepsBlock steps={section.steps} sectionKey={key} {label} />
	{/if}

	{#if section.cards}
		<CardsBlock cards={section.cards} sectionKey={key} {label} />
	{/if}

	{#if section.facts}
		<FactsBlock facts={section.facts} sectionKey={key} {label} />
	{/if}

	{#if section.table}
		<TableBlock table={section.table} sectionKey={key} {label} />
	{/if}

	{#if section.button}
		<ButtonBlock
			text={section.button}
			url={section.buttonUrl}
			fieldId={`sections.${key}.button`}
			urlFieldId={`sections.${key}.buttonUrl`}
			name={`${label} Button`}
		/>
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
			/>
		{/if}
		<EditTarget name="Callout Text" fieldId={`sections.${key}.callout.text`} value={callout.text} />
	</div>
{/snippet}

<style>
	.page-section-chrome {
		display: flex;
		justify-content: flex-end;
	}

	.rethink-section {
		font-size: 12px;
		line-height: 1;
		padding: 4px 8px;
		border: 1px solid currentColor;
		border-radius: 3px;
		background: transparent;
		cursor: pointer;
	}
</style>
