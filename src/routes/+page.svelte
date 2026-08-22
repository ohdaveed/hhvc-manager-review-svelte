<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import type { User } from '@supabase/supabase-js';

	let user: User | null = $state(null);
	let email = $state('');
	let loading = $state(true);
	let message = $state('');

	onMount(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			user = session?.user ?? null;
			loading = false;
		});

		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((_event, session) => {
			user = session?.user ?? null;
		});

		return () => subscription.unsubscribe();
	});

	const handleLogin = async () => {
		try {
			loading = true;
			message = '';
			const { error } = await supabase.auth.signInWithOtp({ email });
			if (error) throw error;
			message = 'Check your email for the login link!';
		} catch (error: any) {
			message = error.message;
		} finally {
			loading = false;
		}
	};

	const handleLogout = async () => {
		await supabase.auth.signOut();
	};
</script>

<main class="flex min-h-screen items-center justify-center bg-gray-50 p-4">
	<div class="w-full max-w-md rounded-lg bg-white p-8 shadow-sm">
		{#if loading && !message}
			<p class="text-center text-gray-500">Loading...</p>
		{:else if user}
			<div class="space-y-4">
				<h1 class="text-xl font-semibold">Welcome back!</h1>
				<p class="text-sm text-gray-600">Logged in as {user.email}</p>
				<button
					class="w-full rounded bg-gray-200 px-4 py-2 font-medium text-gray-800 hover:bg-gray-300"
					onclick={handleLogout}
				>
					Sign Out
				</button>
			</div>
		{:else}
			<div class="space-y-4">
				<h1 class="text-xl font-semibold">HHVC Manager Review</h1>
				<p class="text-sm text-gray-600">Sign in via Magic Link to access the review tool.</p>
				
				<form class="space-y-3" onsubmit={(e) => { e.preventDefault(); handleLogin(); }}>
					<input
						type="email"
						placeholder="Your email address"
						bind:value={email}
						class="w-full rounded border px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
						required
					/>
					<button
						type="submit"
						disabled={loading}
						class="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
					>
						{loading ? 'Sending...' : 'Send Magic Link'}
					</button>
				</form>

				{#if message}
					<p class="text-center text-sm text-green-600 mt-2">{message}</p>
				{/if}
			</div>
		{/if}
	</div>
</main>
