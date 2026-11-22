<script lang="ts">
	import { COMPONENT_SUPPORT, isSupported, type KarlComponent } from '$lib/karl/componentSupport';

	/**
	 * Review-tool annotation, not sf.gov chrome: says the mockup uses a component
	 * Karl does not offer on this page type. The content beside it is left as it
	 * is -- what to do about it is the HHVC team's call.
	 *
	 * Renders only for a definite `no`. `unknown` (the help center leaves it
	 * unsettled) and a missing page type both show nothing, since `isSupported`
	 * reads any unlisted type, `undefined` included, as `no`.
	 *
	 * The look is WhatToKnow's orphan notice, copied rather than shared. The help
	 * URL is plain text, not a link: nothing in the mockup navigates, and the
	 * axe gate fails dead links.
	 */
	let { component, pageType }: { component: KarlComponent; pageType: unknown } = $props();

	const rule = $derived(COMPONENT_SUPPORT[component]);
	const shown = $derived(typeof pageType === 'string' && isSupported(component, pageType) === 'no');
</script>

{#if shown}
	<div class="karl-orphan" data-karl-orphan={component}>
		<span class="karl-orphan-icon" aria-hidden="true">!</span>
		<span class="karl-orphan-text">
			No Karl {rule.label} on a {pageType} page. {rule.instead}
			<span class="karl-orphan-url">Karl help: {rule.url}</span>
		</span>
	</div>
{/if}

<style>
	.karl-orphan {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		margin: 0 0 8px;
		padding: 8px 10px;
		border-left: 3px solid #f2c94c;
		border-radius: 0 4px 4px 0;
		background: #fff7e6;
	}

	.karl-orphan-icon {
		flex: none;
		font-size: 12px;
		font-weight: 700;
		color: #6f4a00;
	}

	.karl-orphan-text {
		min-width: 0;
		font-size: 12px;
		line-height: 17px;
		color: #6f4a00;
	}

	.karl-orphan-url {
		display: block;
		overflow-wrap: anywhere;
	}
</style>
