import { describe, expect, it, vi, beforeEach } from 'vitest';

const getUser = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
	createClient: () => ({ auth: { getUser } })
}));

const { POST } = await import('./+server');

/** Builds a POST event whose `fetch` records calls to the upstream backend. */
function buildEvent(
	headers: Record<string, string> = {},
	payload: unknown = { task: 'rewrite-field', fieldText: 'hello' }
) {
	const upstream = vi.fn(
		async () =>
			new Response(JSON.stringify({ result: { rewrittenText: 'ok' } }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			})
	);

	const request = new Request('http://localhost/api/ai/generate', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...headers },
		body: JSON.stringify(payload)
	});

	return { event: { request, fetch: upstream }, upstream };
}

describe('POST /api/ai/generate', () => {
	beforeEach(() => {
		getUser.mockReset();
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

	it('does not leak the upstream failure reason to the caller', async () => {
		getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
		const { event } = buildEvent({ Authorization: 'Bearer good-token' });
		event.fetch = vi.fn(async () => {
			throw new Error('connect ECONNREFUSED 10.0.0.4:8080');
		});

		await expect(POST(event as never)).rejects.toMatchObject({
			status: 500,
			body: { message: 'Internal Server Error' }
		});
	});
});
