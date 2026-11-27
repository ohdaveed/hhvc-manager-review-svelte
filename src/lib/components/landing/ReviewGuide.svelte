<script lang="ts">
	import ChevronDown from '@lucide/svelte/icons/chevron-down';

	let {
		startOpen
	}: {
		/**
		 * Whether the guide should start open, or `undefined` while that is not
		 * known yet. The page decides: open for a reviewer who has decided
		 * nothing yet.
		 */
		startOpen: boolean | undefined;
	} = $props();

	const steps = [
		'Open a page from the list. Each mockup renders the way it would appear on SF.gov.',
		'Read it and edit the copy inline. An AI rewrite can suggest alternatives for any field.',
		'Record a decision: approve, revise or block, with feedback for the content team.',
		'Move on to the next undecided page until every page has a decision.'
	];

	/**
	 * One disclosure for both halves of the job, at the foot of the progress
	 * card. It replaces two cards (How it works, Move a page into Karl) that sat
	 * above the list and pushed it down the screen; an approved page's way into
	 * Karl is now on its own row in the list.
	 *
	 * Starts CLOSED and settles once `startOpen` is known. `latched` and
	 * `touched` are plain `let`, not `$state`, so the effect sets the initial
	 * state ONCE: a reviewer who collapsed this must not have it reopened when
	 * the session re-resolves (`onAuthStateChange` fires on token refresh).
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

<!-- A native `<details>`, like the list's sections, so the page has one
     disclosure pattern. The h2 sits inside the summary so it stays in the
     document outline and names the control. -->
<details bind:open ontoggle={() => (touched = true)} class="group">
	<summary
		class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 bg-slate-50 px-5 py-2.5 marker:content-none hover:bg-sfds-blue-l1/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sfds-black"
	>
		<h2 id="review-guide" class="font-medium text-slate-900">
			Review guide and moving pages into Karl
		</h2>
		<ChevronDown
			class="size-4 shrink-0 text-sfds-slate-l3 transition-transform group-open:rotate-180"
			aria-hidden="true"
		/>
	</summary>
	<div
		class="grid gap-x-8 gap-y-5 border-t border-sfds-grey-l2 px-5 py-4 text-sm text-slate-800 md:grid-cols-2"
	>
		<div>
			<h3 class="font-semibold text-slate-900">How the review works</h3>
			<ol class="mt-2 list-decimal space-y-2 pl-5">
				{#each steps as step (step)}
					<li>{step}</li>
				{/each}
			</ol>
		</div>
		<div>
			<h3 class="font-semibold text-slate-900">Move a page into Karl</h3>
			<p class="mt-2">
				The Karl walkthrough rebuilds a page in Karl, SF.gov’s content system, one field at a time,
				so nothing is retyped and nothing is missed.
			</p>
			<ol class="mt-2 list-decimal space-y-2 pl-5">
				<li>
					Approve the page, then choose <strong class="font-semibold">Move to Karl</strong> on its
					row in the list, or <strong class="font-semibold">Start the Karl walkthrough</strong> on the
					review panel’s Karl tab.
				</li>
				<li>
					Use <strong class="font-semibold">Open Karl add-page form</strong> to start the page in Karl,
					then follow the steps: each names the Karl field, and the mockup scrolls to the section it comes
					from.
				</li>
				<li>
					Choose <strong class="font-semibold">Copy &amp; next</strong> and paste into Karl. Your progress
					is kept on this device.
				</li>
				<li>
					Fix anything flagged <strong class="font-semibold">Resolve before saving</strong> or
					<strong class="font-semibold">No Karl field for this content</strong> before you publish.
				</li>
			</ol>
		</div>
	</div>
</details>
