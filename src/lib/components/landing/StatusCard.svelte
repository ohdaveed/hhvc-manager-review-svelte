<script lang="ts">
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';

	/**
	 * Every state of the landing header that is not loaded progress.
	 *
	 * One card shape in every state is the point: the header slot never holds
	 * blank space reserved for a card that is not coming (signed out used to sit
	 * on ~130px of nothing), and the page below does not jump when the state
	 * changes. `ProgressSummary` is the loaded state; it shares this shell.
	 *
	 * - `loading`    the session check or the review load is in flight. A
	 *                skeleton the height of the loaded card, with the wait named
	 *                in words; it claims no numbers.
	 * - `signed-out` sign-in is this page's one action.
	 * - `failed`     the review load REJECTED (a query error). Try again re-runs it
	 *                in place. Before `loadReview` rejected on error this state was
	 *                unreachable and the page said "Loading…" forever.
	 * - `empty`      signed in, the load resolved, and there is no review row to
	 *                count. Not an error, so not red.
	 */
	let {
		kind,
		loadingLabel = 'Loading your progress…',
		retrying = false,
		onRetry
	}: {
		kind: 'loading' | 'signed-out' | 'failed' | 'empty';
		loadingLabel?: string;
		retrying?: boolean;
		onRetry?: () => void;
	} = $props();

	const shell = 'rounded-[4px] border p-4 sm:p-5';
</script>

{#if kind === 'loading'}
	<section aria-label="Your progress" aria-busy="true" class="{shell} border-border bg-white">
		<p role="status" class="text-lg font-semibold text-slate-700">{loadingLabel}</p>
		<div class="mt-2 h-3 rounded-full bg-sfds-grey-l2" aria-hidden="true"></div>
		<div class="mt-3 flex gap-2" aria-hidden="true">
			<span class="h-7 w-28 rounded-full bg-sfds-grey-l2/70"></span>
			<span class="h-7 w-24 rounded-full bg-sfds-grey-l2/70"></span>
		</div>
		<div
			class="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"
			aria-hidden="true"
		>
			<div class="space-y-2">
				<span class="block h-3.5 w-16 rounded-sm bg-sfds-grey-l2/70"></span>
				<span class="block h-4 w-72 max-w-full rounded-sm bg-sfds-grey-l2"></span>
			</div>
			<span class="block h-9 w-full rounded-lg bg-sfds-grey-l2 sm:w-32"></span>
		</div>
	</section>
{:else if kind === 'signed-out'}
	<section aria-label="Sign in" class="{shell} border-border bg-white">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
			<div>
				<p class="text-lg font-semibold text-slate-900">
					Sign in to record decisions and track your progress
				</p>
				<p class="mt-1 text-slate-700">You can read every page without an account.</p>
			</div>
			<Button href={resolve('/login')} size="lg" class="w-full px-6 max-sm:min-h-11 sm:w-auto">
				Sign in
			</Button>
		</div>
	</section>
{:else if kind === 'failed'}
	<!-- `role="alert"`: this replaces a loading line the reviewer was waiting on,
	     so it should be announced, not found later. Heading in sfds-red on the
	     red-l1 tint (5.64:1, the measured status pair); body in black. -->
	<section role="alert" class="{shell} border-sfds-red/40 bg-sfds-red-l1">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
			<div class="flex gap-3">
				<CircleAlert class="mt-0.5 size-5 shrink-0 text-sfds-red" aria-hidden="true" />
				<div>
					<p class="text-lg font-semibold text-sfds-red">Your progress didn't load</p>
					<p class="mt-1 text-sfds-black">
						The review data couldn't be reached. Your decisions are safe.
					</p>
				</div>
			</div>
			<!-- Never disabled while retrying: a disabled control is low contrast and
			     says nothing. It stays put, says what it is doing, and ignores a
			     second press. -->
			<Button
				variant="outline"
				size="lg"
				class="w-full bg-white px-6 max-sm:min-h-11 sm:w-auto"
				aria-busy={retrying}
				onclick={() => {
					if (!retrying) onRetry?.();
				}}
			>
				{retrying ? 'Trying…' : 'Try again'}
			</Button>
		</div>
	</section>
{:else}
	<section aria-label="Your progress" class="{shell} border-border bg-white">
		<p class="text-lg font-semibold text-slate-900">There's no review to work through yet</p>
		<p class="mt-1 text-slate-700">Every page below is still readable.</p>
	</section>
{/if}
