import { supabase } from '$lib/supabase';

/**
 * Thrown when the proxy (or the backend it forwards to) answers with a
 * non-OK status. Carries the HTTP status so a caller -- the Rethink provider
 * fallback, for one -- can tell a usage cap from a refusal from a caller-side
 * problem, and carries the backend's own message when the response body has
 * one: the bare `new Error('API Error')` this replaces discarded both, and
 * "API Error" is the literal string a reviewer saw during live verification
 * of the provider cap.
 */
export class GenerationError extends Error {
	readonly status: number;

	constructor(status: number, message: string) {
		super(message);
		this.name = 'GenerationError';
		this.status = status;
	}
}

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

	if (!res.ok) {
		const body: unknown = await res.json().catch(() => null);
		const backendMessage =
			body &&
			typeof body === 'object' &&
			typeof (body as { message?: unknown }).message === 'string'
				? (body as { message: string }).message
				: '';
		throw new GenerationError(
			res.status,
			backendMessage || `Request failed with status ${res.status}.`
		);
	}
	return res.json();
}
