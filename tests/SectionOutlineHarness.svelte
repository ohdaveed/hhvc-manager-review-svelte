<script lang="ts">
	/**
	 * Test harness: renders a `Section` under a Karl outline context, which only
	 * the review layout provides in the app. The context key is private to
	 * `outlineContext.ts`, so a component that calls its setter is the way in.
	 */
	import Section from '../src/lib/components/Section.svelte';
	import { setOutlineContext } from '../src/lib/karl/outlineContext';
	import type { PagePlacements } from '../src/lib/karl/placement';

	let {
		section,
		index,
		placements = null,
		always = null
	}: {
		section: Record<string, unknown>;
		index: number;
		placements?: PagePlacements | null;
		always?: PagePlacements | null;
	} = $props();

	setOutlineContext({
		get placements() {
			return placements;
		},
		get always() {
			return always;
		}
	});
</script>

<Section {section} {index} />
