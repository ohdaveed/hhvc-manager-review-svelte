<script>
	import EditTarget from '../EditTarget.svelte';

	/**
	 * `section.cards`: a grid of link-style items. 54 sections carry this key
	 * and none of them render today.
	 *
	 * A card's `target` (an internal routing id -- which other mockup page it
	 * points at) and `url` (a real destination) are two different shapes of
	 * the same "cards" key; only `url` is reader-visible copy (`extractCopy`
	 * reads it, not `target`), so a card with no `url` shows title/text only.
	 * Titles never render as `<a href>` -- there is nothing in this tool for
	 * them to navigate to, and every reviewable string here already gets a
	 * click-to-select affordance via `EditTarget`, which is the tool's real
	 * interaction, not page navigation.
	 */
	let { cards, sectionKey, label } = $props();
</script>

<ul class="cards-block">
	{#each cards as card, i (i)}
		<li class="cards-block-item">
			{#if card.title}
				<EditTarget
					as="h3"
					class="cards-block-title"
					fieldId={`sections.${sectionKey}.cards.${i}.title`}
					name={`${label} Card [${i + 1}] Title`}
					value={card.title}
				/>
			{/if}
			{#if card.text}
				<EditTarget
					as="p"
					fieldId={`sections.${sectionKey}.cards.${i}.text`}
					name={`${label} Card [${i + 1}] Text`}
					value={card.text}
				/>
			{/if}
			{#if card.url}
				<EditTarget
					as="p"
					class="cards-block-url"
					fieldId={`sections.${sectionKey}.cards.${i}.url`}
					name={`${label} Card [${i + 1}] Link`}
					value={card.url}
				/>
			{/if}
		</li>
	{/each}
</ul>

<style>
	.cards-block {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 16px;
		margin: 16px 0;
		padding: 0;
		list-style: none;
	}

	.cards-block-item {
		border: 1px solid #e2e2e2;
		border-radius: 4px;
		padding: 4px 14px 14px;
	}

	:global(.cards-block-title) {
		font-family: var(--font-display);
		font-weight: 700;
	}

	:global(.cards-block-url) {
		font-size: 13px;
		color: var(--text-secondary, #1d4d70);
		word-break: break-all;
	}
</style>
