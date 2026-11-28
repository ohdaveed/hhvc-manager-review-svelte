<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import Minus from '@lucide/svelte/icons/minus';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import { onDestroy } from 'svelte';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { latestByField } from '$lib/corpus/overlay';
	import { pageStore } from '$lib/stores/pageData.svelte';
	import { editsStore, pagesStore, updatePageNotes } from '$lib/stores/reviewState';

	let {
		pageData,
		openIssues = null
	}: {
		pageData?: { id?: string } | null;
		/** Checks still open on the Fix tab, for the drafted note. `null`: not known. */
		openIssues?: number | null;
	} = $props();

	let liveRecord = $derived($pagesStore.find((p) => p.path === pageData?.id));

	// Sending a page back without saying why leaves the content team guessing,
	// so the hint says the feedback is needed. Shown, not enforced: the decision
	// is already recorded, and the reviewer may be about to type.
	const sendingBack = $derived(liveRecord?.status === 'revise' || liveRecord?.status === 'blocked');

	let notesValue = $state('');
	let debounceTimeout: ReturnType<typeof setTimeout> | undefined;
	let lastRecordId = $state<string | undefined>(undefined);
	let notesError = $state(false);
	// Success feedback for the autosave. Failures already had `notesError`;
	// before this a successful save showed nothing at all.
	let notesStatus = $state<'idle' | 'saving' | 'saved'>('idle');
	let savedTimeout: ReturnType<typeof setTimeout> | undefined;

	const missing = $derived(sendingBack && notesValue.trim() === '');

	const markSaved = () => {
		notesStatus = 'saved';
		clearTimeout(savedTimeout);
		savedTimeout = setTimeout(() => (notesStatus = 'idle'), 3000);
	};

	// Cancelling on teardown silently threw away whatever the reviewer had typed
	// in the last 500ms before navigating -- or before switching tab, which
	// unmounts this panel just the same. Flush it instead.
	let pendingNote: { pageId: string; value: string } | null = null;

	onDestroy(() => {
		clearTimeout(debounceTimeout);
		clearTimeout(savedTimeout);
		if (pendingNote) updatePageNotes(pendingNote.pageId, pendingNote.value);
	});

	let lastSyncedNotes = $state('');

	// Sync local notesValue when the live record identity changes, or when
	// manager_notes updates externally (e.g. from Rethink) while no local edit
	// debounce is pending.
	$effect(() => {
		const id = liveRecord?.id;
		const remoteNotes = liveRecord?.manager_notes ?? '';
		if (id !== lastRecordId) {
			lastRecordId = id;
			lastSyncedNotes = remoteNotes;
			notesValue = remoteNotes;
			notesError = false;
			pendingNote = null;
			// A write still in flight for the page just left must not report
			// "Saved" here; the guards below also check `lastRecordId`.
			clearTimeout(savedTimeout);
			notesStatus = 'idle';
		} else if (remoteNotes !== lastSyncedNotes) {
			lastSyncedNotes = remoteNotes;
			if (!pendingNote && notesStatus !== 'saving') {
				notesValue = remoteNotes;
			}
		}
	});

	/** Re-send the note the debounce already gave up on. */
	const retryNotes = async () => {
		const id = liveRecord?.id;
		if (!id) return;
		notesError = false;
		notesStatus = 'saving';
		const saved = await updatePageNotes(id, notesValue);
		if (lastRecordId !== id) return;
		if (saved) markSaved();
		else {
			notesError = true;
			notesStatus = 'idle';
		}
	};

	const setNotes = (value: string) => {
		notesValue = value;

		// Capture the page ID and note value now so the callback is bound to
		// the current page even if navigation changes liveRecord before it fires.
		const capturedId = liveRecord?.id;
		const capturedValue = notesValue;
		if (!capturedId) return;
		clearTimeout(debounceTimeout);
		clearTimeout(savedTimeout);
		notesStatus = 'saving';
		pendingNote = { pageId: capturedId, value: capturedValue };
		debounceTimeout = setTimeout(async () => {
			if (!capturedId) return;
			pendingNote = null;
			notesError = false;
			const saved = await updatePageNotes(capturedId, capturedValue);
			// Only surface the failure if this is still the page on screen and the
			// reviewer has not typed since; otherwise a newer write owns the field.
			// The same guard decides whether "Saved" is ours to announce.
			if (lastRecordId === capturedId && notesValue === capturedValue) {
				if (saved) markSaved();
				else {
					notesError = true;
					notesStatus = 'idle';
				}
			}
		}, 500);
	};

	const onNotesInput = (e: Event) => setNotes((e.target as HTMLTextAreaElement).value);

	// ---- Your changes ------------------------------------------------------
	//
	// What the reviewer did to the copy on this page: the newest saved edit per
	// field, and anything typed and not saved yet. Named by the new wording,
	// which is what the reviewer will recognise; a field id would mean nothing.
	const excerpt = (text: string) => {
		const flat = text.replace(/\s+/g, ' ').trim();
		return flat.length > 70 ? `${flat.slice(0, 69).trimEnd()}…` : flat;
	};

	const log = $derived.by(() => {
		const id = liveRecord?.id;
		if (!id || !pageData?.id) return [];
		const unsaved = pageStore.unsavedChangesOn(pageData.id);
		const pending = new Set(unsaved.map((c) => c.fieldId));
		const saved = [...latestByField($editsStore.filter((e) => e.page_id === id)).values()]
			.filter((e) => !pending.has(e.field_id))
			.map((e) => ({ key: `s:${e.field_id}`, saved: true, text: excerpt(e.new_content) }));
		return [
			...saved,
			...unsaved.map((c) => ({ key: `u:${c.fieldId}`, saved: false, text: excerpt(c.value) }))
		];
	});

	/** A starting point written from the log, for the reviewer to edit. No model call. */
	function draftFromChanges() {
		const saved = log.filter((l) => l.saved);
		const unsaved = log.length - saved.length;
		const lines = [
			saved.length > 0
				? `I edited ${saved.length} ${saved.length === 1 ? 'field' : 'fields'} on this page:`
				: 'I have not changed the copy on this page.',
			...saved.map((l) => `• ${l.text}`)
		];
		if (unsaved > 0)
			lines.push(
				'',
				`${unsaved} more ${unsaved === 1 ? 'change is' : 'changes are'} not saved yet.`
			);
		if (openIssues)
			lines.push('', `Still open: ${openIssues} ${openIssues === 1 ? 'check' : 'checks'}.`);
		setNotes(lines.join('\n'));
	}
</script>

<div class="flex flex-col gap-2.5 p-3">
	<div
		class="flex flex-col gap-2.5 rounded-xl bg-white p-3.5 shadow-[0_0_0_1px_var(--color-sfds-grey-l2)]"
	>
		<div class="flex items-baseline justify-between gap-2">
			<label for="notes" class="font-semibold">Feedback</label>
			<span class="flex items-baseline gap-2">
				{#if missing}
					<span class="text-[0.8125rem] font-semibold text-sfds-red">Required to send back</span>
				{/if}
				<span aria-live="polite" class="text-[0.8125rem] text-sfds-slate-l3">
					{notesStatus === 'saving' ? 'Saving…' : notesStatus === 'saved' ? 'Saved' : ''}
				</span>
				{#if notesError}
					<!-- The word is the control: "Not saved — retry" as plain text
					     named an action the UI did not offer. -->
					<button
						type="button"
						class="text-[0.8125rem] font-semibold text-destructive underline underline-offset-2"
						onclick={retryNotes}
					>
						Not saved — retry
					</button>
				{/if}
			</span>
		</div>
		<Textarea
			id="notes"
			rows={9}
			placeholder="Notes for the page owner, or for yourself"
			value={notesValue}
			aria-invalid={notesError}
			oninput={onNotesInput}
			disabled={!liveRecord}
			class="min-h-48 text-[0.9375rem] leading-normal disabled:opacity-100"
		/>
		<!-- The sparkle marks a shortcut, not a model: this writes from the list
		     below and never leaves the browser. -->
		<button
			type="button"
			onclick={draftFromChanges}
			disabled={!liveRecord}
			class="inline-flex min-h-9 items-center gap-1.5 self-start rounded-full bg-sfds-blue-l1 px-3 text-[0.8125rem] font-semibold text-sfds-blue-dark hover:bg-sfds-blue-l2/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sfds-black disabled:text-sfds-slate-l3"
		>
			<Sparkles class="size-3.5" aria-hidden="true" />
			Draft from my changes
		</button>
	</div>

	<section
		class="overflow-hidden rounded-xl bg-white shadow-[0_0_0_1px_var(--color-sfds-grey-l2)]"
		aria-labelledby="your-changes"
	>
		<h3 id="your-changes" class="flex min-h-11 items-center px-3.5 font-semibold">
			Your changes{log.length > 0 ? ` (${log.length})` : ''}
		</h3>
		{#if log.length > 0}
			<ul>
				{#each log as entry (entry.key)}
					<li
						class="flex min-h-11 items-center gap-2.5 border-t border-sfds-grey-l2 px-3.5 py-2 text-sm"
					>
						<span
							class="flex size-[1.375rem] flex-none items-center justify-center rounded-full {entry.saved
								? 'bg-sfds-green-l1 text-sfds-green'
								: 'bg-sfds-grey-l2 text-sfds-slate-l3'}"
							aria-hidden="true"
						>
							{#if entry.saved}<Check class="size-3.5" />{:else}<Minus class="size-3.5" />{/if}
						</span>
						<span class="min-w-0 flex-1">
							<span class="sr-only">{entry.saved ? 'Saved edit:' : 'Not saved yet:'}</span>
							{entry.text}
							{#if !entry.saved}
								<span class="block text-xs text-sfds-slate-l3" aria-hidden="true"
									>Not saved yet</span
								>
							{/if}
						</span>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="px-3.5 pb-3.5 text-sm text-sfds-slate-l3">
				Changes you make on the Fix tab show up here.
			</p>
		{/if}
	</section>
</div>
