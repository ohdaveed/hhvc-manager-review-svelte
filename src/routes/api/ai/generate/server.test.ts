import { describe, expect, it, vi, beforeEach } from 'vitest';

const getUser = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
	createClient: () => ({ auth: { getUser } })
}));

const { POST } = await import('./+server');

/** Builds a POST event whose `fetch` records calls to the upstream backend. */
function buildEvent(headers: Record<string, string> = {}) {
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
		body: JSON.stringify({ task: 'rewrite-field', fieldText: 'hello' })
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
