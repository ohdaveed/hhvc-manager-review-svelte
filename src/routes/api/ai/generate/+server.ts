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

export async function POST({ request, fetch }) {
	// Outside the try: a thrown HttpError is not an Error instance, so the
	// catch below would otherwise flatten this 401 into a 500.
	await requireUser(request);

	try {
		const payload = await request.json();

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
