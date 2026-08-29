<script lang="ts">
	import EditTarget from './EditTarget.svelte';

	/**
	 * The grey "What to know before you start" box: Cost, then Things to know,
	 * as one unit (design prototype's own `legacyShown` wrapper,
	 * prototype.dc.html:367-392). Things to know is not a section in its own
	 * right -- it lives inside this box beside Cost.
	 *
	 * Field ids come straight from `extractCopy` (`$lib/corpus/fields.ts`):
	 * `whatToKnow.cost`, `whatToKnow.thingsToKnow.{i}.label`/`.text` for the
	 * `{ label, text }` form, and the bare `whatToKnow.thingsToKnow.{i}` for a
	 * plain-string entry. No `unverified` wrapper appears anywhere in
	 * `whatToKnow` across the corpus, unlike `sections.*.paragraphs`/`bullets`,
	 * so entries are read directly rather than through the
	 * paragraph/bullet-style text-or-wrapper unwrapper.
	 *
	 * 14 of the 15 pages that carry `whatToKnow` are `type: 'Transaction'`; one
	 * (`article-11-compliance-for-property-owners`) is `'Information'` and has
	 * no Karl field backing this box at all, so it renders the amber orphan
	 * notice from the same design source (`orphanShown` at prototype line
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
</script>

{#if whatToKnow}
	<div class="what-to-know">
		{#if type !== 'Transaction'}
			<div class="what-to-know-orphan">
				<span class="what-to-know-orphan-icon" aria-hidden="true">!</span>
				<span class="what-to-know-orphan-text">
					No Karl field on an Information page. Cost and Things to Know are Transaction fields —
					this copy stays in the mockup and cannot be rebuilt.
				</span>
			</div>
		{/if}

		<h2 class="what-to-know-title">What to know before you start</h2>

		{#if whatToKnow.cost}
			<div class="what-to-know-cost">
				<h3 class="what-to-know-h3">Cost</h3>
				<EditTarget name="Cost" fieldId="whatToKnow.cost" value={whatToKnow.cost} />
			</div>
		{/if}

		{#if whatToKnow.thingsToKnow && whatToKnow.thingsToKnow.length > 0}
			<div class="what-to-know-things">
				<h3 class="what-to-know-h3">Things to know</h3>
				<div class="what-to-know-things-list">
					{#each whatToKnow.thingsToKnow as entry, i (i)}
						{#if typeof entry === 'string'}
							<EditTarget
								name={`Things to Know [${i + 1}]`}
								fieldId={`whatToKnow.thingsToKnow.${i}`}
								value={entry}
							/>
						{:else}
							{#if entry.label}
								<EditTarget
									as="h4"
									class="what-to-know-item-label"
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
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.what-to-know {
		margin: 0 0 28px;
		padding: 20px 22px;
		border-radius: 4px;
		background: #f0f0f0;
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

	.what-to-know-title {
		margin: 0 0 14px;
		font-family: var(--sfds-font-slab);
		font-size: 28px;
		line-height: 32px;
		font-weight: 700;
		letter-spacing: -1px;
	}

	.what-to-know-h3 {
		margin: 0 0 4px;
		font-size: 15px;
		font-weight: 700;
	}

	.what-to-know-cost {
		margin-bottom: 16px;
	}

	.what-to-know-things :global(.what-to-know-item-label) {
		margin-top: 16px;
	}

	.what-to-know-things-list :global(> *:first-child) {
		margin-top: 0;
	}
</style>
