<script lang="ts">
	import { resolve } from '$app/paths';
	import { tokenizeMarkdown } from '$lib/corpus/markdown';
	import { resolveLinkTarget } from '$lib/corpus/links';

	/**
	 * One corpus string, rendered as the reader sees it.
	 *
	 * The corpus writes `**bold**` and `[label](target)` inside plain strings and
	 * nothing between the data module and the DOM used to interpret them, so a
	 * copy-review tool showed reviewers `**Review time:**` and a raw
	 * `[Pest prevention](https://…)` where formatting belongs.
	 *
	 * Rendered from TOKENS, never `{@html}`. Corpus copy is not HTML-safe by
	 * construction — it is prose someone typed — so a markdown-to-HTML pass would
	 * need an escaping story, and an escaping story is a thing to get wrong. A
	 * token list rendered through ordinary Svelte markup cannot inject markup at
	 * all, because no string is ever parsed as HTML.
	 *
	 * `value` is untouched: it stays the raw markdown `EditTarget` hands to the
	 * panel, that `fieldResolver` writes through, and that lands in
	 * `edits.new_content`. This component only decides how it LOOKS.
	 */
	let {
		value,
		interactive = true
	}: {
		value: string;
		/**
		 * Whether links may render as real anchors.
		 *
		 * False when this text sits inside `EditTarget`'s selection `<button>`.
		 * An `<a>` inside a `<button>` is invalid HTML and gives a screen reader
		 * two nested controls with no way to say which one a click means — and the
		 * button is the one that matters here, since selecting copy to rewrite is
		 * the whole interaction. Links still look like links and still name their
		 * destination in the tooltip; they just do not navigate. That is also how
		 * a CMS behaves while you have a field open for editing.
		 */
		interactive?: boolean;
	} = $props();

	/**
	 * A token with its destination already resolved.
	 *
	 * Resolved here rather than in the template so the markup can stay on tight
	 * single lines: any newline between two inline constructs renders as a space,
	 * which would insert one into the middle of a sentence that already has its
	 * own spacing.
	 */
	type Part =
		| { kind: 'text'; text: string }
		| { kind: 'strong'; text: string }
		| { kind: 'anchor'; text: string; href: string; external: boolean; title: string }
		| { kind: 'plain-link'; text: string; title: string; unset: boolean };

	const parts = $derived.by((): Part[] =>
		tokenizeMarkdown(value ?? '').map((token): Part => {
			if (token.kind !== 'link') return token;

			const destination = resolveLinkTarget(token.target);
			if (destination.kind === 'external') {
				return interactive
					? {
							kind: 'anchor',
							text: token.text,
							href: destination.href,
							external: true,
							title: destination.href
						}
					: { kind: 'plain-link', text: token.text, title: destination.href, unset: false };
			}
			if (destination.kind === 'internal') {
				return interactive
					? {
							kind: 'anchor',
							text: token.text,
							href: resolve('/review/[slug]', { slug: destination.slug }),
							external: false,
							title: destination.title
						}
					: { kind: 'plain-link', text: token.text, title: destination.title, unset: false };
			}
			// `#` is a deliberate sentinel for "a link belongs here, the destination
			// is not decided" — not a broken link, and not something to render as an
			// error. It gets the dotted treatment so a reviewer can see the gap.
			return {
				kind: 'plain-link',
				text: token.text,
				title:
					destination.kind === 'inert'
						? 'This link has no destination yet'
						: `Unresolved link target: ${destination.target}`,
				unset: true
			};
		})
	);
</script>

<!-- Both anchors below are legitimate and the rule cannot see it. The external
     one is an absolute `http(s)` address from the corpus, which `resolve()` — a
     route-id resolver for this app's own pages — has nothing to say about. The
     internal one IS resolved, in the script above, because the destination has
     to be computed alongside the slug; the rule only recognises a `resolve()`
     call written inline in the attribute. The markup is one line so that no
     newline lands between two inline constructs and renders as a stray space,
     which also puts both anchors out of reach of the next-line form. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<!-- prettier-ignore -->
{#each parts as part, i (i)}{#if part.kind === 'text'}{part.text}{:else if part.kind === 'strong'}<strong>{part.text}</strong>{:else if part.kind === 'anchor'}{#if part.external}<!-- eslint-disable-next-line svelte/no-navigation-without-resolve --><a href={part.href} title={part.title} target="_blank" rel="noopener noreferrer">{part.text}</a>{:else}<a href={part.href} title={part.title}>{part.text}</a>{/if}{:else}<span class="md-link" class:md-link-unset={part.unset} title={part.title}>{part.text}</span>{/if}{/each}
