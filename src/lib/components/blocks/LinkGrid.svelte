<script lang="ts">
	import EditTarget from '../EditTarget.svelte';
	import KarlOrphanNotice from '../KarlOrphanNotice.svelte';
	import { pagesByKey } from '$lib/data';

	/**
	 * sf.gov's link list: "Partner agencies", "Departments" and "Related" all
	 * render this way. An h2, then links in columns split by 1px rules.
	 * Measured 2026-11-22 on `report-health-nuisance-or-hazards` (Partner
	 * agencies, 2 columns) and `information--health-access-point-hap`
	 * (Departments, 2; Related, 3, wrapping):
	 *
	 * - h2 to the first row: 20px (the h2's own margin).
	 * - Below sf.gov's `md` step the links stack, with 20px under each link and
	 *   no rules. From `md` up the grid has a 28px column gap. The first cell of
	 *   a row has 28px right padding and a 1px `#C9CACA` rule on its right.
	 *   Every other cell has 28px left padding, and in 3 columns the last cell
	 *   also has a rule on its left. So the text sits 28px from a rule on one
	 *   side and 56px from it on the other. That asymmetry is live's, and it is
	 *   kept.
	 * - Links: Flex 400 16/24, `#2A60AF`, underlined. That is the button blue,
	 *   not the `#1B519E` body-link blue.
	 *
	 * Inert, like the rest of the mockup furniture. A title is an `EditTarget`
	 * styled as a link, never an `<a href>`: a dead anchor fails axe, and
	 * the tool has nowhere to navigate to. Field ids are `${fieldPrefix}.${i}.title`
	 * (and `.text` / `.url`), which is the shape `extractCopy` emits for both
	 * `partnerAgencies` and `sections.<key>.cards`.
	 *
	 * Live shows only the title. `text` and `url` are copy too, and a reviewer
	 * has to see them to review them, so they render under the title in a
	 * smaller, muted face. No related card in the corpus carries either today;
	 * every partner agency carries a `url`.
	 */
	let {
		items,
		fieldPrefix,
		label,
		columns = 2,
		heading = undefined,
		checkRelated = false
	}: {
		items: { title?: string; text?: string; url?: string; target?: string }[] | undefined;
		fieldPrefix: string;
		label: string;
		columns?: 2 | 3;
		/** A fixed label such as "Partner agencies". Omit it when the caller
		 *  already renders an (editable) heading, as a Related section does. */
		heading?: string;
		/** A Related section: flag cards whose target page type Karl's Related
		 *  cannot hold. Targets outside the corpus have no known type and are
		 *  skipped, as the Analysis check skips them. */
		checkRelated?: boolean;
	} = $props();

	const targetType = (target: string | undefined) =>
		target ? (pagesByKey as Record<string, { type?: string }>)[target]?.type : undefined;
</script>

{#if items && items.length > 0}
	<section class="link-grid">
		{#if heading}
			<h2 class="link-grid-heading">{heading}</h2>
		{/if}
		<!-- Above the grid at full width, naming the card: inside a 3-column cell
		     the notice wrapped to ten lines at the desktop preset. -->
		{#if checkRelated}
			{#each items as item, i (i)}
				<KarlOrphanNotice
					component="related"
					pageType={targetType(item.target)}
					subject={item.title}
				/>
			{/each}
		{/if}
		<div class="link-grid-list cols-{columns}" class:headed={heading}>
			{#each items as item, i (i)}
				<div class="link-grid-cell">
					{#if item.title}
						<EditTarget
							as="div"
							class="link-grid-title"
							fieldId={`${fieldPrefix}.${i}.title`}
							name={`${label} [${i + 1}] Title`}
							value={item.title}
						/>
					{/if}
					{#if item.text}
						<EditTarget
							as="div"
							class="link-grid-note"
							fieldId={`${fieldPrefix}.${i}.text`}
							name={`${label} [${i + 1}] Text`}
							value={item.text}
						/>
					{/if}
					{#if item.url}
						<EditTarget
							as="div"
							class="link-grid-note link-grid-url"
							fieldId={`${fieldPrefix}.${i}.url`}
							name={`${label} [${i + 1}] Link`}
							value={item.url}
						/>
					{/if}
				</div>
			{/each}
		</div>
	</section>
{/if}

<style>
	/* `#mockPage h2` sets a 12px margin with an ID selector, so the measured
	   20px needs the same specificity. */
	:global(#mockPage) .link-grid-heading {
		margin-bottom: 20px;
	}

	.link-grid-list {
		display: flex;
		flex-direction: column;
	}
	/* Under a caller's own h2 (a Related section) the heading keeps its 12px, so
	   8px more makes the measured 20px. Padding, because a margin would
	   collapse into the h2's and add nothing. */
	.link-grid-list:not(.headed) {
		padding-top: 8px;
	}

	.link-grid-cell {
		padding-bottom: 20px;
	}

	:global(#mockPage) .link-grid :global(.link-grid-title),
	:global(#mockPage) .link-grid :global(.link-grid-title .edit-target) {
		color: var(--color-site-action-fill);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.link-grid :global(.link-grid-note) {
		margin-top: 4px;
		color: var(--color-site-ink-secondary);
		font-size: 0.875rem;
		line-height: 1.25rem;
		overflow-wrap: anywhere;
	}

	/* sf.gov's `md` step is a 768px viewport, where its grid is 712px. 700px is
	   the threshold app.css already uses for that step on the callout: it puts
	   the Tablet preset (~712px) on the column side and Phone on the stacked
	   side, as on live. */
	@container mockup (min-width: 700px) {
		.link-grid-list {
			display: grid;
			column-gap: 28px;
		}
		.cols-2 {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.cols-3 {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
		.cols-2 .link-grid-cell:nth-child(2n + 1),
		.cols-3 .link-grid-cell:nth-child(3n + 1) {
			padding-right: 28px;
			border-right: 1px solid var(--color-site-border);
		}
		.cols-2 .link-grid-cell:not(:nth-child(2n + 1)),
		.cols-3 .link-grid-cell:not(:nth-child(3n + 1)) {
			padding-left: 28px;
		}
		.cols-3 .link-grid-cell:nth-child(3n) {
			border-left: 1px solid var(--color-site-border);
		}
		.link-grid-cell:only-child {
			border-right: 0;
		}
	}
</style>
