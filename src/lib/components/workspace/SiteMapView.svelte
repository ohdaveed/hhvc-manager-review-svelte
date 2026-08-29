<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { buildSitemap, typeBreakdown, type Publishes } from '$lib/karl/sitemap';
	import { pageStore } from '$lib/stores/pageData.svelte';

	/**
	 * All 29 pages and what they link to.
	 *
	 * Linked from the queue footer in every design frame and never built, so
	 * that link went nowhere. The reason it is worth having is NOT that it draws
	 * a graph: Karl decides what a card publishes, and for most panels the
	 * referring page gets no say. Measured across the corpus's 143 card links,
	 * six publish the words written on the card and 137 do not -- so a reviewer
	 * can approve card copy that will never appear anywhere.
	 *
	 * Each row therefore leads with the DESTINATION's title, which is what
	 * actually renders, and says underneath what happens to the words the
	 * referring page wrote.
	 */
	let { onExit }: { onExit: () => void } = $props();

	const entries = $derived(buildSitemap(pageStore.pages));
	const breakdown = $derived(typeBreakdown(pageStore.pages));

	/** What Karl does with the card text the referring page wrote. */
	const PUBLISHES: Record<Publishes, string> = {
		authored: 'Your card text publishes',
		'title-only': "Karl prints the destination's title; your card text is dropped",
		inherits: "Karl prints the destination's title and summary; your card text is dropped",
		unknown: 'Undecided — resolve before typing anything from these cards'
	};

	function open(id: string | undefined) {
		if (id) {
			pageStore.showReview();
			goto(resolve('/review/[slug]', { slug: id }));
		}
	}
</script>

<div class="sitemap">
	<nav class="sm-header" aria-label="Site map">
		<div class="sm-head-left">
			<h2 class="sm-title">Site map</h2>
			<p class="sm-meta">{entries.length} pages · {breakdown}</p>
		</div>
		<button type="button" class="sm-exit" onclick={onExit}>Back to review</button>
	</nav>

	<div class="sm-body">
		<div class="sm-grid">
			{#each entries as entry (entry.id)}
				<section class="card">
					<header class="card-head">
						<div class="card-head-row">
							<span class="chip">{entry.type}</span>
							<span class="card-count">
								{entry.outgoing.length} out · {entry.incoming} in
							</span>
						</div>
						<h3 class="card-title">
							<button type="button" class="card-open" onclick={() => open(entry.id)}>
								{entry.title}
							</button>
						</h3>
						<p class="card-slug">{entry.slug}</p>
					</header>

					{#if entry.outgoing.length > 0}
						<ul class="links">
							{#each entry.outgoing as link, i (i)}
								<li>
									<button
										type="button"
										class="link"
										disabled={!link.live}
										onclick={() => open(link.id)}
									>
										<span class="link-title" class:link-dead={!link.live}>{link.title}</span>
										<span class="link-meta">
											{link.sectionHeading} — {PUBLISHES[link.publishes]}
										</span>
									</button>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="links-empty">Links to nothing in this corpus.</p>
					{/if}
				</section>
			{/each}
		</div>
	</div>
</div>

<style>
	.sitemap {
		display: flex;
		flex-direction: column;
		min-height: 0;
		flex: 1;
	}

	.sm-header {
		height: 48px;
		flex: none;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 0 20px;
		background: #ffffff;
		border-bottom: 1px solid var(--sfds-color-grey-l2);
	}

	.sm-head-left {
		display: flex;
		align-items: baseline;
		gap: 12px;
		min-width: 0;
	}

	.sm-title {
		margin: 0;
		font-family: var(--font-display);
		font-size: 15px;
		font-weight: 700;
	}

	.sm-meta {
		margin: 0;
		font-size: 13px;
		color: var(--text-secondary, #5a7a92);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.sm-exit {
		flex: none;
		height: 28px;
		padding: 0 12px;
		border: 1px solid var(--sfds-color-grey-l2);
		border-radius: 6px;
		background: #f7f7f7;
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
	}

	.sm-body {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 24px 28px 80px;
	}

	.sm-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
		gap: 20px;
		align-items: start;
		max-width: 1100px;
	}

	.card {
		background: #ffffff;
		border: 1px solid var(--sfds-color-grey-l2);
		border-radius: 4px;
		overflow: hidden;
		box-shadow:
			0 1px 2px rgba(12, 20, 100, 0.06),
			0 1px 3px rgba(12, 20, 100, 0.1);
	}

	.card-head {
		padding: 14px 18px;
		border-bottom: 1px solid var(--sfds-color-grey-l2);
		background: #fbfcfd;
	}

	.card-head-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		height: 20px;
		padding: 0 8px;
		border-radius: 4px;
		background: #f0f0f0;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #383939;
	}

	.card-count {
		margin-left: auto;
		font-size: 12px;
		color: var(--text-secondary, #5a7a92);
	}

	.card-title {
		margin: 8px 0 2px;
		font-size: 15px;
		line-height: 21px;
	}

	.card-open {
		margin: 0;
		padding: 0;
		border: 0;
		background: none;
		font: inherit;
		font-weight: 700;
		color: var(--color-sfds-action, #495ed4);
		text-align: left;
		text-decoration: underline;
		text-underline-offset: 3px;
		cursor: pointer;
	}

	.card-slug {
		margin: 0;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 11px;
		line-height: 16px;
		color: var(--text-secondary, #5a7a92);
	}

	.links {
		list-style: none;
		margin: 0;
		padding: 12px 18px 16px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.link {
		display: block;
		width: 100%;
		margin: 0;
		padding: 4px 8px;
		border: 0;
		border-radius: 4px;
		background: none;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.link:hover:not(:disabled) {
		background: #f0f0f0;
	}

	.link:disabled {
		cursor: default;
	}

	.link-title {
		display: block;
		font-size: 14px;
		line-height: 19px;
		font-weight: 600;
		color: var(--color-sfds-action, #495ed4);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.link-dead {
		color: var(--text-secondary, #5a7a92);
		text-decoration: none;
	}

	.link-meta {
		display: block;
		font-size: 12px;
		line-height: 17px;
		color: var(--text-secondary, #5a7a92);
	}

	.links-empty {
		margin: 0;
		padding: 12px 18px 16px;
		font-size: 13px;
		color: var(--text-secondary, #5a7a92);
	}
</style>
