import { SVELTE_PUBLIC_SUPABASE_ANON_KEY, SVELTE_PUBLIC_SUPABASE_URL } from '$env/static/public';
import { error, json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { isConfigured, ModelOutputError, ProviderHttpError } from '$lib/server/ai/gemini';
import { generateContent, generateRewrite } from '$lib/server/ai/generate';
import { ProviderTimeoutError, RefusalError } from '$lib/server/ai/vendor/errors.js';
import { generateRequestSchema } from '$lib/server/ai/vendor/schemas.js';

/**
 * Verifies the caller's Supabase session. Without this the route is an open
 * relay: it spends GEMINI_API_KEY on whatever it is handed.
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
}

/**
 * Bounds the request before parsing -- the only cap that can apply to a body
 * not yet read. Field-level limits (8,000-char `fieldText`/`prompt`, 2,000-char
 * `instruction`, the grounding page's size and depth) are the vendored
 * `generateRequestSchema`'s, the same ones the Railway backend enforced.
 */
const MAX_BODY_BYTES = 64 * 1024;

/** Names the first schema issue, so the reviewer sees which field, not "Invalid request". */
function describeIssue(issue: { path: (string | number)[]; message: string }): string {
	const field = issue.path.join('.') || 'request';
	return `Invalid ${field}: ${issue.message}`;
}

/**
 * Maps a generation failure to the status the Railway backend used, because
 * the Rethink panel and FieldsPanel already key their copy on these:
 * refusal 422, timeout 504, cancel 499, provider HTTP error or unusable
 * model output 502.
 */
function generationError(err: unknown, signal: AbortSignal): never {
	if (err instanceof RefusalError) throw error(422, (err as Error).message);
	if (err instanceof ProviderTimeoutError) throw error(504, 'Generation timed out.');
	const name = (err as { name?: string } | null)?.name;
	if (signal.aborted || name === 'AbortError') throw error(499, 'Request cancelled');
	if (name === 'TimeoutError') throw error(504, 'Generation timed out.');
	if (err instanceof ProviderHttpError) {
		console.error(`Gemini returned ${err.status}:`, err.message);
		throw error(502, `The model provider returned ${err.status}.`);
	}
	if (err instanceof ModelOutputError) throw error(502, err.message);
	// Anything else -- a network failure, a bug -- can carry an internal
	// address or detail, so it is logged here and never echoed to the caller.
	console.error('AI generate error:', err);
	throw error(500, 'Internal Server Error');
}

export async function POST({ request }) {
	// Outside any try: a thrown HttpError is not an Error instance, so a
	// catch-all would otherwise flatten this 401 into a 500.
	await requireUser(request);

	const raw = await request.text();
	if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
		throw error(413, 'Request body too large');
	}

	let body: unknown;
	try {
		body = JSON.parse(raw);
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const parsed = generateRequestSchema.safeParse(body);
	if (!parsed.success) throw error(400, describeIssue(parsed.error.issues[0]));

	if (!isConfigured()) throw error(501, 'AI assistance is not configured on this server.');

	const signal = request.signal;
	const input = parsed.data;
	try {
		if (input.task === 'content') {
			return json(await generateContent({ prompt: input.prompt, page: input.page, signal }));
		}
		if (input.task === 'rewrite-field') {
			return json(
				await generateRewrite({
					fieldText: input.fieldText,
					instruction: input.instruction,
					page: input.page,
					signal
				})
			);
		}
	} catch (err) {
		generationError(err, signal);
	}
	// compliance-audit needs the backend's retrieval index, which did not move here.
	throw error(400, `Task "${input.task}" is not supported.`);
}
