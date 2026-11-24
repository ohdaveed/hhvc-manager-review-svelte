<script lang="ts">
	import { onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { MAX_DESCRIPTION_CHARS, reviewHrefFor } from '$lib/corpus/draftPath';
	import { createDraft, draftsStore } from '$lib/stores/draftPages';
	import { sessionStore } from '$lib/stores/session.svelte';

	let description = $state('');
	// True from the click until the row exists, which is what a double click needs
	// to be refused. It is deliberately NOT held while the model runs (up to a
	// minute): the queue row is the commitment, and the reviewer may leave.
	let busy = $state(false);
	let error = $state('');
	let confirmed = $state<{ path: string; failed: boolean } | undefined>();

	const over = $derived(description.length - MAX_DESCRIPTION_CHARS);
	const canSubmit = $derived(!busy && description.trim().length > 0 && over <= 0);
	const invalid = $derived(over > 0 || error !== '');

	// The count is read on demand (aria-describedby), never live-announced.
	const countText = $derived(
		over > 0
			? `${over} ${over === 1 ? 'character' : 'characters'} over the ${MAX_DESCRIPTION_CHARS.toLocaleString('en-US')} character limit. Shorten it to continue.`
			: `${(MAX_DESCRIPTION_CHARS - description.length).toLocaleString('en-US')} characters left`
	);

	// Each submission takes a number; only the latest may write form state. An
	// earlier draft settling late must not overwrite a newer draft's note or
	// reopen its double-click window. The earlier row is still in the queue and its
	// own page reports a failed draft, so its late failure is only warned.
	let latest = 0;
	let stopWatching = () => {};

	// Teardown: drop the store subscriber and invalidate in-flight handlers, so a
	// navigation mid-flight leaves nothing writing to a destroyed component.
	onDestroy(() => {
		latest++;
		stopWatching();
	});

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!canSubmit) return;
		const sent = description;
		const trimmed = sent.trim();
		const mine = ++latest;
		const current = () => mine === latest;
		busy = true;
		error = '';
		confirmed = undefined;

		function confirm(path: string) {
			if (!current() || confirmed) return;
			// Only clear what was sent: anything typed since is the reviewer's.
			if (description === sent) description = '';
			confirmed = { path, failed: false };
			busy = false;
		}

		// `createDraft` puts the `drafting` row in `draftsStore` and only then
		// generates, so its promise settles up to a minute after the row exists.
		// Watch the store for the row to confirm; never await the promise for that.
		const known = new Set(get(draftsStore).map((d) => d.id));
		let row: { path: string } | undefined;
		let unsubscribe: (() => void) | undefined;
		let stopped = false;
		const stop = () => {
			stopped = true;
			unsubscribe?.();
		};
		unsubscribe = draftsStore.subscribe((rows) => {
			if (row) return;
			const found = rows.find((d) => !known.has(d.id) && d.description === trimmed);
			if (!found) return;
			row = found;
			confirm(found.path);
			stop();
		});
		// The first callback runs synchronously, before `unsubscribe` is assigned.
		if (stopped) unsubscribe();
		stopWatching = stop;

		createDraft(trimmed).then(
			(done) => {
				stop();
				// Fallback if the store match never fired: the resolved row is proof it
				// exists, and leaving the text in place would invite a duplicate submit.
				if (!row) {
					row = done;
					confirm(done.path);
				}
			},
			(err: unknown) => {
				stop();
				if (row) {
					// The row is already in the queue and the banner on its page
					// reports a failed draft and offers a retry. `warn`, not `error`.
					console.warn('Propose a page: drafting did not finish:', err);
					if (current()) confirmed = { path: row.path, failed: true };
				} else if (current()) {
					// Nothing was saved, so the text stays exactly as typed.
					busy = false;
					error = 'Nothing was saved. Your description is still here; try again.';
				}
			}
		);
	}
</script>

{#if sessionStore.signedIn === true}
	<form onsubmit={submit} class="space-y-3">
		<label for="propose-description" class="block text-slate-800">
			Describe a page in plain words and an AI will draft it into the review queue. The draft takes
			up to a minute, and you can leave this page while it works.
		</label>
		<p id="propose-example" class="text-sm text-slate-700">
			For example: “A page explaining how tenants report bed bugs, and what happens after.”
		</p>
		<!-- `min-h-30`: the shadcn Textarea is `field-sizing-content`, which ignores
		     `rows`, and its `min-h-16` rendered an empty box two lines tall -- too
		     small to invite a paragraph. 7.5rem is five lines of 20px plus padding.
		     It still grows with the text. -->
		<Textarea
			id="propose-description"
			bind:value={description}
			rows={5}
			class="min-h-30"
			aria-invalid={invalid ? 'true' : undefined}
			aria-describedby={[
				'propose-example',
				'propose-count',
				over > 0 && 'propose-over',
				error && 'propose-error'
			]
				.filter(Boolean)
				.join(' ')}
		/>
		<p id="propose-count" class="text-sm text-slate-700">{countText}</p>
		{#if over > 0}
			<p id="propose-over" role="alert" class="text-sm font-semibold text-red-800">Too long</p>
		{/if}
		{#if error}
			<p id="propose-error" role="alert" class="text-sm font-semibold text-red-800">{error}</p>
		{/if}
		<Button type="submit" disabled={!canSubmit}>Draft this page</Button>
		<div role="status">
			{#if busy}
				<p class="text-slate-800">Saving your description…</p>
			{:else if confirmed}
				<p class="text-slate-800">
					{#if confirmed.failed}
						Your page is in your queue, but drafting did not finish. Open the draft to retry.
					{:else}
						Your page is in your queue and is being drafted. You can leave this page; it will be
						ready in about a minute.
					{/if}
					<a
						href={resolve(reviewHrefFor(confirmed.path))}
						class="font-semibold underline underline-offset-2">Open the draft</a
					>
				</p>
			{/if}
		</div>
	</form>
{:else if sessionStore.signedIn === false}
	<p class="text-slate-800">
		Creating a page needs an account.
		<a href={resolve('/login')} class="font-semibold underline underline-offset-2"
			>Sign in to propose a page</a
		>.
	</p>
{:else}
	<p class="text-slate-700">Preparing the form…</p>
{/if}
