<script lang="ts">
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import CircleHelp from '@lucide/svelte/icons/circle-help';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import { STATUS_TEXT, type PlacementStatus } from '$lib/karl/placement';

	/**
	 * Review-tool annotation, not sf.gov chrome: where this copy lands in Karl.
	 *
	 * Never colour alone (DOJ accessibility assignment): every status has its own
	 * icon and word, and the outline around the element has its own line style.
	 * The icons are SVG with no text, so a chip read through `aria-describedby`
	 * says "Needs a fix · What to Do · Section 1 · Button link" and nothing else.
	 *
	 * `hidden` is for a chip a button already points at with `aria-describedby`,
	 * or one inside a heading, where readable text would rename the heading.
	 */
	let {
		status,
		label = '',
		reasons = [],
		id = undefined,
		hidden = false,
		as = 'span'
	}: {
		status: PlacementStatus;
		label?: string;
		reasons?: readonly string[];
		id?: string;
		hidden?: boolean;
		as?: 'span' | 'p';
	} = $props();

	const icons = {
		placed: CircleCheck,
		'needs-fix': TriangleAlert,
		unconfirmed: CircleHelp,
		unplaced: CircleX
	} as const;
	const Icon = $derived(icons[status]);
</script>

<svelte:element
	this={as}
	class="karl-chip"
	data-karl-chip={status}
	{id}
	aria-hidden={hidden ? 'true' : undefined}
>
	<span class="karl-chip-head">
		<Icon class="karl-chip-icon" aria-hidden="true" />
		<span><strong>{STATUS_TEXT[status]}</strong>{label ? ` · ${label}` : ''}</span>
	</span>
	{#each reasons as reason, i (i)}
		<span class="karl-chip-reason">{reason}</span>
	{/each}
</svelte:element>
