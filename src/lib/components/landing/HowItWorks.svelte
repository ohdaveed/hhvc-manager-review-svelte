<script lang="ts">
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { sessionStore } from '$lib/stores/session.svelte';

	const steps = [
		'Open a page from the queue. Each mockup renders the way it would appear on SF.gov.',
		'Read it and edit the copy inline. An AI rewrite can suggest alternatives for any field.',
		'Record a decision: approved, needs revision or blocked, with a note for the content team.',
		'Move on to the next undecided page until every page has a decision.'
	];

	/**
	 * Open for a visitor finding out what the tool is; closed for a reviewer who
	 * came back to carry on.
	 *
	 * Signed in is the returning case by definition, and four paragraphs of
	 * onboarding above the page list works against the hero card's "pick up where
	 * you left off" job on every visit after the first.
	 *
	 * Starts CLOSED rather than open, and opens only once the session resolves to
	 * signed out. `sessionStore.knownSignedOut` is false during the initial check
	 * as well as when signed in -- it exists for exactly this flash, and the
	 * signed-in reviewer is who must not see one. A signed-out visitor gets the
	 * explainer a beat late instead, which is the cheaper of the two.
	 *
	 * `latched` and `touched` are plain `let`, not `$state`, so reading them here
	 * creates no dependency and the effect settles the initial state ONCE. Without
	 * that, a reviewer who collapsed this would have it reopened under them the
	 * next time the session re-resolved -- `onAuthStateChange` fires on token
	 * refresh, not just sign-in.
	 */
	let open = $state(false);
	let latched = false;
	let touched = false;

	$effect(() => {
		if (latched || touched || sessionStore.signedIn === undefined) return;
		latched = true;
		open = sessionStore.knownSignedOut;
	});
</script>

<details
	bind:open
	ontoggle={() => (touched = true)}
	class="group rounded-[3px] border border-sfds-grey-l2 bg-white"
>
	<!-- The h2 sits inside the summary so the heading stays in the document
	     outline and the summary still provides the control's accessible name.
	     `marker:content-none` removes the default triangle in favour of the
	     chevron, which rotates -- an affordance a disclosure needs either way. -->
	<summary
		class="flex cursor-pointer list-none items-center justify-between gap-3 rounded-[3px] px-4 py-3 marker:content-none hover:bg-sfds-blue-l1/60 focus-visible:ring-2 focus-visible:ring-sfds-action focus-visible:outline-none"
	>
		<h2 id="how-it-works" class="text-lg font-semibold text-slate-900">How it works</h2>
		<ChevronDown
			class="size-4 shrink-0 text-sfds-slate-l3 transition-transform group-open:rotate-180"
			aria-hidden="true"
		/>
	</summary>
	<ol class="list-decimal space-y-2 px-4 pt-1 pb-4 pl-9 text-slate-800">
		{#each steps as step (step)}
			<li>{step}</li>
		{/each}
	</ol>
</details>
