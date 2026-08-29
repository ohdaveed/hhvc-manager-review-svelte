<script lang="ts">
	/**
	 * "On this page" TOC, built from section headings -- there is no Karl field
	 * for it (design prototype's own note, prototype.dc.html:354-366). `sections`
	 * is the same array `Page.svelte` already hands to `Section`, so wiring this
	 * in is `<OnThisPage sections={page.sections} />`.
	 *
	 * Entries are inert `<span>`s, not `<a href>`s, matching the prototype and
	 * for the same reason as `Breadcrumb`: this is a copy-review mockup, not a
	 * working site, and a non-functional anchor is an axe failure. The heading's
	 * own element already carries the anchor id (`Section.svelte`'s
	 * `id={section.heading.toLowerCase().replace(/\s+/g, '-')}`) -- repeating
	 * that id here would be a duplicate-id violation, so nothing is repeated.
	 */
	let { sections = [] }: { sections?: Array<{ heading?: string }> } = $props();

	const headings = $derived(
		sections.map((section) => section.heading).filter((heading): heading is string => !!heading)
	);
</script>

{#if headings.length >= 2}
	<nav aria-label="On this page" class="on-this-page">
		<h2 class="on-this-page-title">On this page</h2>
		<ul class="on-this-page-list">
			{#each headings as heading, i (i)}
				<li class="on-this-page-item">
					<span>{heading}</span>
				</li>
			{/each}
		</ul>
	</nav>
{/if}

<style>
	.on-this-page {
		display: flex;
		flex-direction: column;
		margin: 0 0 28px;
		padding: 16px 0;
		border-top: 1px solid var(--sfds-color-grey-l2);
		border-bottom: 1px solid var(--sfds-color-grey-l2);
	}

	.on-this-page-title {
		margin: 0 0 10px;
		font-family: var(--sfds-font-slab);
		font-size: 17px;
		line-height: 22px;
		font-weight: 700;
	}

	.on-this-page-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.on-this-page-item {
		font-size: 15px;
		line-height: 22px;
	}

	.on-this-page-item span {
		color: var(--sfds-color-blue-bright);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
</style>
