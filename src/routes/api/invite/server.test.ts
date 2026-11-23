import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
const inviteUserByEmail = vi.fn();

/**
 * One spy serves both clients the route builds. That is what lets the first
 * test assert, by call count, that the SERVICE-ROLE client is never
 * constructed for a caller who was not verified -- the property that keeps
 * this route from being an open invite relay.
 */
const createClient = vi.fn(() => ({ auth: { getUser, admin: { inviteUserByEmail } } }));

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
		inviteUserByEmail.mockReset();
		privateEnv.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

		getUser.mockResolvedValue({
			data: { user: { id: 'u1', email: 'reviewer@sfgov.org' } },
			error: null
		});
		inviteUserByEmail.mockResolvedValue({ data: { user: { id: 'u2' } }, error: null });
	});

	it('rejects a request with no Authorization header', async () => {
		await expect(POST(buildEvent() as never)).rejects.toMatchObject({ status: 401 });
		// No client at all: a missing header short-circuits before even the anon
		// client. A service-role client built before the caller is verified is
		// the escalation this route must not have.
		expect(createClient).not.toHaveBeenCalled();
		expect(inviteUserByEmail).not.toHaveBeenCalled();
	});

	it('rejects a bearer token supabase does not recognise', async () => {
		getUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad jwt' } });

		await expect(POST(buildEvent(AUTHED) as never)).rejects.toMatchObject({ status: 401 });
		expect(inviteUserByEmail).not.toHaveBeenCalled();
	});

	it('rejects a malformed email address', async () => {
		await expect(
			POST(buildEvent(AUTHED, { email: 'not-an-email' }) as never)
		).rejects.toMatchObject({ status: 400 });
		expect(inviteUserByEmail).not.toHaveBeenCalled();
	});

	it('invites the address and redirects back to the requesting origin', async () => {
		const response = await POST(buildEvent(AUTHED) as never);

		expect(response.status).toBe(200);
		expect(inviteUserByEmail).toHaveBeenCalledWith('new@sfgov.org', {
			redirectTo: `${ORIGIN}/login`
		});
	});

	it('maps an existing confirmed account to 409', async () => {
		inviteUserByEmail.mockResolvedValue({
			data: null,
			error: {
				status: 422,
				code: 'email_exists',
				message: 'A user with this email address has already been registered'
			}
		});

		await expect(POST(buildEvent(AUTHED) as never)).rejects.toMatchObject({ status: 409 });
	});

	it('passes through an address the mailer will not deliver to', async () => {
		inviteUserByEmail.mockResolvedValue({
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

	it('passes through the mailer rate limit', async () => {
		inviteUserByEmail.mockResolvedValue({
			data: null,
			error: {
				status: 429,
				code: 'over_email_send_rate_limit',
				message: 'email rate limit exceeded'
			}
		});

		await expect(POST(buildEvent(AUTHED) as never)).rejects.toMatchObject({
			status: 429,
			body: { message: expect.stringContaining('email rate limit exceeded') }
		});
	});

	it('names the hourly cap when the mailer refuses on rate limit', async () => {
		inviteUserByEmail.mockResolvedValue({
			data: null,
			error: {
				status: 429,
				code: 'over_email_send_rate_limit',
				message: 'email rate limit exceeded'
			}
		});

		// The raw GoTrue message says nothing about the cap being shared with
		// sign-in links, which is the part that explains why two invitations in a
		// row fail. The spec requires the limit be named.
		await expect(POST(buildEvent(AUTHED) as never)).rejects.toMatchObject({
			status: 429,
			body: { message: expect.stringContaining('shared with sign-in') }
		});
	});

	it('does not report a bad service-role key as the caller’s problem', async () => {
		// A key that is PRESENT but wrong -- rotated, revoked, or production's key
		// on a staging-targeted preview. Forwarding GoTrue's 401 would tell the
		// reviewer their own session was bad, which is the exact misdiagnosis the
		// missing-key guard exists to prevent.
		inviteUserByEmail.mockResolvedValue({
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
		expect(inviteUserByEmail).not.toHaveBeenCalled();
	});
});
