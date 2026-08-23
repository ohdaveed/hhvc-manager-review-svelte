<script lang="ts">
	import { page as routePage } from '$app/stores';
	import { resolve } from '$app/paths';
	import { pagesStore, editsStore, QUEUE_STATUS_ORDER } from '$lib/stores/reviewState';
	import { pageStore } from '$lib/stores/pageData.svelte';

	// The pages table has no title column, so a hydrated row carries only `path`.
	// Titles come from the static corpus, whose derived id is that same path.
	const corpusFor = (path: string) => pageStore.pages.find((p) => p.id === path);
	const titleFor = (path: string) => corpusFor(path)?.title ?? path;

	// The store automatically updates via Supabase realtime subscriptions.
	//
	// Presentation only. The ORDER comes from `QUEUE_STATUS_ORDER`, so this and
	// anything that needs to name the queue's first page cannot disagree about
	// which row that is.
	const PRESENTATION = {
		'needs-review': { heading: 'Needs review', dot: 'bg-sfds-action', bar: 'bg-sfds-grey-l2' },
		approved: { heading: 'Approved', dot: 'bg-sfds-green', bar: 'bg-sfds-green' },
		revise: { heading: 'Needs revision', dot: 'bg-sfds-amber', bar: 'bg-sfds-amber' },
		blocked: { heading: 'Blocked', dot: 'bg-sfds-red', bar: 'bg-sfds-red' }
	};

	const groups = QUEUE_STATUS_ORDER.map((status) => ({ status, ...PRESENTATION[status] }));

	// Decided = anything a reviewer has ruled on. `needs-review` is the initial
	// status every seeded row carries, so it is the only one that is not a
	// decision -- counting it would show the review as complete on load.
	const decided = $derived($pagesStore.filter((p) => p.status !== 'needs-review').length);
	const total = $derived($pagesStore.length);
	const pct = $derived(total === 0 ? 0 : Math.round((decided / total) * 100));

	// One edit row per (page, field) -- `saveInlineEdit` replaces rather than
	// appends locally, so this counts fields touched, not saves made.
	const editCount = (pageId: string) => $editsStore.filter((e) => e.page_id === pageId).length;

	const share = (status: string) =>
		total === 0 ? 0 : ($pagesStore.filter((p) => p.status === status).length / total) * 100;
</script>

<nav class="space-y-5 px-5 pt-4 pb-6" aria-label="Review queue">
	<!-- If empty (e.g. testing without DB), show a fallback message -->
	{#if total === 0}
		<p class="text-muted-foreground text-sm italic">No pages loaded. (Waiting for Supabase data)</p>
	{:else}
		<section aria-label="Review progress">
			<div class="flex items-baseline justify-between">
				<span class="text-sfds-black text-[13px] font-semibold">
					{decided} of {total} decided
				</span>
				<span class="text-sfds-slate-l2 text-[13px] font-semibold tabular-nums">{pct}%</span>
			</div>

			<!-- Three segments over a grey track, so the shape of the remaining work
			     is visible rather than just its size. `role="img"` with a label:
			     a bar split by colour alone says nothing to a screen reader. -->
			<div
				class="bg-sfds-grey-l2 mt-2 flex h-1.5 w-full overflow-hidden rounded-full"
				role="img"
				aria-label="{decided} of {total} pages decided, {pct} percent"
			>
				{#each groups.filter((g) => g.status !== 'needs-review') as g (g.status)}
					<div class={g.bar} style="width: {share(g.status)}%"></div>
				{/each}
			</div>
		</section>
	{/if}

	{#each groups as group (group.status)}
		{@const pages = $pagesStore.filter((p) => p.status === group.status)}
		{#if pages.length > 0}
			<section>
				<h3 class="mb-2 flex items-center justify-between">
					<span class="text-sfds-slate-l2 text-[11px] font-bold tracking-[0.08em] uppercase">
						{group.heading}
					</span>
					<span
						class="bg-sfds-grey-l2/70 text-sfds-black inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums"
					>
						{pages.length}
					</span>
				</h3>
				<ul class="space-y-0.5">
					{#each pages as p (p.path)}
						{@const isCurrent = $routePage.params.slug === p.path}
						{@const edits = editCount(p.id)}
						<li>
							<!-- A left border rather than a filled row: the fill would compete
							     with the selected-field highlight in the canvas, and there are
							     two selections on screen at once. -->
							<a
								href={resolve('/review/[slug]', { slug: p.path })}
								aria-current={isCurrent ? 'page' : undefined}
								class="hover:bg-sfds-blue-l1/60 block rounded-[3px] border-l-2 py-1.5 pr-2 pl-2.5 transition-colors {isCurrent
									? 'border-sfds-action bg-sfds-blue-l1'
									: 'border-transparent'}"
							>
								<span class="flex items-start gap-2">
									<span
										class="mt-1.5 inline-block size-2 shrink-0 rounded-full {group.dot}"
										aria-hidden="true"
									></span>
									<span class="min-w-0">
										<span
											class="text-sfds-black block text-[13px] leading-[18px] {isCurrent
												? 'font-semibold'
												: ''}"
										>
											{titleFor(p.path)}
										</span>
										{#if corpusFor(p.path)?.type || edits > 0}
											<span class="text-sfds-slate-l2 mt-0.5 block text-[11px] leading-[14px]">
												{corpusFor(p.path)?.type ?? ''}{corpusFor(p.path)?.type && edits > 0
													? ' · '
													: ''}{edits > 0
													? `${edits} edited ${edits === 1 ? 'field' : 'fields'}`
													: ''}
											</span>
										{/if}
									</span>
								</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/each}
</nav>
