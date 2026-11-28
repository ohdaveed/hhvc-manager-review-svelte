<script lang="ts">
	import ChevronDown from '@lucide/svelte/icons/chevron-down';

	let {
		startOpen,
		attached = false
	}: {
		/**
		 * Whether the guide should start open, or `undefined` while that is not
		 * known yet. The page decides: open for a reviewer who has decided
		 * nothing yet. (It is not rendered for a signed-out visitor.)
		 */
		startOpen: boolean | undefined;
		/**
		 * The footer of the progress card rather than a card of its own: no outer
		 * border, a rule above it, and only the bottom corners rounded.
		 */
		attached?: boolean;
	} = $props();

	const steps = [
		'Open a page from the queue. Each mockup renders the way it would appear on SF.gov.',
		'Read it and edit the copy inline. An AI rewrite can suggest alternatives for any field.',
		'Record a decision: approved, needs revision or blocked, with a note for the content team.',
		'Move on to the next undecided page until every page has a decision.',
		'Once a page is approved, open its Karl walkthrough to rebuild it in Karl field by field.'
	];

	/**
	 * Open for someone finding out what the tool is; closed for a reviewer who
	 * came back to carry on. Ten steps of instructions above the page list work
	 * against the progress card's "pick up where you left off" job on every visit
	 * after the first.
	 *
	 * Starts CLOSED, and settles once `startOpen` is known. A returning reviewer
	 * is who must not see a flash of it; a newcomer gets it a beat late instead,
	 * which is the cheaper of the two.
	 *
	 * `latched` and `touched` are plain `let`, not `$state`, so reading them here
	 * creates no dependency and the effect settles the initial state ONCE. Without
	 * that, a reviewer who collapsed this would have it reopened under them the
	 * next time the session re-resolved -- `onAuthStateChange` fires on token
	 * refresh, not just sign-in.
	 *
	 * The Karl half used to be its own disclosure that opened once a page was
	 * approved, carrying a "Ready to move" link per approved page. Those links
	 * are now the All pages list's Karl column, so nothing here depends on the
	 * review and the one rule above decides both halves.
	 */
	let open = $state(false);
	let latched = false;
	let touched = false;

	$effect(() => {
		if (latched || touched || startOpen === undefined) return;
		latched = true;
		open = startOpen;
	});
</script>

<!-- One native `<details>`, the page's one disclosure pattern. The `<section>`
     keeps the region and its name when it is closed: a closed `<details>` drops
     its contents from the accessibility tree, but the summary, and the heading
     inside it, stay. -->
<section
	aria-labelledby="review-guide"
	class={attached
		? 'border-t border-sfds-grey-l2'
		: 'rounded-[4px] border border-sfds-grey-l2 bg-white'}
>
	<details bind:open ontoggle={() => (touched = true)} class="group">
		<!-- The h2 sits inside the summary so the heading stays in the document
		     outline and the summary still provides the control's accessible name.
		     `marker:content-none` removes the default triangle in favour of the
		     chevron, which rotates -- an affordance a disclosure needs either way. -->
		<summary
			class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 marker:content-none hover:bg-sfds-blue-l1/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sfds-black sm:px-5 {attached
				? 'rounded-b-[3px] bg-slate-50'
				: 'rounded-[4px]'}"
		>
			<h2 id="review-guide" class="font-medium text-slate-900">
				Review guide and moving pages into Karl
			</h2>
			<ChevronDown
				class="size-4 shrink-0 text-sfds-slate-l3 transition-transform group-open:rotate-180"
				aria-hidden="true"
			/>
		</summary>
		<div class="grid gap-6 px-4 pt-2 pb-5 sm:px-5 md:grid-cols-2">
			<div>
				<h3 class="font-semibold text-slate-900">How it works</h3>
				<ol class="mt-2 list-decimal space-y-2 pl-5 text-sm text-slate-800">
					{#each steps as step (step)}
						<li>{step}</li>
					{/each}
				</ol>
			</div>
			<div>
				<h3 class="font-semibold text-slate-900">Move a page into Karl</h3>
				<p class="mt-2 text-sm text-slate-800">
					The Karl walkthrough rebuilds a page in Karl, SF.gov’s content system, one field at a
					time, so nothing is retyped and nothing is missed. Approved pages have a
					<strong class="font-semibold">Move to Karl</strong> link in the list below.
				</p>
				<ol class="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-800">
					<li>Open a page, ideally an approved one.</li>
					<li>
						Select <strong class="font-semibold">Start the Karl walkthrough</strong> on the review panel’s
						Karl tab.
					</li>
					<li>
						Use <strong class="font-semibold">Open Karl add-page form</strong> to start the page in Karl,
						then follow the steps: each names the Karl field, and the mockup scrolls to the section it
						comes from.
					</li>
					<li>
						Choose <strong class="font-semibold">Copy &amp; next</strong> and paste into Karl. A
						step with several fields has a <strong class="font-semibold">Copy</strong> button for each.
						Your progress is kept on this device.
					</li>
					<li>
						Fix anything flagged <strong class="font-semibold">Resolve before saving</strong> or
						<strong class="font-semibold">No Karl field for this content</strong> before you publish.
					</li>
				</ol>
			</div>
		</div>
	</details>
</section>
