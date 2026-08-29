<script>
	import EditTarget from '../EditTarget.svelte';
	import ButtonBlock from './ButtonBlock.svelte';
	import { entryText, entryUnverified } from '$lib/corpus/fieldResolver';

	/**
	 * `section.steps`: a numbered "what to do" sequence. 12 sections carry
	 * this key. Each step can carry its own text paragraphs, bullets, a
	 * callout, and a button -- the same wrapped-entry shape paragraphs/bullets
	 * use elsewhere, so `entryText`/`entryUnverified` do the unwrapping here
	 * too rather than a second copy of that logic.
	 *
	 * A step's `callout.title` is sometimes the literal boolean `false`
	 * (see respond-to-notice-of-violation.ts), not a string or an absent key
	 * -- `extractCopy` only ever sets a field for an actual string, so this
	 * only renders a Callout Title EditTarget when it truly is one.
	 */
	let { steps, sectionKey, label } = $props();
</script>

<ol class="steps-block">
	{#each steps as step, i (i)}
		<li class="steps-block-item">
			{#if step.title}
				<EditTarget
					as="h3"
					class="steps-block-title"
					fieldId={`sections.${sectionKey}.steps.${i}.title`}
					name={`${label} Step [${i + 1}] Title`}
					value={step.title}
				/>
			{/if}

			{#if step.text}
				{#each step.text as entry, j (j)}
					<EditTarget
						as="p"
						fieldId={`sections.${sectionKey}.steps.${i}.text.${j}`}
						name={`${label} Step [${i + 1}] Text [${j + 1}]`}
						value={entryText(entry)}
						unverified={entryUnverified(entry)}
					/>
				{/each}
			{/if}

			{#if step.bullets}
				<ul class="list-disc pl-5">
					{#each step.bullets as entry, j (j)}
						<EditTarget
							as="li"
							class="my-1"
							fieldId={`sections.${sectionKey}.steps.${i}.bullets.${j}`}
							name={`${label} Step [${i + 1}] Bullet [${j + 1}]`}
							value={entryText(entry)}
							unverified={entryUnverified(entry)}
						/>
					{/each}
				</ul>
			{/if}

			{#if step.callout}
				<div class="steps-block-callout">
					{#if typeof step.callout.title === 'string' && step.callout.title}
						<EditTarget
							as="h4"
							class="steps-block-callout-title"
							fieldId={`sections.${sectionKey}.steps.${i}.callout.title`}
							name={`${label} Step [${i + 1}] Callout Title`}
							value={step.callout.title}
						/>
					{/if}
					{#if step.callout.text}
						<EditTarget
							as="p"
							fieldId={`sections.${sectionKey}.steps.${i}.callout.text`}
							name={`${label} Step [${i + 1}] Callout Text`}
							value={step.callout.text}
						/>
					{/if}
				</div>
			{/if}

			{#if step.button}
				<ButtonBlock
					text={step.button}
					url={step.buttonUrl}
					fieldId={`sections.${sectionKey}.steps.${i}.button`}
					urlFieldId={`sections.${sectionKey}.steps.${i}.buttonUrl`}
					name={`${label} Step [${i + 1}] Button`}
				/>
			{/if}
		</li>
	{/each}
</ol>

<style>
	.steps-block {
		display: flex;
		flex-direction: column;
		gap: 24px;
		margin: 16px 0;
		padding-left: 1.4em;
	}

	.steps-block-item::marker {
		font-weight: 700;
	}

	:global(.steps-block-title) {
		font-family: var(--font-display);
		font-weight: 700;
	}

	.steps-block-callout {
		border-left: 4px solid var(--color-sfds-action, #495ed4);
		background: var(--color-sfds-blue-l1, #edf4f7);
		padding: 12px 16px;
		margin: 8px 0;
	}

	:global(.steps-block-callout-title) {
		font-weight: 700;
	}
</style>
