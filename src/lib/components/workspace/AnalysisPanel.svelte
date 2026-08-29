<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { ExternalLink } from 'lucide-svelte';
	import { tick } from 'svelte';
	import { analyzePage, karlHelp, SFGOV_READING_GUIDELINE, type Finding } from '$lib/analysis';
	import { MOCKUP_ROOT_SELECTOR } from '$lib/analysis/domChecks';
	import type { EditRow } from '$lib/analysis/pageCopy';
	import { editsStore, pagesStore } from '$lib/stores/reviewState';

	// `ReviewWorkspace` declares `pageData` as `unknown` and every sibling panel
	// takes it untyped, so it is accepted as `unknown` and narrowed here rather
	// than widening the call site's type for one consumer.
	let { pageData }: { pageData?: unknown } = $props();

	const page = $derived(
		pageData && typeof pageData === 'object' ? (pageData as Record<string, unknown>) : undefined
	);

	/**
	 * The rendered mockup, for the markup checks.
	 *
	 * Held in state and refreshed after a tick rather than read inside the
	 * derived analysis: `#mockPage` lives in the review layout, so on a slug
	 * change the panel and the mockup re-render together and a synchronous read
	 * would measure the OUTGOING page's headings against the incoming page's
	 * copy. The copy checks need no such wait — they read the corpus.
	 */
	let mockupRoot = $state<ParentNode | null>(null);

	$effect(() => {
		const id = page?.id;
		let cancelled = false;
		tick().then(() => {
			if (cancelled) return;
			// `id` is read above so this effect re-runs per page; referenced here
			// so it is not mistaken for a dead subscription.
			void id;
			mockupRoot = document.querySelector(MOCKUP_ROOT_SELECTOR);
		});
		return () => {
			cancelled = true;
		};
	});

	// The reviewer's saved edits for this page, folded the way `HelpPanel` folds
	// them: append-only, last-write-wins, ordered explicitly by `created_at`.
	const edits = $derived.by((): EditRow[] => {
		const livePage = $pagesStore.find((p) => p.path === page?.id);
		if (!livePage) return [];
		return $editsStore
			.filter((e) => e.page_id === livePage.id)
			.map((e) => ({
				field_id: e.field_id,
				new_content: e.new_content,
				created_at: e.created_at
			}));
	});

	const analysis = $derived(
		page ? analyzePage({ page: page as never, edits, root: mockupRoot }) : null
	);

	const issues = $derived(analysis?.findings.filter((f) => f.status === 'issue') ?? []);
	const passes = $derived(analysis?.findings.filter((f) => f.status === 'pass') ?? []);
	const unavailable = $derived(analysis?.findings.filter((f) => f.status === 'unavailable') ?? []);

	/**
	 * Where the score sits on a 0-14 track. Clamped, because Post-graduate is an
	 * open-ended bucket and a 17 would otherwise run off the end of the bar.
	 */
	const scorePercent = $derived(
		Math.min(100, Math.max(0, ((analysis?.readability.score ?? 0) / 14) * 100))
	);

	const scoreTone = $derived.by(() => {
		const a = analysis;
		if (!a || !a.readability.hasContent) return 'bg-muted-foreground';
		if (a.targetStatus === 'pass') return 'bg-emerald-500';
		if (a.readability.score <= SFGOV_READING_GUIDELINE + 3) return 'bg-amber-500';
		return 'bg-destructive';
	});

	const statusBadge = (status: Finding['status']) =>
		status === 'issue' ? 'destructive' : status === 'pass' ? 'secondary' : 'outline';

	const statusLabel = (status: Finding['status']) =>
		status === 'issue' ? 'Check' : status === 'pass' ? 'Pass' : 'No data';
</script>

<!-- Every anchor in this file is a citation: an absolute URL into the Karl
     Editor Help Center, opened in a new tab. `resolve()` exists to turn this
     app's own route ids into paths and has nothing to say about an external
     host, and the next-line form of this directive is not honoured inside a
     `{#snippet}` fragment, so the rule is turned off for the file. If an
     internal link is ever added here, re-scope this. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

{#snippet helpLink(key: Parameters<typeof karlHelp>[0])}
	{@const help = karlHelp(key)}
	<a
		class="inline-flex items-start gap-1 text-xs leading-snug font-semibold text-sfds-action hover:underline"
		href={help.url}
		target="_blank"
		rel="noopener noreferrer"
	>
		<ExternalLink class="mt-[1px] size-3 flex-none" aria-hidden="true" />
		<span>
			{help.title}<span class="font-normal text-muted-foreground">{` — ${help.why}`}</span>
		</span>
	</a>
{/snippet}

{#snippet findingCard(finding: Finding)}
	<Card.Root size="sm">
		<Card.Content class="space-y-2">
			<div class="flex items-start gap-2">
				<Badge variant={statusBadge(finding.status)} class="mt-[2px] flex-none">
					{statusLabel(finding.status)}
				</Badge>
				<div class="min-w-0 flex-1">
					<p class="text-sm font-semibold">{finding.title}</p>
					<p class="mt-0.5 text-xs text-muted-foreground">{finding.summary}</p>
				</div>
			</div>

			{#if finding.items.length > 0}
				<ul class="space-y-1.5 border-l-2 border-amber-300 pl-3">
					{#each finding.items as item, i (i)}
						<li class="text-xs">
							<span class="rounded bg-muted px-1 py-0.5 font-mono break-all">{item.text}</span>
							{#if item.detail}
								<span class="block text-muted-foreground">{item.detail}</span>
							{/if}
							{#if item.key}
								<span class="block font-mono text-[10px] break-all text-muted-foreground/70">
									{item.key}
								</span>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}

			{@render helpLink(finding.help)}
		</Card.Content>
	</Card.Root>
{/snippet}

<div class="space-y-4 p-4">
	{#if !analysis}
		<p class="text-sm text-muted-foreground">No page selected.</p>
	{:else}
		<!-- Readability -->
		<Card.Root size="sm">
			<Card.Header>
				<Card.Title>Readability</Card.Title>
				<Card.Description>
					Automated Readability Index, the same calculation Karl Jr. uses — not Hemingway.
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-3">
				{#if !analysis.readability.hasContent}
					<p class="text-sm text-muted-foreground">Not enough text on this page to score.</p>
				{:else}
					<div class="flex items-baseline gap-3">
						<span class="font-heading text-4xl leading-none font-bold">
							{analysis.readability.score}
						</span>
						<div class="min-w-0">
							<p class="text-sm font-semibold">{analysis.readability.gradeLevel}</p>
							<p class="text-xs text-muted-foreground">{analysis.readability.interpretation}</p>
						</div>
					</div>

					<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
						<div
							class="h-full rounded-full {scoreTone}"
							style="width: {scorePercent}%"
							role="presentation"
						></div>
					</div>

					<div class="flex flex-wrap items-center gap-2">
						{#if analysis.target !== null}
							<Badge variant={analysis.targetStatus === 'pass' ? 'secondary' : 'destructive'}>
								{analysis.targetStatus === 'pass' ? 'Meets' : 'Over'} this page's target of grade {analysis.target}
							</Badge>
						{:else}
							<Badge variant="outline">No target declared in this page's corpus module</Badge>
						{/if}
						<Badge variant="outline">SF.gov guideline: grade {SFGOV_READING_GUIDELINE}</Badge>
					</div>

					<p class="text-sm">{analysis.readability.recommendation}</p>

					<ul class="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
						{#each analysis.readability.factors as factor, i (i)}
							<li>{factor}</li>
						{/each}
					</ul>

					<p class="text-[11px] leading-relaxed text-muted-foreground">
						Measured over {analysis.measuredFields} copy fields —
						{analysis.readability.wordCount} words, {analysis.readability.sentenceCount} sentences,
						{analysis.readability.wordsPerSentence.toFixed(1)} words per sentence.
						{#if analysis.readability.instructional}
							Scored on the instructional path (steps and bullets re-split), so this is not directly
							comparable to a page scored as prose.
						{/if}
					</p>

					{@render helpLink(analysis.readabilityHelp)}
				{/if}
			</Card.Content>
		</Card.Root>

		<Separator />

		{#if issues.length > 0}
			<div class="space-y-2">
				<h3 class="text-sm font-bold">Needs a look ({issues.length})</h3>
				{#each issues as finding (finding.id)}
					{@render findingCard(finding)}
				{/each}
			</div>
		{/if}

		{#if passes.length > 0}
			<div class="space-y-2">
				<h3 class="text-sm font-bold">Passing ({passes.length})</h3>
				{#each passes as finding (finding.id)}
					{@render findingCard(finding)}
				{/each}
			</div>
		{/if}

		{#if unavailable.length > 0}
			<div class="space-y-2">
				<h3 class="text-sm font-bold">Nothing to check ({unavailable.length})</h3>
				<p class="text-xs text-muted-foreground">
					These report no data rather than a pass — this mockup has nothing for them to look at.
				</p>
				{#each unavailable as finding (finding.id)}
					{@render findingCard(finding)}
				{/each}
			</div>
		{/if}

		<Separator />

		<p class="text-[11px] leading-relaxed text-muted-foreground">
			Copy checks read the corpus module, so they cover <strong
				>steps and cards the mockup does not render</strong
			>. Markup checks read the rendered page. Ported from the Karl Jr. browser extension, which
			cannot run on this app — its host permissions cover sf.gov only.
		</p>
		{@render helpLink('karlJr')}
	{/if}
</div>
