<script lang="ts">
	import { STATUS_LABELS, type ReviewStatus } from '$lib/review/statusLabels';

	type Decided = Exclude<ReviewStatus, 'needs-review'>;

	let {
		counts,
		total,
		size = 'sm'
	}: {
		/** Pages per status. A status left out counts as zero. */
		counts: Partial<Record<ReviewStatus, number>>;
		/** Every page in the review, decided or not: the bar's full width. */
		total: number;
		size?: 'sm' | 'lg';
	} = $props();

	// `needs-review` is deliberately absent. The grey track IS the undecided
	// remainder; a grey segment on a grey track would be invisible and would
	// count those pages twice. The `satisfies` is what makes a new status fail
	// to compile here until someone decides how it reads aloud.
	const SEGMENTS = {
		approved: (n: number) => `${n} approved`,
		revise: (n: number) => `${n} ${n === 1 ? 'needs' : 'need'} revision`,
		blocked: (n: number) => `${n} blocked`
	} satisfies Record<Decided, (n: number) => string>;

	// Zero counts are dropped, not drawn at zero width: an empty segment would
	// still paint its hairline, and "0 blocked" is noise in the label.
	const segments = $derived(
		(Object.keys(SEGMENTS) as Decided[])
			.map((status) => ({ status, count: counts[status] ?? 0 }))
			.filter((s) => s.count > 0)
	);
	const decided = $derived(segments.reduce((sum, s) => sum + s.count, 0));
	const pct = $derived(total === 0 ? 0 : Math.round((decided / total) * 100));

	const label = $derived.by(() => {
		const sentence = `${decided} of ${total} pages decided, ${pct} percent`;
		const parts = segments.map((s) => SEGMENTS[s.status](s.count));
		return parts.length > 0 ? `${sentence}: ${parts.join(', ')}` : sentence;
	});
</script>

<!-- Segments over a grey track, so the shape of the remaining work is visible
     rather than just its size.

     `role="img"` with a sentence, not `role="progressbar"`: a progressbar
     carries one value and this carries three, and a bar split by colour alone
     says nothing to a screen reader (WCAG 1.4.1).

     Widths are percentages of the whole review, not flex weights, so one page
     of 39 is still a visible slice.

     The white hairline between segments is the boundary, and the boundary is
     what tells them apart: sfds-amber against sfds-red measures 1.13:1 and
     sfds-green against sfds-amber 1.05:1, so touching fills read as one bar.
     White clears 3:1 against all three (WCAG 1.4.11). -->
<div
	class="flex w-full overflow-hidden rounded-full bg-sfds-grey-l2 {size === 'lg' ? 'h-3' : 'h-1.5'}"
	role="img"
	aria-label={label}
>
	{#each segments as s, i (s.status)}
		<div
			data-status={s.status}
			class="{STATUS_LABELS[s.status].bar} {i > 0 ? 'border-l border-white' : ''}"
			style="width: {total === 0 ? 0 : (s.count / total) * 100}%"
		></div>
	{/each}
</div>
