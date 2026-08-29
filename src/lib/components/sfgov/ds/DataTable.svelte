<script lang="ts">
	import type { Cell, TableRow } from './types';

	/**
	 * Data table. Two layouts: `column` (headers across the top) and `row`
	 * (a header cell down the left of every row).
	 *
	 * Rules the frames settle:
	 * - Report is the only Karl content type that supports tables, and they work
	 *   best at three columns or fewer.
	 * - A link inside a cell is bold and underlined in --site-table-link. That
	 *   is the one place that colour is used.
	 *
	 * WCAG 2.1 AA:
	 * - 1.3.1 Info and Relationships. A real `<table>` with `<th scope>`. The
	 *   JSX builds the grid from `<div>`s and flexbox, which looks identical and
	 *   tells a screen reader nothing — no row or column association, no cell
	 *   count, no table navigation mode. This is the second structural departure
	 *   from the JSX (Dropdown is the other) and for the same reason.
	 * - `scope="col"` in the column layout, `scope="row"` in the row layout.
	 * - 1.3.2 Meaningful Sequence. Cells read left to right, top to bottom, in
	 *   source order — no CSS reordering.
	 * - 2.1.1 / 2.4.3. When a table overflows its container the wrapper becomes
	 *   focusable (`tabindex="0"` with `role="region"` and an accessible name),
	 *   so a keyboard user can scroll it. axe's own
	 *   `scrollable-region-focusable` rule requires this, and the repo's
	 *   existing accessibility gate already depends on it for the mockup tables.
	 * - 1.4.10 Reflow. `caption` is required rather than optional: it is the
	 *   region's accessible name and the table's own label.
	 */
	interface Props {
		/** Required — names the table for the scrollable region and screen readers. */
		caption: string;
		/** Hide the caption visually. It stays in the accessibility tree. */
		captionHidden?: boolean;
		layout?: 'column' | 'row';
		headers?: string[];
		rows?: TableRow[];
		rowHeaderWidth?: number;
		class?: string;
	}

	let {
		caption,
		captionHidden = false,
		layout = 'column',
		headers = [],
		rows = [],
		rowHeaderWidth = 147,
		class: className = ''
	}: Props = $props();

	function isLink(cell: Cell): cell is { label: string; href?: string } {
		return typeof cell === 'object' && cell !== null && 'label' in cell;
	}
</script>

<div role="region" aria-label={caption} tabindex="0" class="ds-table-wrap {className}">
	<table class="ds-table">
		<caption class="ds-caption" class:sr-only={captionHidden}>{caption}</caption>

		{#if layout === 'column'}
			<thead>
				<tr>
					{#each headers as header, i (i)}
						<th scope="col" class="ds-th">{header}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each rows as row, i (i)}
					<tr>
						{#each row.cells as cell, j (j)}
							<td class="ds-td">
								{#if isLink(cell)}
									<a href={cell.href ?? '#'} class="ds-cell-link">{cell.label}</a>
								{:else}
									{cell}
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		{:else}
			<tbody>
				{#each rows as row, i (i)}
					<tr>
						<th scope="row" class="ds-th ds-th-row" style:width="{rowHeaderWidth}px"
							>{row.header}</th
						>
						{#each row.cells as cell, j (j)}
							<td class="ds-td">
								{#if isLink(cell)}
									<a href={cell.href ?? '#'} class="ds-cell-link">{cell.label}</a>
								{:else}
									{cell}
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		{/if}
	</table>
</div>

<style>
	.ds-table-wrap {
		overflow-x: auto;
		font-family: var(--site-font-body);
	}
	.ds-table-wrap:focus-visible {
		outline: none;
		box-shadow: var(--site-focus-ring, 0 0 0 4px #fcfcfc, 0 0 0 7px #386ebf);
	}

	.ds-table {
		width: 100%;
		border-collapse: collapse;
		border-bottom: 1px solid var(--color-site-table-rule, #c9caca);
	}

	.ds-caption {
		padding: 0 0 12px;
		text-align: left;
		font-size: 16px;
		line-height: 24px;
		font-weight: 700;
		color: var(--color-site-ink, #0b0c0c);
	}

	/* Visually hidden but not display:none — a caption removed from the box tree
	   is removed from the accessibility tree with it. */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.ds-th,
	.ds-td {
		padding: 20px;
		text-align: left;
		vertical-align: middle;
		font-size: 16px;
		line-height: 24px;
		color: var(--color-site-ink, #0b0c0c);
		border-bottom: 1px solid var(--color-site-table-rule, #c9caca);
	}

	.ds-th {
		background: var(--color-site-table-head, #f0f0f0);
		font-weight: 700;
	}

	.ds-th-row {
		border-right: 1px solid var(--color-site-table-rule, #c9caca);
	}

	.ds-cell-link {
		font-weight: 700;
		text-decoration: underline;
		color: var(--color-site-table-link, #386ebf);
	}
	.ds-cell-link:hover {
		color: var(--color-site-action-dark, #043578);
	}
	.ds-cell-link:focus-visible {
		outline: none;
		box-shadow: var(--site-focus-ring, 0 0 0 4px #fcfcfc, 0 0 0 7px #386ebf);
		border-radius: 2px;
	}
</style>
