import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pagesByKey } from '$lib/data';

const env: Record<string, string | undefined> = {};
vi.mock('$env/dynamic/private', () => ({ env }));
vi.mock('$env/static/public', () => ({
	SVELTE_PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co',
	SVELTE_PUBLIC_SUPABASE_ANON_KEY: 'anon'
}));

const getUser = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
	createClient: () => ({ auth: { getUser } })
}));

const { POST } = await import('./+server');

const fetchMock = vi.fn();

/** A Gemini `generateContent` response carrying `object` as its JSON answer. */
function geminiReply(object: unknown, extra: object = {}) {
	return new Response(
		JSON.stringify({
			candidates: [
				{ content: { parts: [{ text: JSON.stringify(object) }] }, finishReason: 'STOP' }
			],
			usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
			modelVersion: 'gemini-test',
			...extra
		}),
		{ status: 200 }
	);
}

/** Calls the route; resolves with the HTTP status and body, thrown HttpErrors included. */
async function call(body: unknown, { token = 'good' }: { token?: string | null } = {}) {
	const request = new Request('http://localhost/api/ai/generate', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {})
		},
		body: typeof body === 'string' ? body : JSON.stringify(body)
	});
	try {
		const res = await POST({ request } as never);
		return { status: res.status, body: await res.json() };
	} catch (err) {
		const e = err as { status?: number; body?: { message?: string } };
		if (typeof e?.status !== 'number') throw err;
		return { status: e.status, body: e.body };
	}
}

/** The JSON body of the Nth request sent to Gemini. */
const sent = (n: number) => JSON.parse(fetchMock.mock.calls[n][1].body as string);

beforeEach(() => {
	env.GEMINI_API_KEY = 'test-key';
	delete env.GEMINI_MODEL;
	getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
	fetchMock.mockReset();
	getUser.mockReset();
	vi.unstubAllGlobals();
});

describe('POST /api/ai/generate', () => {
	it('401s without a bearer token, before calling the model', async () => {
		const res = await call({ task: 'rewrite-field', fieldText: 'x' }, { token: null });
		expect(res.status).toBe(401);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('401s when Supabase rejects the token', async () => {
		getUser.mockResolvedValue({ data: { user: null }, error: new Error('bad jwt') });
		const res = await call({ task: 'rewrite-field', fieldText: 'x' });
		expect(res.status).toBe(401);
	});

	it('413s on an oversized body', async () => {
		const res = await call('x'.repeat(64 * 1024 + 1));
		expect(res.status).toBe(413);
	});

	it('400s on a schema violation and names the field', async () => {
		const res = await call({ task: 'rewrite-field', fieldText: 'x'.repeat(8001) });
		expect(res.status).toBe(400);
		expect(res.body?.message).toMatch(/fieldText/);
	});

	it('400s on a provider other than gemini', async () => {
		const res = await call({ task: 'content', provider: 'claude', prompt: 'x' });
		expect(res.status).toBe(400);
		expect(res.body?.message).toMatch(/provider/);
	});

	it('501s when no Gemini key is configured', async () => {
		delete env.GEMINI_API_KEY;
		const res = await call({ task: 'rewrite-field', fieldText: 'Report rats.' });
		expect(res.status).toBe(501);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('rewrites a field through Gemini, grounded and schema-constrained', async () => {
		fetchMock.mockResolvedValueOnce(geminiReply({ rewrittenText: 'Report rats to 311.' }));

		const res = await call({
			task: 'rewrite-field',
			provider: 'gemini',
			fieldText: 'Please contact us in order to report rats.'
		});

		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({
			task: 'rewrite-field',
			provider: 'gemini',
			model: 'gemini-test',
			attempts: 1,
			valid: true,
			result: { rewrittenText: 'Report rats to 311.' }
		});
		expect(res.body.disclosure).toMatch(/AI-assisted draft/);
		expect(res.body.groundedBy).toEqual([
			'writing-and-style.md',
			'content-types-and-components.md'
		]);

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toContain('/models/gemini-pro-latest:generateContent');
		expect(init.headers['x-goog-api-key']).toBe('test-key');
		const body = sent(0);
		expect(body.generationConfig.responseMimeType).toBe('application/json');
		expect(body.generationConfig.responseJsonSchema.required).toEqual(['rewrittenText']);
		expect(body.systemInstruction.parts[0].text).toContain(
			'<document name="writing-and-style.md">'
		);
	});

	it('honours GEMINI_MODEL', async () => {
		env.GEMINI_MODEL = 'gemini-flash-latest';
		fetchMock.mockResolvedValueOnce(geminiReply({ rewrittenText: 'Report rats.' }));
		await call({ task: 'rewrite-field', fieldText: 'Report the rats.' });
		expect(fetchMock.mock.calls[0][0]).toContain('/models/gemini-flash-latest:generateContent');
	});

	it('retries once with the failures named when a draft fails validation', async () => {
		const fieldText = 'Call [311](https://sf311.org) to report rats.';
		fetchMock
			.mockResolvedValueOnce(geminiReply({ rewrittenText: 'Call 311 to report rats.' }))
			.mockResolvedValueOnce(geminiReply({ rewrittenText: fieldText }));

		const res = await call({ task: 'rewrite-field', fieldText });

		expect(res.status).toBe(200);
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(res.body).toMatchObject({ attempts: 2, valid: true, issues: [] });
		expect(res.body.usage.totalTokens).toBe(30);
		expect(sent(1).contents[0].parts[0].text).toContain('Call 311 to report rats.');
	});

	it('generates page content and validates it against the corpus', async () => {
		const [, existing] = Object.entries(pagesByKey)[0];
		fetchMock.mockResolvedValueOnce(geminiReply(existing));

		const res = await call({ task: 'content', prompt: 'Tighten this page.' });

		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ task: 'content', attempts: 1, valid: true });
		expect(sent(0).generationConfig.responseJsonSchema.type).toBe('object');
	});

	it('maps a Gemini safety block to 422, without a second model call', async () => {
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ promptFeedback: { blockReason: 'SAFETY' } }), { status: 200 })
		);
		const res = await call({ task: 'rewrite-field', fieldText: 'Report rats.' });
		expect(res.status).toBe(422);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('retries a 429 once, then reports it as a 502 naming the upstream status', async () => {
		fetchMock
			.mockResolvedValueOnce(new Response('{}', { status: 429 }))
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ error: { message: 'quota' } }), { status: 429 })
			);
		const res = await call({ task: 'rewrite-field', fieldText: 'Report rats.' });
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(res.status).toBe(502);
		expect(res.body?.message).toMatch(/429/);
	});

	it('does not retry a non-transient provider error', async () => {
		fetchMock.mockResolvedValueOnce(new Response('{}', { status: 400 }));
		const res = await call({ task: 'rewrite-field', fieldText: 'Report rats.' });
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(res.status).toBe(502);
	});

	it('rejects the compliance-audit task, whose retrieval index did not move here', async () => {
		const [, existing] = Object.entries(pagesByKey)[0];
		const res = await call({ task: 'compliance-audit', page: existing });
		expect(res.status).toBe(400);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('accepts field text exactly at the 8,000-character cap', async () => {
		fetchMock.mockResolvedValueOnce(geminiReply({ rewrittenText: 'Short.' }));
		const res = await call({ task: 'rewrite-field', fieldText: 'a'.repeat(8000) });
		expect(res.status).not.toBe(400);
		expect(fetchMock).toHaveBeenCalled();
	});

	it('rejects an instruction one over the 2,000-character cap', async () => {
		const res = await call({
			task: 'rewrite-field',
			fieldText: 'Report rats.',
			instruction: 'x'.repeat(2001)
		});
		expect(res.status).toBe(400);
		expect(res.body?.message).toMatch(/instruction/);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('does not leak a network failure reason to the caller', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		fetchMock.mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.4:8080'));
		const res = await call({ task: 'rewrite-field', fieldText: 'Report rats.' });
		expect(res).toEqual({ status: 500, body: { message: 'Internal Server Error' } });
		consoleError.mockRestore();
	});

	it('reports a truncated answer as a 502 with its explanation', async () => {
		fetchMock.mockResolvedValueOnce(
			new Response(
				JSON.stringify({ candidates: [{ content: { parts: [] }, finishReason: 'MAX_TOKENS' }] }),
				{ status: 200 }
			)
		);
		const res = await call({ task: 'rewrite-field', fieldText: 'Report rats.' });
		expect(res.status).toBe(502);
		expect(res.body?.message).toMatch(/output limit/);
	});

	it('sends no browser Origin to Gemini', async () => {
		fetchMock.mockResolvedValueOnce(geminiReply({ rewrittenText: 'Report rats.' }));
		await call({ task: 'rewrite-field', fieldText: 'Report the rats.' });
		expect(new Headers(fetchMock.mock.calls[0][1].headers).has('origin')).toBe(false);
	});

	it("passes the caller's abort signal to Gemini, so a Cancel stops generation", async () => {
		fetchMock.mockResolvedValueOnce(geminiReply({ rewrittenText: 'Report rats.' }));
		await call({ task: 'rewrite-field', fieldText: 'Report the rats.' });
		const { signal } = fetchMock.mock.calls[0][1];
		expect(signal).toBeInstanceOf(AbortSignal);
		expect(signal.aborted).toBe(false);
	});

	it('answers a cancelled request with 499, not the catch-all 500', async () => {
		fetchMock.mockRejectedValue(
			Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' })
		);
		const res = await call({ task: 'rewrite-field', fieldText: 'Report rats.' });
		expect(res.status).toBe(499);
	});
});
