import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
const generateLink = vi.fn();

/**
 * One spy serves both clients the route builds. That is what lets the first
 * test assert, by call count, that the SERVICE-ROLE client is never
 * constructed for a caller who was not verified -- the property that keeps
 * this route from being an open invite relay.
 */
const createClient = vi.fn(() => ({ auth: { getUser, admin: { generateLink } } }));

vi.mock('@supabase/supabase-js', () => ({ createClient }));

/**
 * Mutable on purpose. `$env/dynamic/private` is read at request time, not at
 * module scope, so a test can take the key away without resetting modules.
 */
const privateEnv: Record<string, string | undefined> = {
	SUPABASE_SERVICE_ROLE_KEY: 'test-service-key'
};
vi.mock('$env/dynamic/private', () => ({ env: privateEnv }));

const { POST } = await import('./+server');

const ORIGIN = 'https://deploy-preview-9--sfhealthyhousing.netlify.app';
const AUTHED = { Authorization: 'Bearer good-token' };
const ACTION_LINK = 'https://example.test/verify?token=abc';

function buildEvent(
	headers: Record<string, string> = {},
	body: unknown = { email: 'new@sfgov.org' }
) {
	const request = new Request(`${ORIGIN}/api/invite`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...headers },
		body: JSON.stringify(body)
	});
	return { request, url: new URL(request.url) };
}

describe('POST /api/invite', () => {
	beforeEach(() => {
		createClient.mockClear();
		getUser.mockReset();
		generateLink.mockReset();
		privateEnv.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

		getUser.mockResolvedValue({
			data: { user: { id: 'u1', email: 'reviewer@sfgov.org' } },
			error: null
		});
		generateLink.mockResolvedValue({
			data: { properties: { action_link: ACTION_LINK } },
			error: null
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('rejects a request with no Authorization header', async () => {
		await expect(POST(buildEvent() as never)).rejects.toMatchObject({ status: 401 });
		// No client at all: a missing header short-circuits before even the anon
		// client. A service-role client built before the caller is verified is
		// the escalation this route must not have.
		expect(createClient).not.toHaveBeenCalled();
		expect(generateLink).not.toHaveBeenCalled();
	});

	it('rejects a bearer token supabase does not recognise', async () => {
		getUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad jwt' } });

		await expect(POST(buildEvent(AUTHED) as never)).rejects.toMatchObject({ status: 401 });
		expect(generateLink).not.toHaveBeenCalled();
	});

	it('rejects a malformed email address', async () => {
		await expect(
			POST(buildEvent(AUTHED, { email: 'not-an-email' }) as never)
		).rejects.toMatchObject({ status: 400 });
		expect(generateLink).not.toHaveBeenCalled();
	});

	/**
	 * The single most important assertion in this file. A `magiclink` for an
	 * address that ALREADY has an account returns a link that signs the holder
	 * in AS that person -- and any signed-in reviewer can call this route. That
	 * would put impersonating the manager one request away. `invite` refuses a
	 * confirmed address instead, which is the control.
	 *
	 * Asserted on the ARGUMENT, not the response: a response-shaped assertion
	 * passes identically under either type while the hole is wide open.
	 */
	it('generates an invite link, never a magic link', async () => {
		await POST(buildEvent(AUTHED) as never);

		expect(generateLink).toHaveBeenCalledWith(expect.objectContaining({ type: 'invite' }));
		expect(JSON.stringify(generateLink.mock.calls[0])).not.toContain('magiclink');
	});

	it('returns the action link to the caller', async () => {
		const response = await POST(buildEvent(AUTHED) as never);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			email: 'new@sfgov.org',
			actionLink: ACTION_LINK
		});
	});

	it('points the link back at the requesting origin', async () => {
		await POST(buildEvent(AUTHED) as never);

		expect(generateLink).toHaveBeenCalledWith(
			expect.objectContaining({
				email: 'new@sfgov.org',
				options: { redirectTo: `${ORIGIN}/login` }
			})
		);
	});

	/**
	 * The response body is a credential now. A Netlify function log is not a
	 * place for one, and neither is Sentry.
	 */
	it('never logs the link', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});
		const info = vi.spyOn(console, 'info').mockImplementation(() => {});
		const err = vi.spyOn(console, 'error').mockImplementation(() => {});

		const response = await POST(buildEvent(AUTHED) as never);
		expect(response.status).toBe(200);

		// Joined into one string and asserted unconditionally. Looping over the
		// calls and asserting inside the loop runs ZERO assertions in the normal
		// case -- nothing is logged -- so it would pass without testing anything.
		const logged = [log, info, err]
			.flatMap((spy) => spy.mock.calls)
			.map((call) => JSON.stringify(call))
			.join(' ');
		expect(logged).not.toContain('example.test');
	});

	/**
	 * Any signed-in reviewer can mint a link, and GoTrue re-invites an existing
	 * UNCONFIRMED address rather than refusing it (measured against a real
	 * project: two `generate_link` calls for the same pending invitee both
	 * returned 200 with a link). So a reviewer can obtain a working link for a
	 * colleague who has not signed in yet and act as them. The permissions are
	 * identical either way; what is forgeable is ATTRIBUTION, which in a review
	 * tool is the product. A log line is what makes that traceable.
	 */
	it('records who asked for a link and for whom, without the link', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});

		await POST(buildEvent(AUTHED) as never);

		const logged = log.mock.calls.map((call) => JSON.stringify(call)).join(' ');
		expect(logged).toContain('u1');
		expect(logged).toContain('new@sfgov.org');
		expect(logged).not.toContain('example.test');
	});

	/**
	 * The built-in mailer refuses any address outside the Supabase organisation.
	 * With links delivered by hand that refusal is expected and irrelevant --
	 * the link is what the caller needs, and it was produced.
	 */
	it('succeeds when the mailer refuses the address but a link was produced', async () => {
		generateLink.mockResolvedValue({
			data: { properties: { action_link: ACTION_LINK } },
			error: {
				status: 422,
				code: 'email_address_not_authorized',
				message: 'Email address not authorized'
			}
		});

		const response = await POST(buildEvent(AUTHED) as never);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toMatchObject({ actionLink: ACTION_LINK });
	});

	it('maps an existing confirmed account to 409', async () => {
		generateLink.mockResolvedValue({
			data: null,
			error: {
				status: 422,
				code: 'email_exists',
				message: 'A user with this email address has already been registered'
			}
		});

		await expect(POST(buildEvent(AUTHED) as never)).rejects.toMatchObject({ status: 409 });
	});

	it('passes through a failure that produced no link', async () => {
		generateLink.mockResolvedValue({
			data: null,
			error: {
				status: 422,
				code: 'email_address_not_authorized',
				message: 'Email address not authorized'
			}
		});

		await expect(POST(buildEvent(AUTHED) as never)).rejects.toMatchObject({
			status: 422,
			body: { message: 'Email address not authorized' }
		});
	});

	it('names the hourly cap when the mailer refuses on rate limit', async () => {
		generateLink.mockResolvedValue({
			data: null,
			error: {
				status: 429,
				code: 'over_email_send_rate_limit',
				message: 'email rate limit exceeded'
			}
		});

		await expect(POST(buildEvent(AUTHED) as never)).rejects.toMatchObject({
			status: 429,
			body: { message: expect.stringContaining('shared with sign-in') }
		});
	});

	it('does not report a bad service-role key as the caller’s problem', async () => {
		generateLink.mockResolvedValue({
			data: null,
			error: { status: 401, code: 'bad_jwt', message: 'Invalid API key' }
		});

		await expect(POST(buildEvent(AUTHED) as never)).rejects.toMatchObject({
			status: 500,
			body: { message: expect.stringContaining('misconfigured') }
		});
	});

	it('fails clearly when the service-role key is missing', async () => {
		delete privateEnv.SUPABASE_SERVICE_ROLE_KEY;

		await expect(POST(buildEvent(AUTHED) as never)).rejects.toMatchObject({
			status: 500,
			body: { message: expect.stringContaining('SUPABASE_SERVICE_ROLE_KEY') }
		});
		// Anon client built for the auth check; admin client never attempted.
		expect(createClient).toHaveBeenCalledTimes(1);
		expect(generateLink).not.toHaveBeenCalled();
	});
});
