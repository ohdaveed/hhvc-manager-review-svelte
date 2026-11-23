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
	await requireUser(request);

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
		const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
			redirectTo: `${url.origin}/login`
		});

		if (inviteError) {
			// GoTrue answers 422 `email_exists` for an address that already has a
			// confirmed account. The caller here is authenticated, so there is no
			// reason to be coy about it the way the sign-in form has to be.
			if (inviteError.code === 'email_exists') {
				throw error(409, 'That address already has an account.');
			}

			// A key that is PRESENT but wrong -- rotated, revoked, or production's
			// key on a preview built against staging. GoTrue answers 401/403, and
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
					`${inviteError.message} — this project’s hourly email cap is shared with sign-in links. Wait, or raise it once custom SMTP is configured.`
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

		return json({ email });
	} catch (err) {
		// Rethrow deliberate HTTP errors so upstream status codes survive.
		if (typeof err === 'object' && err !== null && 'status' in err) throw err;

		console.error('Invite failed:', err);
		throw error(500, 'Could not send the invitation');
	}
}
