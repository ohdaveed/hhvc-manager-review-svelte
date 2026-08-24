import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const getUser = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
	createClient: () => ({ auth: { getUser } })
}));

const { POST } = await import('./+server');

/**
 * Builds a POST event and stubs the platform's global `fetch` to record the
 * upstream call the handler makes.
 *
 * The handler must use the global `fetch`, not SvelteKit's `event.fetch`
 * (see the regression test below), so that is what these tests stub. An
 * `event.fetch` mock is attached too, purely so the regression test can
 * prove the handler never reaches for it.
 */
function buildEvent(
	headers: Record<string, string> = {},
	payload: unknown = { task: 'rewrite-field', fieldText: 'hello' }
) {
	const upstream = vi.fn(
		async (_url: string, _init?: RequestInit) =>
			new Response(JSON.stringify({ result: { rewrittenText: 'ok' } }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			})
	);
	vi.stubGlobal('fetch', upstream);

	const eventFetch = vi.fn();

	const request = new Request('http://localhost/api/ai/generate', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...headers },
		body: JSON.stringify(payload)
	});

	return { event: { request, fetch: eventFetch }, upstream, eventFetch };
}

describe('POST /api/ai/generate', () => {
	beforeEach(() => {
		getUser.mockReset();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('rejects a request with no Authorization header', async () => {
		const { event, upstream } = buildEvent();

		await expect(POST(event as never)).rejects.toMatchObject({ status: 401 });
		expect(upstream).not.toHaveBeenCalled();
	});

	it('rejects a bearer token that supabase does not recognise', async () => {
		getUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad jwt' } });
		const { event, upstream } = buildEvent({ Authorization: 'Bearer not-a-real-token' });

		await expect(POST(event as never)).rejects.toMatchObject({ status: 401 });
		expect(upstream).not.toHaveBeenCalled();
	});

	it('forwards to the backend for an authenticated caller', async () => {
		getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
		const { event, upstream } = buildEvent({ Authorization: 'Bearer good-token' });

		const response = await POST(event as never);

		expect(await response.json()).toEqual({ result: { rewrittenText: 'ok' } });
		expect(upstream).toHaveBeenCalledOnce();
	});

	it('rejects a body larger than the size cap without forwarding it', async () => {
		getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
		const { event, upstream } = buildEvent(
			{ Authorization: 'Bearer good-token' },
			{
				task: 'rewrite-field',
				fieldText: 'x'.repeat(70 * 1024)
			}
		);

		await expect(POST(event as never)).rejects.toMatchObject({ status: 413 });
		expect(upstream).not.toHaveBeenCalled();
	});

	// The two boundaries below are the BACKEND's schema, mirrored. Pinned AT the
	// edge rather than well past it: the route allowed 20,000 for `fieldText` and
	// nothing at all for `instruction`, and a test at 25,000 passed either way --
	// it could not tell the two limits apart, so it never caught the drift.
	it('rejects field text one over the cap without forwarding it', async () => {
		getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
		const { event, upstream } = buildEvent(
			{ Authorization: 'Bearer good-token' },
			{
				task: 'rewrite-field',
				fieldText: 'y'.repeat(8_001)
			}
		);

		await expect(POST(event as never)).rejects.toMatchObject({ status: 400 });
		expect(upstream).not.toHaveBeenCalled();
	});

	it('forwards field text exactly at the cap', async () => {
		getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
		const { event, upstream } = buildEvent(
			{ Authorization: 'Bearer good-token' },
			{
				task: 'rewrite-field',
				fieldText: 'y'.repeat(8_000)
			}
		);

		await POST(event as never);
		expect(upstream).toHaveBeenCalledOnce();
	});

	it('rejects an instruction one over the cap without forwarding it', async () => {
		getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
		const { event, upstream } = buildEvent(
			{ Authorization: 'Bearer good-token' },
			{
				task: 'rewrite-field',
				fieldText: 'short',
				instruction: 'z'.repeat(2_001)
			}
		);

		await expect(POST(event as never)).rejects.toMatchObject({ status: 400 });
		expect(upstream).not.toHaveBeenCalled();
	});

	it("forwards the backend's own error message when the upstream responds with a JSON error body", async () => {
		getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
		const { event } = buildEvent({ Authorization: 'Bearer good-token' });
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () =>
					new Response(
						JSON.stringify({
							error: 'invalid_request_error',
							message:
								'You have reached your specified API usage limits. You will regain access on 2026-09-01.'
						}),
						{ status: 400, headers: { 'Content-Type': 'application/json' } }
					)
			)
		);

		await expect(POST(event as never)).rejects.toMatchObject({
			status: 400,
			body: {
				message:
					'You have reached your specified API usage limits. You will regain access on 2026-09-01.'
			}
		});
	});

	it('falls back to the generic message when the upstream error body has none', async () => {
		getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
		const { event } = buildEvent({ Authorization: 'Bearer good-token' });
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () =>
					new Response('{}', { status: 503, headers: { 'Content-Type': 'application/json' } })
			)
		);

		await expect(POST(event as never)).rejects.toMatchObject({
			status: 503,
			body: { message: 'Error communicating with the backend API' }
		});
	});

	it('does not leak the upstream failure reason to the caller', async () => {
		getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
		const { event } = buildEvent({ Authorization: 'Bearer good-token' });
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new Error('connect ECONNREFUSED 10.0.0.4:8080');
			})
		);

		await expect(POST(event as never)).rejects.toMatchObject({
			status: 500,
			body: { message: 'Internal Server Error' }
		});
	});

	// Regression guard: the upstream hop is server-to-server. It must go
	// through the platform's global `fetch`, not SvelteKit's `event.fetch` --
	// `event.fetch` forwards the inbound browser request's headers (including
	// `Origin`) to the outgoing call, and the Railway backend's origin
	// allow-list answers a forwarded browser origin with 403. A request with
	// no `Origin` at all is explicitly permitted by that allow-list.
	it('calls the global fetch, not event.fetch -- a future revert to event.fetch is what would forward the browser Origin', async () => {
		getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
		const { event, upstream, eventFetch } = buildEvent({
			Authorization: 'Bearer good-token',
			Origin: 'http://localhost:5173'
		});

		await POST(event as never);

		expect(upstream).toHaveBeenCalledOnce();
		// Load-bearing: this is what actually proves no Origin was forwarded,
		// and what a revert to event.fetch would trip.
		expect(eventFetch).not.toHaveBeenCalled();

		// NOT load-bearing on its own: the handler always builds an explicit
		// headers literal (Content-Type, Authorization only), so this passes
		// under any such implementation regardless of eventFetch. SvelteKit's
		// Origin injection happens on the Request object event.fetch builds
		// internally, not on the init.headers a caller passes -- this
		// assertion documents that shape, it doesn't independently prove
		// Origin-forwarding didn't happen.
		const [, init] = upstream.mock.calls[0];
		expect(new Headers(init?.headers).has('origin')).toBe(false);
	});
});
