<script lang="ts">
	import KarlChip from './KarlChip.svelte';
	import { outlineContext } from '$lib/karl/outlineContext';
	import EditTarget from './EditTarget.svelte';

	/**
	 * The grey "What to know" box: Cost, then Things to know, as one unit.
	 * Things to know is not a section in its own right -- it lives inside this
	 * box beside Cost.
	 *
	 * Drawn to the live sf.gov box, measured 2026-11-22 on
	 * `get-help-vermin-your-building`: #EFF0F0 fill, 8px radius, 28px padding
	 * and gap, an info glyph beside an h2 reading just "What to know" (Karl's
	 * grouping is "What to know before you start"; the site prints the short
	 * form), and each entry's label as its own Slab h3. The site prints no
	 * "Things to know" heading, so neither does this.
	 *
	 * Field ids come straight from `extractCopy` (`$lib/corpus/fields.ts`):
	 * `whatToKnow.cost`, `whatToKnow.thingsToKnow.{i}.label`/`.text` for the
	 * `{ label, text }` form, and the bare `whatToKnow.thingsToKnow.{i}` for a
	 * plain-string entry. No `unverified` wrapper appears anywhere in
	 * `whatToKnow` across the corpus, unlike `sections.*.paragraphs`/`bullets`,
	 * so entries are read directly rather than through the
	 * paragraph/bullet-style text-or-wrapper unwrapper.
	 *
	 * All 16 pages that carry `whatToKnow` are `type: 'Transaction'`, the only
	 * type with a Karl field backing this box; `whatToKnowOwner.test.ts` keeps it
	 * that way (U23). A non-Transaction page carrying it would render the amber
	 * orphan notice from the same design source (`orphanShown` at prototype line
	 * ~2015: shown whenever `type !== 'Transaction'`).
	 */
	let {
		whatToKnow,
		type
	}: {
		whatToKnow?: {
			cost?: string;
			thingsToKnow?: Array<string | { label?: string; text?: string }>;
		};
		type?: string;
	} = $props();

	// The Karl outline: the box holds two panels (Cost, Things to know), so it is
	// chipped once as a block rather than per string.
	const outline = outlineContext();
	const karl = $derived(outline?.placements?.whatToKnow ?? undefined);
</script>

{#if whatToKnow}
	<div
		class="what-to-know"
		data-karl-section={karl ? (karl.rawName ?? 'unplaced') : undefined}
		data-karl-status={karl?.status}
	>
		{#if karl}
			<KarlChip as="p" status={karl.status} label={karl.label} reasons={karl.reasons} />
		{/if}
		{#if type !== 'Transaction'}
			<div class="what-to-know-orphan">
				<span class="what-to-know-orphan-icon" aria-hidden="true">!</span>
				<span class="what-to-know-orphan-text">
					No Karl field on an Information page. Cost and Things to Know are Transaction fields —
					this copy stays in the mockup and cannot be rebuilt.
				</span>
			</div>
		{/if}

		<div class="what-to-know-heading">
			<!-- sf.gov's own info glyph, copied from the live markup. -->
			<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="what-to-know-icon">
				<path
					d="M11 7C11 6.44772 11.4477 6 12 6C12.5523 6 13 6.44772 13 7C13 7.55228 12.5523 8 12 8C11.4477 8 11 7.55228 11 7Z"
				/>
				<path d="M11 10L11 18H13L13 10H11Z" />
				<path
					fill-rule="evenodd"
					clip-rule="evenodd"
					d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20Z"
				/>
			</svg>
			<h2 class="what-to-know-title">What to know</h2>
		</div>

		{#if whatToKnow.cost}
			<section>
				<h3>Cost</h3>
				<EditTarget name="Cost" fieldId="whatToKnow.cost" value={whatToKnow.cost} />
			</section>
		{/if}

		{#if whatToKnow.thingsToKnow && whatToKnow.thingsToKnow.length > 0}
			{#each whatToKnow.thingsToKnow as entry, i (i)}
				<section>
					{#if typeof entry === 'string'}
						<EditTarget
							name={`Things to Know [${i + 1}]`}
							fieldId={`whatToKnow.thingsToKnow.${i}`}
							value={entry}
						/>
					{:else}
						{#if entry.label}
							<EditTarget
								as="h3"
								name={`Things to Know [${i + 1}] Label`}
								fieldId={`whatToKnow.thingsToKnow.${i}.label`}
								value={entry.label}
							/>
						{/if}
						{#if entry.text}
							<EditTarget
								name={`Things to Know [${i + 1}] Text`}
								fieldId={`whatToKnow.thingsToKnow.${i}.text`}
								value={entry.text}
							/>
						{/if}
					{/if}
				</section>
			{/each}
		{/if}
	</div>
{/if}

<style>
	.what-to-know {
		display: flex;
		flex-direction: column;
		gap: 28px;
		margin: 0 0 40px;
		padding: 28px;
		border-radius: 8px;
		background: #eff0f0;
	}

	/* Paragraph margins inside a section would stack on top of the 28px gap. */
	.what-to-know section > :global(:last-child) {
		margin-bottom: 0;
	}

	.what-to-know-heading {
		display: flex;
		gap: 8px;
	}

	.what-to-know-icon {
		flex: none;
		width: 24px;
		height: 24px;
		margin-top: 6px;
	}

	/* `#mockPage h2` sets the live h2 ladder (Slab 500, 28/36 -> 40/52), which is
	   exactly what sf.gov uses here, so only the margin is overridden. */
	:global(#mockPage) .what-to-know-title {
		margin: 0;
	}

	/* `#mockPage h3` is the body-face h3; this box's h3s are Slab, as on the
	   site. The ID selector is what outranks it. */
	:global(#mockPage) .what-to-know :global(h3) {
		margin: 0 0 12px;
		font-family: var(--site-font-display);
		font-size: 1.25rem;
		font-weight: 500;
		line-height: 1.75rem;
	}

	@container mockup (min-width: 800px) {
		.what-to-know-icon {
			width: 40px;
			height: 40px;
		}
		:global(#mockPage) .what-to-know :global(h3) {
			font-size: 1.5rem;
			line-height: 2rem;
		}
	}

	.what-to-know-orphan {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		margin: -4px 0 14px;
		padding: 8px 10px;
		border-left: 3px solid #f2c94c;
		border-radius: 0 4px 4px 0;
		background: #fff7e6;
	}

	.what-to-know-orphan-icon {
		flex: none;
		font-size: 12px;
		font-weight: 700;
		color: #6f4a00;
	}

	.what-to-know-orphan-text {
		font-size: 12px;
		line-height: 17px;
		color: #6f4a00;
	}
</style>
