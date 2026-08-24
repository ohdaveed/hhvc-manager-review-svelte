import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSession = vi.fn();

vi.mock('$lib/supabase', () => ({
	supabase: { auth: { getSession } }
}));

const { requestGeneration } = await import('./generate');

describe('requestGeneration', () => {
	beforeEach(() => {
		getSession.mockReset();
		vi.unstubAllGlobals();
	});

	it('sends the signed-in user access token to the endpoint', async () => {
		getSession.mockResolvedValue({ data: { session: { access_token: 'token-abc' } } });
		const fetchSpy = vi.fn(
			async () =>
				new Response(JSON.stringify({ result: { rewrittenText: 'tidy' } }), { status: 200 })
		);
		vi.stubGlobal('fetch', fetchSpy);

		const data = await requestGeneration({ task: 'rewrite-field', fieldText: 'hello' });

		expect(data).toEqual({ result: { rewrittenText: 'tidy' } });
		const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('/api/ai/generate');
		expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-abc');
	});

	it('does not call the endpoint when there is no session', async () => {
		getSession.mockResolvedValue({ data: { session: null } });
		const fetchSpy = vi.fn();
		vi.stubGlobal('fetch', fetchSpy);

		await expect(requestGeneration({ task: 'rewrite-field' })).rejects.toThrow(/signed in/i);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('passes an abort signal to fetch when one is given', async () => {
		getSession.mockResolvedValue({ data: { session: { access_token: 'token-abc' } } });
		const fetchSpy = vi.fn(async () => new Response('{}', { status: 200 }));
		vi.stubGlobal('fetch', fetchSpy);
		const controller = new AbortController();

		await requestGeneration({ task: 'rewrite-field', fieldText: 'hi' }, controller.signal);

		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(init.signal).toBe(controller.signal);
	});
});
