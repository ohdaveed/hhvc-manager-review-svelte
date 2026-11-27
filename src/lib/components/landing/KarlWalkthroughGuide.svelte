<script lang="ts">
	import { resolve } from '$app/paths';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { reviewHrefFor } from '$lib/corpus/draftPath';
	import { WALKTHROUGH_QUERY } from '$lib/karl/walkthroughLink';

	let {
		approved,
		onShowApproved
	}: {
		/**
		 * The approved pages in the loaded review, in queue order, as `pages.path`
		 * and title; `undefined` signed out or while the review is loading.
		 */
		approved: { path: string; title: string }[] | undefined;
		/** Filters the page list below to approved pages. */
		onShowApproved: () => void;
	} = $props();

	/**
	 * How many approved pages get a link of their own. More than this and the
	 * section stops being instructions and becomes a second page list, which
	 * already exists below with an Approved filter.
	 */
	const SHOWN = 5;
	const shown = $derived(approved?.slice(0, SHOWN) ?? []);

	/**
	 * Open once there is something to move, closed until then.
	 *
	 * It used to be always open, and with nothing approved it was five steps of
	 * instructions for a job the reviewer cannot do yet, sitting above All pages:
	 * measured 2026-11-26 with 0 of 38 decided, the list started at y=1081 on a
	 * 900px desktop screen and y=1781 on a 375px phone. Once a page is approved
	 * the section carries its "Ready to move" links, which is when a returning
	 * reviewer needs reminding the walkthrough exists.
	 *
	 * Settles once, the same way How it works does: `latched` and `touched` are
	 * plain `let`s so the effect does not re-run on them, and a reviewer's own
	 * toggle is never overridden by a later store update.
	 */
	let open = $state(false);
	let latched = false;
	let touched = false;
	$effect(() => {
		if (latched || touched || approved === undefined) return;
		latched = true;
		open = approved.length > 0;
	});
</script>

<!-- A disclosure, like How it works, so the page keeps one pattern. The
     `<section>` around it keeps the region and its name when it is closed:
     a closed `<details>` drops its contents from the accessibility tree, but
     the summary, and the heading inside it, stay. -->
<section
	aria-labelledby="karl-walkthrough-guide"
	class="rounded-[3px] border border-sfds-grey-l2 bg-white"
>
	<details bind:open ontoggle={() => (touched = true)} class="group">
		<summary
			class="flex cursor-pointer list-none items-center justify-between gap-3 rounded-[3px] px-4 py-3 marker:content-none hover:bg-sfds-blue-l1/60 focus-visible:ring-2 focus-visible:ring-sfds-action focus-visible:outline-none"
		>
			<h2
				id="karl-walkthrough-guide"
				class="flex items-center gap-2 text-lg font-semibold text-slate-900"
			>
				<ClipboardList class="size-5 shrink-0 text-sfds-action" aria-hidden="true" />
				Move a page into Karl
			</h2>
			<ChevronDown
				class="size-4 shrink-0 text-sfds-slate-l3 transition-transform group-open:rotate-180"
				aria-hidden="true"
			/>
		</summary>
		<div class="px-4 pb-4">
			<p class="text-sm text-slate-800">
				The Karl walkthrough rebuilds a page in Karl, SF.gov’s content system, one field at a time,
				so nothing is retyped and nothing is missed.
			</p>
			<ol class="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-800">
				<li>Open a page, ideally an approved one.</li>
				<li>
					Select <strong class="font-semibold">Start the Karl walkthrough</strong> in the review panel,
					under the decision.
				</li>
				<li>
					Use <strong class="font-semibold">Open Karl add-page form</strong> to start the page in Karl,
					then follow the steps: each names the Karl field, and the mockup scrolls to the section it comes
					from.
				</li>
				<li>
					Choose <strong class="font-semibold">Copy &amp; next</strong> and paste into Karl. A step
					with several fields has a <strong class="font-semibold">Copy</strong> button for each. Your
					progress is kept on this device.
				</li>
				<li>
					Fix anything flagged <strong class="font-semibold">Resolve before saving</strong> or
					<strong class="font-semibold">No Karl field for this content</strong> before you publish.
				</li>
			</ol>
			{#if approved !== undefined}
				{#if approved.length > 0}
					<!-- Each link opens the page with the walkthrough already running:
			     `?view=walkthrough` is the deep link the review layout reads. -->
					<h3 class="mt-4 text-sm font-semibold text-slate-900">Ready to move</h3>
					<ul class="mt-2 divide-y divide-sfds-grey-l2 rounded-[3px] border border-sfds-grey-l2">
						{#each shown as page (page.path)}
							<li>
								<!-- Named once: the visible title plus a hidden repeat read the
						     page's name twice, and made it a second link matching the page
						     list's own. The name keeps the visible words (WCAG 2.5.3). -->
								<a
									href="{resolve(reviewHrefFor(page.path))}{WALKTHROUGH_QUERY}"
									aria-label="Open walkthrough: {page.title}"
									class="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-sfds-blue-l1/60 focus-visible:ring-2 focus-visible:ring-sfds-action focus-visible:outline-none"
								>
									<span class="min-w-0 font-medium text-slate-900">{page.title}</span>
									<span class="flex flex-none items-center gap-1 font-semibold text-sfds-action">
										Open walkthrough
										<ArrowRight class="size-4" aria-hidden="true" />
									</span>
								</a>
							</li>
						{/each}
					</ul>
					{#if approved.length > SHOWN}
						<p class="mt-2 text-sm">
							<button
								type="button"
								class="font-semibold text-sfds-action underline underline-offset-2"
								onclick={onShowApproved}
							>
								Show all {approved.length} approved pages
							</button>
						</p>
					{/if}
				{:else}
					<p class="mt-3 text-sm text-slate-800">
						No page is approved yet. Approve one first, or try the walkthrough on any page.
					</p>
				{/if}
			{/if}
		</div>
	</details>
</section>
