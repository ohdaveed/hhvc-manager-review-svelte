<script lang="ts">
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';

	let {
		approved,
		onShowApproved
	}: {
		/** Approved pages in the loaded review; `undefined` signed out or still loading. */
		approved: number | undefined;
		/** Filters the page list below to approved pages. */
		onShowApproved: () => void;
	} = $props();
</script>

<!-- Always open, unlike How it works: this is the tool's second job, and a
     returning reviewer is exactly who needs reminding it exists. Before it,
     the only way to learn of the walkthrough was to open the toolbar's Karl
     disclosure. -->
<section
	aria-labelledby="karl-walkthrough-guide"
	class="rounded-[3px] border border-sfds-grey-l2 bg-white px-4 py-3"
>
	<h2
		id="karl-walkthrough-guide"
		class="flex items-center gap-2 text-lg font-semibold text-slate-900"
	>
		<ClipboardList class="size-5 shrink-0 text-sfds-action" aria-hidden="true" />
		Move a page into Karl
	</h2>
	<p class="mt-1 text-sm text-slate-800">
		The Karl walkthrough rebuilds a page in Karl, SF.gov’s content system, one field at a time, so
		nothing is retyped and nothing is missed.
	</p>
	<ol class="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-800">
		<li>Open a page, ideally an approved one.</li>
		<li>
			Select <strong class="font-semibold">Karl walkthrough</strong> in the bar above the mockup, or
			<strong class="font-semibold">Start the Karl walkthrough</strong> under the decision.
		</li>
		<li>
			Use <strong class="font-semibold">Open Karl add-page form</strong> to start the page in Karl,
			then follow the steps: each names the Karl field and has a
			<strong class="font-semibold">Copy</strong> button for its text.
		</li>
		<li>
			Paste it into Karl and choose <strong class="font-semibold">Mark copied · next</strong>. Your
			progress is kept on this device.
		</li>
		<li>
			Fix anything flagged <strong class="font-semibold">Resolve before saving</strong> or
			<strong class="font-semibold">No Karl field for this content</strong> before you publish.
		</li>
	</ol>
	{#if approved !== undefined}
		<p class="mt-3 text-sm text-slate-800">
			{#if approved > 0}
				<button
					type="button"
					class="font-semibold text-sfds-action underline underline-offset-2"
					onclick={onShowApproved}
				>
					Show the {approved} approved {approved === 1 ? 'page' : 'pages'}
				</button>
				ready to move.
			{:else}
				No page is approved yet. Approve one first, or try the walkthrough on any page.
			{/if}
		</p>
	{/if}
</section>
