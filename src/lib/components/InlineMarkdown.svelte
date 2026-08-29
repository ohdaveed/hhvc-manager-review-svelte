<script lang="ts">
	import { parseInline } from '$lib/corpus/inlineMarkdown';

	/**
	 * Renders the corpus's inline markers as real elements.
	 *
	 * There is no `{@html}` here on purpose -- see `inlineMarkdown.ts`. Every
	 * token becomes a text node or a plain element, so a reviewer's edit or an
	 * AI rewrite cannot inject markup no matter what it contains.
	 *
	 * The `{#each}` below is deliberately written on ONE line. Svelte emits the
	 * whitespace between template tags as text nodes, so breaking this across
	 * lines inserts a space before every `<strong>` and turns
	 * `**Review time:** 2 days` into `Review time: ␣2 days`.
	 */
	let { text = '' }: { text?: unknown } = $props();

	const tokens = $derived(parseInline(text));
</script>

<!-- prettier-ignore -->
{#each tokens as token, i (i)}{#if token.kind === 'bold'}<strong>{token.text}</strong>{:else if token.kind === 'ref'}<span class="corpus-ref" data-ref-target={token.target}>{token.text}</span>{:else}{token.text}{/if}{/each}

<style>
	/* A cross-reference, not a link: the mockups are static and this tool has
	   nowhere to navigate to, so it reads as emphasis rather than announcing
	   itself as interactive. Underlined in SF.gov's link blue so a reviewer can
	   still see that the published page would link here. */
	.corpus-ref {
		color: #386ebf;
		text-decoration: underline;
		text-underline-position: from-font;
	}
</style>
