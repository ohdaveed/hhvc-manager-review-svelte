<script lang="ts">
	/**
	 * "On this page" jump links, generated from a page's H2s.
	 *
	 * Information pages carry these automatically on live SF.gov. There is no
	 * Karl field for the list — it is derived from the section headings.
	 *
	 * This has no JSX counterpart. It was converted from the shipped
	 * `src/lib/components/sfgov/OnThisPage.svelte`, with one deliberate change:
	 * the shipped component renders inert `<span>`s because it labels a mockup
	 * where the anchors go nowhere and a dead `<a href>` fails the axe gate.
	 * Here the entries are real `<a href="#id">` links, and the caller is
	 * responsible for the matching `id` on each heading.
	 *
	 * The `slugify` used here must match the one on the headings. The shipped
	 * `Section.svelte` uses `heading.toLowerCase().replace(/\s+/g, '-')`; that
	 * is reproduced exactly rather than improved, because an id scheme that
	 * disagrees with its target is worse than a crude one.
	 *
	 * WCAG 2.1 AA:
	 * - 2.4.1 Bypass Blocks. This is the mechanism, so the nav carries a real
	 *   accessible name and a real list.
	 * - 1.3.1. `<nav aria-label="On this page">` wrapping a `<ul>`.
	 * - 2.4.4. Each link's text is the heading it targets.
	 * - Renders nothing below two headings — a table of contents with one entry
	 *   is noise, and the shipped component makes the same call.
	 */
	interface Props {
		sections?: Array<{ heading?: string; id?: string }>;
		title?: string;
		class?: string;
	}

	let { sections = [], title = 'On this page', class: className = '' }: Props = $props();

	function slugify(heading: string): string {
		return heading.toLowerCase().replace(/\s+/g, '-');
	}

	const entries = $derived(
		sections
			.filter((section): section is { heading: string; id?: string } => !!section.heading)
			.map((section) => ({ heading: section.heading, id: section.id ?? slugify(section.heading) }))
	);
</script>

{#if entries.length >= 2}
	<nav aria-label={title} class="ds-otp flex flex-col {className}">
		<h2 class="ds-otp-title m-0">{title}</h2>
		<ul class="ds-otp-list flex flex-col">
			{#each entries as entry (entry.id)}
				<li class="ds-otp-item">
					<a href="#{entry.id}" class="ds-otp-link">{entry.heading}</a>
				</li>
			{/each}
		</ul>
	</nav>
{/if}

<style>
	.ds-otp {
		margin: 0 0 28px;
		padding: 16px 0;
		border-top: 1px solid var(--color-site-border-subtle, #e9eaea);
		border-bottom: 1px solid var(--color-site-border-subtle, #e9eaea);
		font-family: var(--site-font-body);
	}

	.ds-otp-title {
		margin-bottom: 10px;
		font-family: var(--site-font-display);
		font-size: 17px;
		line-height: 22px;
		font-weight: 700;
		color: var(--color-site-ink, #0b0c0c);
	}

	.ds-otp-list {
		list-style: none;
		margin: 0;
		padding: 0;
		gap: 6px;
	}

	.ds-otp-item {
		font-size: 15px;
		line-height: 22px;
	}

	.ds-otp-link {
		color: var(--color-site-action, #1b519e);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.ds-otp-link:hover {
		color: var(--color-site-action-dark, #043578);
	}
	.ds-otp-link:focus-visible {
		outline: none;
		box-shadow: var(--site-focus-ring, 0 0 0 4px #fcfcfc, 0 0 0 7px #386ebf);
		border-radius: 2px;
	}
</style>
