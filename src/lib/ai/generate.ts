import { supabase } from '$lib/supabase';

/**
 * Calls the AI proxy on behalf of the signed-in user.
 *
 * The proxy attaches the backend token server-side and rejects callers without
 * a valid Supabase session, so the access token has to travel with the request.
 */
export async function requestGeneration(payload: Record<string, unknown>, signal?: AbortSignal) {
	const {
		data: { session }
	} = await supabase.auth.getSession();
	if (!session) throw new Error('You must be signed in to use AI assistance.');

	const res = await fetch('/api/ai/generate', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${session.access_token}`
		},
		body: JSON.stringify(payload),
		// Optional, so every existing caller is unaffected. A Rethink runs an
		// order of magnitude longer than a field rewrite and offers Cancel.
		signal
	});

	if (!res.ok) throw new Error('API Error');
	return res.json();
}
