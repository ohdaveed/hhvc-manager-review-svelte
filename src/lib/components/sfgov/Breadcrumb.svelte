<script lang="ts">
	/**
	 * "SF.gov / {partOf}" mockup chrome above the page title.
	 *
	 * Inert by design, like the rest of the SF.gov mockup furniture: this is a
	 * copy-review tool, not a working site, so these are `<span>`s rather than
	 * `<a href>`s (matching the design prototype, prototype.dc.html:341-346) --
	 * an anchor with no real destination is an axe failure the e2e gate catches.
	 *
	 * No corpus module currently sets `partOf` (verified via repo-wide grep), so
	 * this renders nothing on all 29 pages today. It exists so a page that gets
	 * one later shows the crumb without a template change.
	 */
	let { partOf }: { partOf?: string } = $props();
</script>

{#if partOf}
	<nav aria-label="Breadcrumb" class="breadcrumb">
		<span class="breadcrumb-link">SF.gov</span>
		<span aria-hidden="true" class="breadcrumb-sep">/</span>
		<span class="breadcrumb-link">{partOf}</span>
	</nav>
{/if}

<style>
	.breadcrumb {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 14px;
		font-size: 14px;
	}

	.breadcrumb-link {
		color: var(--sfds-color-blue-bright);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.breadcrumb-sep {
		color: var(--sfds-color-slate-l2);
	}
</style>
