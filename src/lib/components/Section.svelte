<script lang="ts">
	import EditTarget from './EditTarget.svelte';
	import ButtonBlock from './blocks/ButtonBlock.svelte';
	import CalloutBlock from './blocks/CalloutBlock.svelte';
	import CardsBlock from './blocks/CardsBlock.svelte';
	import FactsBlock from './blocks/FactsBlock.svelte';
	import ImageBlock from './blocks/ImageBlock.svelte';
	import LinkGrid from './blocks/LinkGrid.svelte';
	import StepsBlock from './blocks/StepsBlock.svelte';
	import TableBlock from './blocks/TableBlock.svelte';
	import KarlChip from './KarlChip.svelte';
	import { outlineContext } from '$lib/karl/outlineContext';
	import { RELATED_HEADING } from '$lib/karl/placement';
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

	// The Karl outline: where this section lands, read out before its heading so
	// it is part of the reading order without renaming the heading.
	const outline = outlineContext();
	const karl = $derived(outline?.placements?.sections.get(key));
</script>

<div
	class="page-section {section.kind || 'body'}"
	data-component={section.component}
	data-karl-section={karl ? (karl.rawName ?? 'unplaced') : undefined}
	data-karl-status={karl?.status}
>
	{#if karl}
		<KarlChip as="p" status={karl.status} label={karl.label} reasons={karl.reasons} />
	{/if}
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

	<!-- Everything under the heading, as one box: the `supporting` accordion paints
	     its open panel on it (app.css). Other sections give it no style. -->
	<div class="page-section-body">
		<!-- A Spotlight image goes above the text: Karl's "Full width" alignment,
		     which puts the text under the image. Anywhere else the image is its own
		     Information-section Image block after the Title and text block, so it
		     renders after the copy (see the end of this box). -->
		{#if section.image && section.component === 'spotlight'}
			<ImageBlock image={section.image} />
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

		<!-- Related renders as sf.gov's 3-column link list, not cards. Same
		     `sections.<key>.cards.<i>.*` ids and `Card [n]` names as CardsBlock.
		     A section is Related by its tag OR its heading -- the heading rule is
		     the one Karl placement uses (`RELATED_HEADING`), and 27 of the 34
		     "Related pages" sections carry no `component: 'related'` tag, so
		     keying on the tag alone drew them as stacked cards. The orphan check
		     stays on the tag: on some page types placement puts an untagged
		     Related section in another panel, and flagging it here would
		     contradict the Analysis panel (`karlComponentChecks`). -->
		{#if section.cards && (section.component === 'related' || RELATED_HEADING.test(section.heading ?? ''))}
			<LinkGrid
				items={section.cards}
				fieldPrefix={`sections.${key}.cards`}
				label={`${label} Card`}
				columns={3}
				checkRelated={section.component === 'related'}
			/>
		{:else if section.cards}
			<CardsBlock cards={section.cards} sectionKey={key} {label} />
		{/if}

		{#if section.facts}
			<FactsBlock facts={section.facts} sectionKey={key} {label} />
		{/if}

		<!-- `caption` is the section heading, not a new corpus field. The heading
		     already names the table for a sighted reader as the <h2> above it, so
		     reusing it gives the <table> a real <caption> and the scroll region a
		     meaningful accessible name without inventing a second string a
		     reviewer would have to keep in sync with the first. -->
		{#if section.table}
			<TableBlock table={section.table} caption={section.heading} sectionKey={key} {label} />
		{/if}

		{#if section.button}
			<ButtonBlock
				text={section.button}
				url={section.buttonUrl}
				fieldId={`sections.${key}.button`}
				urlFieldId={`sections.${key}.buttonUrl`}
				name={`${label} Button`}
				variant={section.buttonStyle}
			/>
		{/if}

		{#if section.image && section.component !== 'spotlight'}
			<ImageBlock image={section.image} />
		{/if}
	</div>
</div>

{#snippet bulletsSnippet(bullets: unknown[])}
	<!-- `list-style-position: outside` is the default and must stay: the badge on
	     a selected bullet is absolutely positioned, and `inside` pulls the marker
	     into the tinted highlight box with it.
	     `ordered` is for a sequence that goes into Karl as a numbered list in
	     rich text (afterReport's "How a report moves through the City"): the
	     mockup has to show the numbers Karl will, or the manager reviews a
	     bulleted list that is not what gets built. Field ids stay `bullets.N`. -->
	<svelte:element
		this={section.ordered ? 'ol' : 'ul'}
		class={section.ordered ? 'list-decimal pl-5' : 'list-disc pl-5'}
	>
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
	</svelte:element>
{/snippet}

{#snippet calloutSnippet(callout: { title?: string; text: string })}
	<CalloutBlock
		title={callout.title}
		text={callout.text}
		titleFieldId={`sections.${key}.callout.title`}
		textFieldId={`sections.${key}.callout.text`}
		titleName="Callout Title"
		textName="Callout Text"
	/>
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
