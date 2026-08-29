<script lang="ts">
	import EditTarget from '../EditTarget.svelte';

	/**
	 * SF.gov's Table block, ported from the design system's `Tables` section
	 * (Figma `wv6CXpGGH0W8mAmkXKpiex`, node `9846:167601`).
	 *
	 * The design publishes three variants -- column headers only, row headers
	 * only, and both. Only the FIRST is built, because only it is expressible
	 * in the corpus: `section.table` is a `string[][]` whose row 0 is the
	 * header row and whose remaining rows are data. Verified across all seven
	 * tables in the corpus (every one uniform, every row 0 a genuine label
	 * row: `['Section', 'What it covers', 'In plain language']` and 6x
	 * `['Health code', 'In plain language']`).
	 *
	 * A row-header variant would need a per-cell signal the data does not
	 * carry -- in the design it is a fixed 147px first column with its own
	 * grey fill and right border. The `**` in `'**Sec. 581(a)**'` is NOT that
	 * signal: it is the corpus's ordinary inline emphasis, used 94 times
	 * across bullets, paragraphs and callouts too, and it renders as bold
	 * through the same `MarkdownText` path every other field uses.
	 *
	 * The design's "Full Table" instance also carries a 40px title and a
	 * description. Neither is ported: that instance is a documentation
	 * specimen, `Section.svelte` already renders `section.heading` as the
	 * `<h2>` one level up, and the corpus has no per-table description field.
	 */
	let { table, sectionKey, label }: { table?: string[][]; sectionKey: string; label: string } =
		$props();

	const rows = $derived(Array.isArray(table) ? table : []);
	const header = $derived(rows[0] ?? []);
	const body = $derived(rows.slice(1));
</script>

{#if rows.length}
	<!-- `tabindex` + `role="region"` so the scroll container is reachable by
	     keyboard when it actually overflows; without it a keyboard-only
	     reviewer cannot reach the hidden columns.

	     Svelte's `a11y_no_noninteractive_tabindex` fires here and is wrong for
	     this case: axe's own `scrollable-region-focusable` rule REQUIRES a
	     scrollable container to be focusable, and the labelled-region pattern
	     is how it is satisfied. Suppressing the framework warning is what keeps
	     the e2e axe pass green, so the two are not in tension. -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div class="table-scroll" tabindex="0" role="region" aria-label={`${label} table`}>
		<table class="sfgov-table">
			<thead>
				<tr>
					{#each header as cell, c (c)}
						<th scope="col">
							<EditTarget
								as="span"
								name={`${label} Table Header: ${cell}`}
								fieldId={`sections.${sectionKey}.table.0.${c}`}
								value={cell}
							/>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each body as row, r (r)}
					<tr>
						{#each row as cell, c (c)}
							<td>
								<EditTarget
									as="span"
									name={`${label} Table Row ${r + 1}, ${header[c] || `Column ${c + 1}`}`}
									fieldId={`sections.${sectionKey}.table.${r + 1}.${c}`}
									value={cell}
								/>
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<style>
	/* The design's note: "When the table gets too small to show all columns,
	   add a shadow and a scrollbar", and on mobile "always use a shadow and
	   side scrollbar, as most tables will go out of view."

	   Both example frames get there by overflowing on purpose -- a 920px
	   table in a 643px desktop frame, a 474px table in a 376px phone frame --
	   rather than by shrinking the 20px cell padding, which is identical in
	   both. So `min-width` carries that here, and the padding stays put.

	   The shadow is the four-layer gradient trick: the white layers scroll
	   WITH the content (`local`) and the shadow layers are fixed (`scroll`),
	   so each shadow is masked at its own end of the range and appears only
	   when there is more table that way. No JS, no scroll listener, no resize
	   observer. `Rectangle 155` in the design is a right-edge gradient to
	   `rgba(0,0,0,0.40)` at 40px; the left edge is the same mechanism and is
	   kept, since the design simply had nothing to draw it against. */
	.table-scroll {
		overflow-x: auto;
		margin: 20px 0;
		background:
			linear-gradient(to right, #ffffff 50%, rgba(255, 255, 255, 0)) left center,
			linear-gradient(to left, #ffffff 50%, rgba(255, 255, 255, 0)) right center,
			linear-gradient(to left, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.4)) left center,
			linear-gradient(to right, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.4)) right center;
		background-repeat: no-repeat;
		/* The white masks MUST be wider than the shadows they cover. At equal
		   widths the mask is still mid-fade where the shadow is still dark, so
		   a dark band prints down a table that does not even scroll -- which is
		   exactly what the first render did. 80px white (solid through its
		   first 50%, i.e. 40px) fully covers a 40px shadow. */
		background-size:
			80px 100%,
			80px 100%,
			40px 100%,
			40px 100%;
		background-attachment: local, local, scroll, scroll;
	}

	/* `Rectangle 157` (track) and `Rectangle 158` (thumb) are a spec, not a
	   drawing of the native bar: 14px track in #ECECEC, 8px thumb in #9E9E9E
	   fully rounded. Firefox takes the two-value shorthand; WebKit needs the
	   pseudo-elements, where the 3px inset is what leaves an 8px thumb inside
	   a 14px track. */
	.table-scroll {
		scrollbar-width: thin;
		scrollbar-color: #9e9e9e #ececec;
	}

	.table-scroll::-webkit-scrollbar {
		height: 14px;
	}

	.table-scroll::-webkit-scrollbar-track {
		background: #ececec;
	}

	.table-scroll::-webkit-scrollbar-thumb {
		background: #9e9e9e;
		border-radius: 130px;
		border: 3px solid #ececec;
	}

	.sfgov-table {
		width: 100%;
		border-collapse: collapse;
		/* Every cell in the design is `flex: 1 1 0` -- equal columns, not
		   content-sized, which is what a bare `<table>` would give. */
		table-layout: fixed;
		font-size: 16px;
		line-height: 24px;
		color: #0b0c0c;
		/* Forces the overflow the shadow and scrollbar advertise: wider than a
		   phone, narrower than the 760px mockup body. */
		min-width: 480px;
	}

	.sfgov-table th,
	.sfgov-table td {
		/* spacing/spacing-xl */
		padding: 20px;
		text-align: left;
		vertical-align: top;
		border-bottom: 1px solid #c9caca;
		/* `word-wrap: break-word` on every text node in the design; with fixed
		   layout a long unbroken token would otherwise widen its column. */
		overflow-wrap: break-word;
	}

	.sfgov-table th {
		background: #f0f0f0;
		font-weight: 700;
	}

	/* `.edit-target` is the global `block w-full` utility (ButtonBlock's note
	   covers the same cascade fact: unlayered component CSS outranks the
	   Tailwind utility layer here). Filling the cell is right; the margin it
	   carries for paragraphs would double the cell padding. */
	.sfgov-table :global(.edit-target) {
		margin: 0;
		padding: 0;
	}
</style>
