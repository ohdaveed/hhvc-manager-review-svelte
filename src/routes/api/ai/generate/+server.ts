import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { error, json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';

/**
 * Verifies the caller's Supabase session. Without this the route is an open
 * relay: it attaches RAILWAY_API_TOKEN to whatever it is handed.
 */
async function requireUser(request: Request) {
	const header = request.headers.get('Authorization');
	const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
	if (!token) throw error(401, 'Unauthorized');

	// Per-request client: no session is persisted or refreshed on the server.
	const supabase = createClient(publicEnv.SVELTE_PUBLIC_SUPABASE_SERVER_URL || publicEnv.SVELTE_PUBLIC_SUPABASE_URL, publicEnv.SVELTE_PUBLIC_SUPABASE_ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});

	const {
		data: { user },
		error: authError
	} = await supabase.auth.getUser(token);
	if (authError || !user) throw error(401, 'Unauthorized');
}

/**
 * Caps on what a single caller can push through to the metered AI backend.
 *
 * The two character limits are the BACKEND's, mirrored here rather than chosen:
 * `build_scripts/ai/schemas.js` in HHVC_manager_review_current_tool_package
 * declares `fieldText: z.string().min(1).max(8000)` and
 * `instruction: z.string().max(2000).optional()`. This route used to allow
 * 20,000 and no instruction check at all, so it forwarded payloads the backend
 * answers with a 400 "Invalid request" -- which reaches the reviewer as a bare
 * `API Error`. Rejecting them here costs a round trip and names the field.
 *
 * `MAX_BODY_BYTES` is this route's own: it bounds the request before parsing,
 * which is the only cap that can apply to a body it has not read yet.
 */
const MAX_BODY_BYTES = 64 * 1024;
const MAX_FIELD_TEXT_CHARS = 8_000;
const MAX_INSTRUCTION_CHARS = 2_000;

/**
 * Pulls a human-readable message out of the backend's error body, when it has
 * one. Without this, every upstream failure reached the reviewer as the same
 * generic sentence -- including the exact provider-usage-cap text that made
 * this worth fixing ("You have reached your specified API usage limits...").
 * The shape isn't pinned to one schema on purpose: an Anthropic-style
 * envelope nests it under `error.message`, other backends may just say
 * `message`. Falls back to the previous generic text when neither is present
 * or the body isn't JSON at all.
 */
function extractBackendMessage(errorData: unknown): string {
	const GENERIC = 'Error communicating with the backend API';
	if (!errorData || typeof errorData !== 'object') return GENERIC;
	const data = errorData as Record<string, unknown>;
	if (typeof data.message === 'string' && data.message) return data.message;
	if (data.error && typeof data.error === 'object') {
		const nested = (data.error as Record<string, unknown>).message;
		if (typeof nested === 'string' && nested) return nested;
	}
	if (typeof data.error === 'string' && data.error) return data.error;
	return GENERIC;
}

// `fetch` is deliberately NOT destructured from the event here. SvelteKit's
// `event.fetch` forwards the inbound browser request's headers -- including
// `Origin` -- onto requests it makes, which is what you want for same-origin
// calls made on a visitor's behalf. This call is different: it is a
// server-to-server hop to the Railway backend, made with a server-held
// token the browser never sees. The backend's origin allow-list answers a
// forwarded browser `Origin` with 403 `{"error":"Origin is not allowed."}`,
// but explicitly permits a request with no `Origin` header at all (its own
// docs: "requests without Origin are non-browser or same-origin clients").
// Using the platform's global `fetch` instead of `event.fetch` sends no
// `Origin`, so the backend accepts it. Do not "tidy" this back to
// `{ request, fetch }` -- that reintroduces the 403.
export async function POST({ request }) {
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

		if (typeof payload.fieldText === 'string' && payload.fieldText.length > MAX_FIELD_TEXT_CHARS) {
			throw error(400, 'Field text too long');
		}

		if (
			typeof payload.instruction === 'string' &&
			payload.instruction.length > MAX_INSTRUCTION_CHARS
		) {
			throw error(400, 'Instruction too long');
		}

		const apiUrl = env.RAILWAY_API_URL || 'https://web-production-9bb3b.up.railway.app';
		const apiToken = env.RAILWAY_API_TOKEN;

		// Forward the request to the Railway backend.
		//
		// `signal` carries the caller's cancellation across the hop. Without
		// it a Cancel aborted the browser-to-proxy leg only and the backend
		// generated on regardless -- and that backend budgets its own work on
		// `req.signal` (`AbortSignal.any([req.signal, timeout])`), so the
		// abort has to actually arrive for any of that to engage. Whether the
		// hosting platform propagates a client disconnect into `request.signal`
		// is its business, not this handler's; forwarding is what this side owes.
		const railwayResponse = await fetch(`${apiUrl}/api/ai/generate`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {})
			},
			body: JSON.stringify(payload),
			signal: request.signal
		});

		if (!railwayResponse.ok) {
			const errorData: unknown = await railwayResponse.json().catch(() => ({}));
			console.error('Railway API error:', errorData);
			throw error(railwayResponse.status, extractBackendMessage(errorData));
		}

		// Return the JSON response directly to the client
		const data = await railwayResponse.json();
		return json(data);
	} catch (err) {
		// Rethrow deliberate HTTP errors so upstream status codes survive.
		if (typeof err === 'object' && err !== null && 'status' in err) throw err;

		// A cancelled request is not a fault. An AbortError carries no `status`,
		// so without this it fell straight through to the 500 below: every
		// Cancel logged as an internal error and answered with a status that
		// says the server broke. Checked after the HttpError rethrow so it
		// cannot shadow a real upstream status from extractBackendMessage.
		if (typeof err === 'object' && err !== null && (err as Error).name === 'AbortError') {
			throw error(499, 'Request cancelled');
		}

		console.error('AI generate API error:', err);
		throw error(500, 'Internal Server Error');
	}
}
