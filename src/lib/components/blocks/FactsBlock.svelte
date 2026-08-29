<script>
	import EditTarget from '../EditTarget.svelte';

	/**
	 * `section.facts`: a boxed "Top facts" panel (label + detail pairs). Only
	 * 2 sections carry this key, but both render nothing today.
	 *
	 * Unlike a paragraph/bullet entry, a fact's `text` is always a plain
	 * string -- `unverified`/`unverifiedReason` sit as siblings on the fact
	 * object itself (`fields.ts`'s `Fact` type), not wrapped around `text` the
	 * way `entryText`/`entryUnverified` unwrap a paragraph entry.
	 */
	let { facts, sectionKey, label } = $props();
</script>

<dl class="facts-block">
	{#each facts as fact, i (i)}
		<div class="facts-block-item">
			{#if fact.label}
				<EditTarget
					as="dt"
					class="facts-block-label"
					fieldId={`sections.${sectionKey}.facts.${i}.label`}
					name={`${label} Fact [${i + 1}] Label`}
					value={fact.label}
				/>
			{/if}
			{#if fact.text}
				<EditTarget
					as="dd"
					fieldId={`sections.${sectionKey}.facts.${i}.text`}
					name={`${label} Fact [${i + 1}] Text`}
					value={fact.text}
					unverified={fact.unverified === true}
				/>
			{/if}
		</div>
	{/each}
</dl>

<style>
	.facts-block {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 20px;
		margin: 16px 0;
	}

	.facts-block-item {
		background: #f6f6f6;
		border-radius: 4px;
		padding: 4px 18px 18px;
	}

	:global(.facts-block-label) {
		font-family: var(--font-display);
		font-weight: 700;
	}
</style>
