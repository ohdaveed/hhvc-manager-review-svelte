<script lang="ts">
	import type { Walkthrough } from '$lib/karl/walkthrough';

	/**
	 * The navy bar that replaces the canvas toolbar while the walkthrough is
	 * open. It spans the whole centre column, above both the drawer and the
	 * mockup, so it is its own component rather than part of the drawer.
	 *
	 * The add-page link is derived from the page's content type, never
	 * hardcoded: sending a reviewer to the Transaction form to rebuild an
	 * Information page produces the wrong page type, and they find out on save.
	 */
	let {
		walkthrough,
		copied,
		onExit
	}: { walkthrough: Walkthrough; copied: number; onExit: () => void } = $props();
</script>

<nav class="wt-header" aria-label="Walkthrough">
	<div class="wt-left">
		<span class="wt-title">Rebuild in Karl</span>
		<span class="wt-page">{walkthrough.title} · {walkthrough.type}</span>
	</div>
	<div class="wt-right">
		<span class="wt-count">{copied} of {walkthrough.copyableCount} fields copied</span>
		<!-- api.sf.gov is the real Karl admin, not a route in this app. -->
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
		<a class="wt-form" href={walkthrough.formUrl} target="_blank" rel="noreferrer">
			Open Karl add-page form ↗
		</a>
		<button type="button" class="wt-exit" onclick={onExit}>Exit walkthrough</button>
	</div>
</nav>

<style>
	.wt-header {
		height: 48px;
		flex: none;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 0 20px;
		background: var(--sfds-color-blue-dark, #0c1464);
		color: #ffffff;
	}

	.wt-left {
		display: flex;
		align-items: baseline;
		gap: 12px;
		min-width: 0;
		font-size: 13px;
	}

	.wt-title {
		flex: none;
		font-family: var(--font-display);
		font-size: 15px;
		font-weight: 700;
	}

	.wt-page {
		opacity: 0.75;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.wt-right {
		display: flex;
		align-items: center;
		gap: 16px;
		flex: none;
		font-size: 13px;
	}

	.wt-count {
		opacity: 0.85;
		white-space: nowrap;
	}

	.wt-form {
		color: #ffffff;
		font-weight: 600;
		text-decoration: underline;
		text-underline-offset: 3px;
		white-space: nowrap;
	}

	.wt-exit {
		flex: none;
		height: 28px;
		padding: 0 12px;
		border: 1px solid rgba(255, 255, 255, 0.4);
		border-radius: 6px;
		background: transparent;
		color: #ffffff;
		font-size: 12px;
		font-weight: 600;
		white-space: nowrap;
		cursor: pointer;
	}

	.wt-exit:hover {
		background: rgba(255, 255, 255, 0.1);
	}
</style>
