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

	const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	const emailLooksValid = $derived(EMAIL_PATTERN.test(email.trim()));

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
		// The invite state holds a live credential. The signed-in branch unmounts
		// so nothing renders it, but leaving a usable sign-in link in component
		// state after the session ends is not a thing to do.
		invitedTo = '';
		inviteLink = '';
		inviteCopied = false;
		inviteCopyError = '';
		inviteEmail = '';
	}

	/**
	 * Inviting creates the `auth.users` row a magic link requires. Public signup
	 * is off on both hosted projects, so this is the only way a new reviewer
	 * gets an account without dashboard access.
	 *
	 * Any signed-in reviewer may create one, and the route logs who asked and for
	 * whom (never the link) -- so the
	 * help text says plainly what an invitation grants rather than leaving it to
	 * be discovered.
	 */
	let inviteEmail = $state('');
	let inviting = $state(false);
	let invitedTo = $state('');
	let inviteLink = $state('');
	let inviteCopied = $state(false);
	let inviteCopyError = $state('');
	let inviteError = $state('');

	const inviteLooksValid = $derived(EMAIL_PATTERN.test(inviteEmail.trim()));

	async function sendInvite(event: SubmitEvent) {
		event.preventDefault();
		if (!inviteLooksValid || inviting) return;

		inviting = true;
		inviteError = '';
		invitedTo = '';
		inviteLink = '';
		inviteCopied = false;

		const address = inviteEmail.trim();

		// `fetch` REJECTS on a network failure rather than resolving a non-ok
		// Response, and so does `getSession`. The sign-in half of this page needs
		// no try because `signInWithOtp` returns `{ error }` instead of throwing.
		// Without the `finally`, one dropped connection leaves `inviting` true
		// for good: the field stays disabled, the button stays on "Sending…",
		// and nothing is ever shown. Only a reload recovers.
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();

			const response = await fetch('/api/invite', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${session?.access_token ?? ''}`
				},
				body: JSON.stringify({ email: address })
			});

			if (!response.ok) {
				// The route names its own causes better than anything generic here --
				// an address that already has an account, the mailer's hourly cap, an
				// address the mailer will not deliver to.
				const body = await response.json().catch(() => ({}));
				inviteError = body.message || 'That invitation did not send.';
				return;
			}

			const body = await response.json().catch(() => ({}));
			invitedTo = address;
			inviteLink = body.actionLink ?? '';
			// Cleared so a second invitation does not go to the same address by
			// accident -- the form offers no other signal that it completed.
			inviteEmail = '';
		} catch {
			inviteError = 'That invitation did not send. Check your connection and try again.';
		} finally {
			inviting = false;
		}
	}

	async function copyInviteLink() {
		inviteCopyError = '';
		try {
			await navigator.clipboard.writeText(inviteLink);
			inviteCopied = true;
			setTimeout(() => (inviteCopied = false), 2000);
		} catch {
			// Saying nothing here is not neutral. A refused write (permissions, a
			// non-secure context, an unfocused document) leaves the clipboard
			// holding whatever was copied last -- plausibly the PREVIOUS invitee's
			// link. Pasting that to the new person signs them in as someone else,
			// which is the attribution forgery this feature's design names as its
			// core harm, reached by accident. The only signal would otherwise be
			// the button not changing to "Copied".
			inviteCopyError = 'Could not copy it — select the link and copy it by hand.';
		}
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

			<section class="mt-12 border-t border-border pt-8">
				<h2 class="mb-6 text-xl font-bold text-foreground">Invite a reviewer</h2>

				{#if invitedTo}
					<div class="mb-6">
						<!--
							The link and its button sit OUTSIDE PageAlert deliberately.
							PageAlert renders `children` inside a `<p>`, and a `<button>` or a
							block `<code>` inside a paragraph is invalid HTML -- the parser
							closes the `<p>` early and scatters the content. Text-matching
							tests passed over that malformed DOM; querying the button by role
							is what exposed it.
						-->
						<PageAlert kind="success" title="Send this link to {invitedTo}">
							Anyone with this link signs in as them. It works once and then expires — treat it like
							a password.
						</PageAlert>

						<!--
							Rendered as `<code>`, never as an `<a>`. The link is single-use:
							clicking it here would consume the token, sign YOU in as the
							invitee, and leave them with a dead link.
						-->
						<code
							class="mt-3 block overflow-x-auto rounded border border-border bg-muted p-3 text-sm break-all"
							>{inviteLink}</code
						>
						<div class="mt-3 flex items-center gap-3">
							<SiteButton variant="secondary" onclick={copyInviteLink}>
								{inviteCopied ? 'Copied' : 'Copy link'}
							</SiteButton>
							{#if inviteCopyError}
								<span class="text-sm text-destructive">{inviteCopyError}</span>
							{/if}
						</div>
					</div>
				{/if}

				{#if inviteError}
					<div class="mb-6">
						<PageAlert kind="danger" title="That did not work">{inviteError}</PageAlert>
					</div>
				{/if}

				<form onsubmit={sendInvite} novalidate>
					<TextField
						id="invite-email"
						label="Email address"
						help="You will get a link to send them yourself — no email goes out. Anyone you invite can edit copy and change review decisions on every page."
						type="email"
						name="invite-email"
						autocomplete="off"
						placeholder="colleague@sfgov.org"
						bind:value={inviteEmail}
						disabled={inviting}
						required
					/>
					<div class="mt-6">
						<SiteButton type="submit" disabled={!inviteLooksValid || inviting}>
							{inviting ? 'Creating…' : 'Create invite link'}
						</SiteButton>
					</div>
				</form>
			</section>
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
