<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { isStaleDraft, retryDraft, type DraftPage } from '$lib/stores/draftPages';

	let { draft }: { draft: DraftPage } = $props();

	// `isStaleDraft` is a pure function of the clock, so the clock has to tick:
	// a row that goes stale while this is on screen must swap its spinner for a
	// retry without a reload.
	let now = $state(Date.now());
	let userId = $state<string | undefined>(undefined);
	let retrying = $state(false);
	let retryError = $state(false);

	onMount(() => {
		const timer = setInterval(() => (now = Date.now()), 5000);
		supabase.auth.getSession().then(({ data }) => (userId = data.session?.user?.id));
		return () => clearInterval(timer);
	});

	const stale = $derived(isStaleDraft(draft, now));
	const inProgress = $derived((draft.state === 'drafting' && !stale && !retryError) || retrying);
	// Never for `ready`: the route would accept the flip to `failed`, the
	// interface should not invite it.
	// A retry whose save failed leaves a fresh `drafting` row, so the error that
	// names the retry has to bring the button back rather than wait out staleness.
	const canRetry = $derived(
		draft.state !== 'ready' && (draft.state === 'failed' || stale || retryError)
	);
	// No user-id-to-name lookup exists, so only the author's own drafts say who asked.
	const mine = $derived(userId !== undefined && draft.created_by === userId);

	async function retry() {
		retrying = true;
		retryError = false;
		try {
			await retryDraft(draft);
		} catch (err) {
			console.error('Draft retry failed:', err);
			retryError = true;
		} finally {
			retrying = false;
		}
	}
</script>

<aside
	class="space-y-2 border-b border-sfds-action/30 bg-sfds-blue-l1 px-5 py-3 text-sm text-sfds-black"
	aria-label="AI draft"
>
	<p class="font-semibold">
		AI draft{#if mine}
			<span class="font-normal"> · requested by you</span>{/if}
	</p>
	<p>
		<span class="text-sfds-slate-l3">From the description:</span>
		{draft.description}
	</p>
	{#if draft.model}
		<p class="text-xs text-sfds-slate-l3">Model: {draft.model}</p>
	{/if}

	<!-- Persistent live region: one inserted already populated is announced
	     unreliably, so the element stays and only its text changes. `empty:sr-only`
	     keeps it in the accessibility tree without leaving a phantom vertical gap. -->
	<p role="status" class="flex items-center gap-2 font-semibold empty:sr-only">
		{#if inProgress}<span
				class="inline-block size-2 flex-none rounded-full bg-sfds-action motion-safe:animate-pulse"
				aria-hidden="true"
			></span>Drafting this page…{/if}
	</p>
	{#if !inProgress}
		{#if draft.state === 'failed'}
			<p role="alert" class="font-semibold text-sfds-red">The draft could not be generated.</p>
		{:else if stale}
			<p class="font-semibold">This draft stopped before finishing.</p>
		{/if}
	{/if}

	{#if draft.state === 'ready' && draft.valid === false}
		<div>
			<p class="font-semibold">This draft did not pass validation. Edit it before approving.</p>
			{#if draft.issues?.length}
				<ul class="list-disc pl-5">
					{#each draft.issues as issue (issue)}
						<li>{issue}</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}

	{#if canRetry && !retrying}
		<button
			type="button"
			class="rounded-[3px] border border-sfds-action px-3 py-1 font-semibold text-sfds-action hover:bg-white"
			onclick={retry}
		>
			Retry
		</button>
	{/if}
	{#if retryError}
		<p role="alert" class="text-sfds-red">The retry could not be saved. Try again.</p>
	{/if}
</aside>
