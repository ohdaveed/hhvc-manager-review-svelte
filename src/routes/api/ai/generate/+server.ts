import { env } from '$env/dynamic/private';
import { SVELTE_PUBLIC_SUPABASE_ANON_KEY, SVELTE_PUBLIC_SUPABASE_URL } from '$env/static/public';
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

		// Forward the request to the Railway backend
		const railwayResponse = await fetch(`${apiUrl}/api/ai/generate`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {})
			},
			body: JSON.stringify(payload)
		});

		if (!railwayResponse.ok) {
			const errorData = await railwayResponse.json().catch(() => ({}));
			console.error('Railway API error:', errorData);
			throw error(railwayResponse.status, 'Error communicating with the backend API');
		}

		// Return the JSON response directly to the client
		const data = await railwayResponse.json();
		return json(data);
	} catch (err) {
		// Rethrow deliberate HTTP errors so upstream status codes survive.
		if (typeof err === 'object' && err !== null && 'status' in err) throw err;
		console.error('AI generate API error:', err);
		throw error(500, 'Internal Server Error');
	}
}
