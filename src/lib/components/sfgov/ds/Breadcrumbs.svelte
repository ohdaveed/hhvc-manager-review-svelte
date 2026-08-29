<script lang="ts">
	import type { Crumb } from './types';

	/**
	 * Breadcrumb trail.
	 *
	 * Rules the frames settle:
	 * - The current page is not a link and is never truncated.
	 * - Five or more levels collapse the middle to a `…`.
	 * - Under 640px the whole trail becomes one back link to the parent
	 *   (`compact`). The caller decides — this component does not measure the
	 *   viewport, so the breakpoint stays with the page's own layout logic.
	 *
	 * WCAG 2.1 AA:
	 * - 1.3.1 Info and Relationships. `aria-label="Breadcrumb"` on the nav and
	 *   `aria-current="page"` on the last item; the trail is an ordered list so
	 *   the hierarchy survives without CSS.
	 * - 4.1.2 Name, Role, Value. The `…` is a real `<button>` that expands the
	 *   hidden levels. The JSX renders it inert, which is fine for a static
	 *   specimen and a 4.1.2 failure in a shipped component — a control that
	 *   announces as a button must do something.
	 * - 1.4.11. Chevrons are `aria-hidden`; the list structure carries the
	 *   relationship, so the separator is decoration.
	 */
	interface Props {
		items?: Crumb[];
		collapseAfter?: number;
		onDark?: boolean;
		compact?: boolean;
		class?: string;
	}

	let {
		items = [],
		collapseAfter = 4,
		onDark = false,
		compact = false,
		class: className = ''
	}: Props = $props();

	let expanded = $state(false);

	const current = $derived(items[items.length - 1]);
	const parent = $derived(items[items.length - 2] ?? items[0]);
	const ancestors = $derived(items.slice(0, -1));
	const truncated = $derived(!expanded && ancestors.length + 1 > collapseAfter);
	const shown = $derived(truncated ? [ancestors[0], ancestors[ancestors.length - 1]] : ancestors);
	const hiddenCount = $derived(Math.max(0, ancestors.length - 2));
</script>

{#if compact}
	<nav aria-label="Breadcrumb" class="ds-crumbs {className}" class:on-dark={onDark}>
		<a href={parent?.href ?? '#'} class="ds-crumb-link inline-flex items-center gap-2">
			<svg
				width="14"
				height="14"
				viewBox="0 0 20 20"
				fill="none"
				aria-hidden="true"
				class="flex-none"
			>
				<path d="M13 3L6 10L13 17" stroke="currentColor" stroke-width="2" />
			</svg>
			{parent?.label}
		</a>
	</nav>
{:else}
	<nav aria-label="Breadcrumb" class="ds-crumbs {className}" class:on-dark={onDark}>
		<ol class="flex flex-wrap items-center gap-3">
			{#each shown as item, i (item?.href ?? i)}
				<li class="flex items-center gap-3">
					<a href={item?.href ?? '#'} class="ds-crumb-link">{item?.label}</a>
					<svg
						width="14"
						height="14"
						viewBox="0 0 20 20"
						fill="none"
						aria-hidden="true"
						class="ds-sep flex-none"
					>
						<path d="M7 3L14 10L7 17" stroke="currentColor" stroke-width="2" />
					</svg>
				</li>
				{#if truncated && i === 0}
					<li class="flex items-center gap-3">
						<button
							type="button"
							class="ds-crumb-more"
							aria-expanded={expanded}
							aria-label="Show {hiddenCount} hidden levels"
							onclick={() => (expanded = true)}>…</button
						>
						<svg
							width="14"
							height="14"
							viewBox="0 0 20 20"
							fill="none"
							aria-hidden="true"
							class="ds-sep flex-none"
						>
							<path d="M7 3L14 10L7 17" stroke="currentColor" stroke-width="2" />
						</svg>
					</li>
				{/if}
			{/each}
			<li>
				<span aria-current="page" class="ds-crumb-current">{current?.label}</span>
			</li>
		</ol>
	</nav>
{/if}

<style>
	.ds-crumbs {
		font-family: var(--site-font-body);
		font-size: 16px;
		line-height: 24px;
	}

	.ds-crumbs ol {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.ds-crumb-link {
		color: var(--color-site-action, #1b519e);
		text-decoration: underline;
	}
	.ds-crumb-link:hover {
		color: var(--color-site-action-dark, #043578);
	}

	.ds-crumb-current {
		color: var(--color-site-ink-secondary, #3a3e42);
	}

	.ds-sep {
		color: var(--color-site-ink-muted, #5b5f63);
	}

	.ds-crumb-more {
		padding: 0 6px;
		border: 0;
		background: none;
		font: inherit;
		color: var(--color-site-action, #1b519e);
		cursor: pointer;
	}

	.ds-crumb-more:focus-visible,
	.ds-crumb-link:focus-visible {
		outline: none;
		box-shadow: var(--site-focus-ring, 0 0 0 4px #fcfcfc, 0 0 0 7px #386ebf);
		border-radius: 2px;
	}

	/* White first stop on dark grounds. #386EBF clears 3:1 against #000925
	   (3.90:1) but not against a blue fill beside it, so white is used
	   everywhere dark for one consistent ring shape. */
	.on-dark .ds-crumb-link,
	.on-dark .ds-crumb-more {
		color: #fcfcfc;
	}
	.on-dark .ds-crumb-current {
		color: #e9eaea;
	}
	.on-dark .ds-sep {
		color: #aaabab;
	}
	.on-dark .ds-crumb-link:focus-visible,
	.on-dark .ds-crumb-more:focus-visible {
		box-shadow: var(--site-focus-ring-dark, 0 0 0 4px #ffffff, 0 0 0 7px #386ebf);
	}
</style>
