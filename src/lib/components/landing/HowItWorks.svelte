<script lang="ts">
	const steps = [
		'Open a page from the queue. Each mockup renders the way it would appear on SF.gov.',
		'Read it and edit the copy inline. An AI rewrite can suggest alternatives for any field.',
		'Record a decision: approved, needs revision or blocked, with a note for the content team.',
		'Move on to the next undecided page until every page has a decision.'
	];
</script>

<section aria-labelledby="how-it-works">
	<h2 id="how-it-works" class="mb-3 text-lg font-semibold text-slate-900">How it works</h2>
	<ol class="list-decimal space-y-2 pl-5 text-slate-800">
		{#each steps as step (step)}
			<li>{step}</li>
		{/each}
	</ol>
</section>
