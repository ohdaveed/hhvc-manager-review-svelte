import { env } from '$env/dynamic/private';
import { SVELTE_PUBLIC_SUPABASE_ANON_KEY, SVELTE_PUBLIC_SUPABASE_URL } from '$env/static/public';
import { error, json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';

/**
 * Creates the `auth.users` row a magic link requires.
 *
 * Public signup is off on both hosted projects (`disable_signup: true`), which
 * is what makes `/login` invite-only: `signInWithOtp` cannot mint an account.
 * The admin invite endpoint is the deliberate way back in -- GoTrue's
 * `internal/api/invite.go` carries no `DisableSignup` check, because the
 * service-role middleware is its gate instead.
 *
 * That gate is the whole security surface here. Any signed-in reviewer may
 * invite, and an invited account gets what every `authenticated` caller gets:
 * SELECT on all four tables plus UPDATE on ANY row of `pages` -- the review
 * status and manager notes of every page. So the caller is verified BEFORE the
 * service-role client is constructed, and a test asserts that by call count.
 */
async function requireUser(request: Request) {
	const header = request.headers.get('Authorization');
	const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
	if (!token) throw error(401, 'Unauthorized');

	// Per-request client: no session is persisted or refreshed on the server.
	const supabase = createClient(SVELTE_PUBLIC_SUPABASE_URL, SVELTE_PUBLIC_SUPABASE_ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});

	const {
		data: { user },
		error: authError
	} = await supabase.auth.getUser(token);
	if (authError || !user) throw error(401, 'Unauthorized');

	return user;
}

/** Bounds the request before it is parsed -- the only cap that can apply to a
 *  body that has not been read yet. A single address needs nothing near this. */
const MAX_BODY_BYTES = 4 * 1024;

/** The same shape `src/routes/login/+page.svelte` validates with, so an address
 *  the sign-in form would accept is one this route will try. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_CHARS = 254;

export async function POST({ request, url }) {
	// Outside the try: a thrown HttpError is not an Error instance, so the
	// catch below would otherwise flatten this 401 into a 500.
	const caller = await requireUser(request);

	try {
		const raw = await request.text();
		if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
			throw error(413, 'Request body too large');
		}

		let payload: Record<string, unknown>;
		try {
			payload = JSON.parse(raw);
		} catch {
			throw error(400, 'Invalid JSON body');
		}

		const email = typeof payload.email === 'string' ? payload.email.trim() : '';
		if (!EMAIL_PATTERN.test(email) || email.length > MAX_EMAIL_CHARS) {
			throw error(400, 'That does not look like an email address');
		}

		// Checked before the client is built, so an unset variable reads as what
		// it is. Without it the admin client is constructed with `undefined`,
		// GoTrue answers 401, and it reaches the inviter as THEIR session being
		// bad -- a misdiagnosis that points at the wrong half of the system.
		const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
		if (!serviceRoleKey) {
			throw error(500, 'SUPABASE_SERVICE_ROLE_KEY is not set for this deploy context');
		}

		const admin = createClient(SVELTE_PUBLIC_SUPABASE_URL, serviceRoleKey, {
			auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
		});

		// `url.origin` rather than a configured site URL: a deploy preview must
		// invite back to that preview, not to production. Both projects'
		// `uri_allow_list` cover the wildcard, and a redirectTo outside the list
		// is silently ignored in favour of Site URL rather than refused.
		//
		// `type: 'invite'` is LOAD-BEARING and must never become `'magiclink'`.
		// Supabase documents `generateLink` as producing links "to be sent via a
		// custom email provider" -- it hands the URL back instead of mailing it,
		// which is the whole point here, since the built-in mailer refuses every
		// address outside the Supabase organisation. But a `magiclink` for an
		// address that ALREADY has an account returns a link that signs its
		// holder in AS that person. Any signed-in reviewer can call this route,
		// so `magiclink` would put impersonating the manager one request away.
		// `invite` refuses a confirmed address (422 `email_exists`, mapped to 409
		// below), and that refusal is the control. A test asserts the argument.
		const { data, error: inviteError } = await admin.auth.admin.generateLink({
			type: 'invite',
			email,
			options: { redirectTo: `${url.origin}/login` }
		});

		const actionLink = data?.properties?.action_link;

		// An error is handled BEFORE the link is considered, and that ordering is
		// the point. An earlier version preferred the link whenever one came back,
		// on the theory that the built-in mailer would refuse the address and
		// return an error alongside a usable link. It does not: measured against a
		// real project, a no-SMTP invite returns 200 with a link and NO error, and
		// `@supabase/auth-js` never builds the both-at-once shape anyway -- its
		// success transform always sets `error: null` and its error path always
		// sets `properties: null`. Keeping that branch made the `email_exists`
		// refusal below -- the control this whole route rests on -- conditional on
		// a library implementation detail. Letting the error win unconditionally
		// is what makes it a control rather than a coincidence.
		if (inviteError) {
			// GoTrue answers 422 `email_exists` for an address that already has a
			// confirmed account. The caller here is authenticated, so there is no
			// reason to be coy about it the way the sign-in form has to be.
			if (inviteError.code === 'email_exists') {
				throw error(409, 'That address already has an account.');
			}

			// A key that is PRESENT but wrong -- rotated, revoked, or another
			// project's key in this deploy context. GoTrue answers 401/403, and
			// forwarding that verbatim tells the reviewer THEIR session is bad,
			// which is the same misdiagnosis the missing-key guard above exists to
			// prevent -- and the likelier of the two once the variable is set.
			if (inviteError.status === 401 || inviteError.status === 403) {
				console.error('Invite rejected by Supabase admin API:', inviteError.message);
				throw error(500, 'The invite service is misconfigured for this deploy.');
			}

			// The hourly cap is shared with sign-in links, so a reviewer who sends
			// two invitations hits it immediately and GoTrue's bare "email rate
			// limit exceeded" does not explain why.
			if (inviteError.code === 'over_email_send_rate_limit') {
				throw error(
					429,
					`${inviteError.message} — this project’s hourly email cap is shared with sign-in links. Wait and try again.`
				);
			}

			// Everything else keeps its own status and wording. The mailer's
			// `email_address_not_authorized` is the one a reviewer will actually
			// meet, and it names its own cause better than anything generic here.
			// `status` is range-checked because auth-js builds a retryable fetch
			// error with status 0, which `error()` rejects outright.
			const status =
				typeof inviteError.status === 'number' &&
				inviteError.status >= 400 &&
				inviteError.status <= 599
					? inviteError.status
					: 500;
			throw error(status, inviteError.message);
		}

		if (!actionLink) {
			// No link and no error should be impossible, but a silent 200 with
			// nothing to deliver would leave the caller believing an invitation
			// went out.
			throw error(500, 'Supabase returned no invite link.');
		}

		// WHO asked and FOR WHOM -- never the link itself, which is a credential
		// and has no business in a function log.
		//
		// This exists because the route has a window it cannot close cheaply:
		// GoTrue re-invites an existing UNCONFIRMED address rather than refusing
		// it (measured — two `generate_link` calls for the same pending invitee
		// both returned a link). Confirmed addresses are refused with 409, so the
		// window is only open until someone first signs in. Within it, any
		// reviewer can obtain a link for a pending colleague and act as them.
		// They gain no permissions — every authenticated user already has the
		// same ones — but they gain that person's ATTRIBUTION, and attribution is
		// what this tool exists to record. This line is what makes it traceable.
		console.log(`invite link generated by ${caller.id} for ${email}`);

		return json({ email, actionLink });
	} catch (err) {
		// Rethrow deliberate HTTP errors so upstream status codes survive.
		if (typeof err === 'object' && err !== null && 'status' in err) throw err;

		console.error('Invite failed:', err);
		throw error(500, 'Could not create the invite link');
	}
}
