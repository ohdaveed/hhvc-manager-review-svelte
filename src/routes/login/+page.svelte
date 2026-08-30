<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { sessionStore } from '$lib/stores/session.svelte';
	import PageAlert from '$lib/components/sfgov/ds/PageAlert.svelte';
	import SiteButton from '$lib/components/sfgov/ds/SiteButton.svelte';
	import SiteFooter from '$lib/components/sfgov/SiteFooter.svelte';
	import SiteHeader from '$lib/components/sfgov/SiteHeader.svelte';
	import TextField from '$lib/components/sfgov/ds/TextField.svelte';

	/**
	 * Magic-link sign-in. The app had no way to sign in at all: every RLS policy
	 * is `TO authenticated`, `ensureDevSession()` compiles out of a production
	 * build, and there was no route to replace it -- so the queue, decisions,
	 * notes and checks were unreachable on the deployed site, for everyone.
	 *
	 * No callback route is needed. supabase-js defaults to `flowType: 'implicit'`
	 * with `detectSessionInUrl: true` (verified in the installed auth-js
	 * constants, not assumed), so the link returns `#access_token=...` and the
	 * client exchanges it on whatever page loads next. `emailRedirectTo` points
	 * back here rather than at `/review`, which has no `+page.svelte` and would
	 * 404 the reviewer at the moment sign-in succeeded.
	 *
	 * Reading stays anonymous on purpose -- see the banner in
	 * `review/+layout.svelte`. This page is the way to get an account onto the
	 * session, not a gate in front of the mockups.
	 */
	let email = $state('');
	let sending = $state(false);
	let sent = $state(false);
	let errorMessage = $state('');

	const emailLooksValid = $derived(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));

	/** With `shouldCreateUser: false`, an address with no account comes back as a
	 *  refusal rather than a silent success. Treated as success on purpose. */
	function isUnknownAccount(error: { code?: string; message: string }): boolean {
		return error.code === 'otp_disabled' || /signups? not allowed/i.test(error.message);
	}

	async function sendLink(event: SubmitEvent) {
		event.preventDefault();
		if (!emailLooksValid || sending) return;

		sending = true;
		errorMessage = '';

		const { error } = await supabase.auth.signInWithOtp({
			email: email.trim(),
			options: {
				emailRedirectTo: `${window.location.origin}/login`,
				// `signInWithOtp` SIGNS UP by default -- auth-js sends
				// `create_user: options?.shouldCreateUser ?? true`. Left at the
				// default, this page would let any address on the internet mint
				// itself an `authenticated` session, and the RLS table hands that
				// role SELECT on every table plus UPDATE on ANY row of `pages` --
				// so a stranger could rewrite the review status and manager notes
				// of all 29 pages. Reviewers are invited; sign-in is not sign-up.
				shouldCreateUser: false
			}
		});

		sending = false;

		if (error && !isUnknownAccount(error)) {
			// A real failure -- rate limit, network, misconfigured SMTP. A reviewer
			// who gets no email needs to know the send itself broke.
			errorMessage = error.message;
			return;
		}
		// Unknown addresses fall through to the same confirmation as known ones.
		// Saying "no account exists" here would turn the form into an oracle for
		// who holds one, and the neutral wording still tells an uninvited person
		// what to do next.
		sent = true;
	}

	async function signOut() {
		await supabase.auth.signOut();
		sent = false;
		email = '';
	}
</script>

<svelte:head>
	<title>Sign in · HHVC mockup review</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-background">
	<SiteHeader />

	<main class="mx-auto w-full max-w-[560px] flex-1 px-4 py-12">
		<h1 class="mb-2 text-3xl font-bold text-foreground">Sign in</h1>

		{#if sessionStore.signedIn}
			<p class="mb-6 text-base text-muted-foreground">You are signed in.</p>
			<PageAlert kind="success" title="Signed in">
				Edits you make will be saved and attributed to your account.
			</PageAlert>
			<div class="mt-6 flex gap-3">
				<SiteButton onclick={() => (window.location.href = '/')}>Go to the review queue</SiteButton>
				<SiteButton variant="secondary" onclick={signOut}>Sign out</SiteButton>
			</div>
		{:else if sent}
			<PageAlert kind="success" title="Check your email">
				If <strong>{email}</strong> has an account, a sign-in link is on its way. Open it on this device
				— the link carries the session, so it has to land in this browser. Reviewers are invited, so ask
				for an invitation if nothing arrives.
			</PageAlert>
			<div class="mt-6">
				<SiteButton variant="secondary" onclick={() => (sent = false)}>
					Use a different address
				</SiteButton>
			</div>
		{:else}
			<p class="mb-6 text-base text-muted-foreground">
				Reviewers sign in with a link sent by email — there is no password. You can read every
				mockup without signing in; an account is what lets your edits be saved.
			</p>

			{#if errorMessage}
				<div class="mb-6">
					<PageAlert kind="danger" title="That did not send">{errorMessage}</PageAlert>
				</div>
			{/if}

			<form onsubmit={sendLink} novalidate>
				<TextField
					label="Email address"
					help="Use the address your invitation was sent to."
					type="email"
					name="email"
					autocomplete="email"
					placeholder="you@sfgov.org"
					bind:value={email}
					disabled={sending}
					required
				/>
				<div class="mt-6">
					<SiteButton type="submit" disabled={!emailLooksValid || sending}>
						{sending ? 'Sending…' : 'Email me a sign-in link'}
					</SiteButton>
				</div>
			</form>
		{/if}
	</main>

	<SiteFooter />
</div>
