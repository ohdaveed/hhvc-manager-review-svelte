import { env } from '$env/dynamic/private';
import { error, json } from '@sveltejs/kit';

export async function POST({ request, fetch }) {
	try {
		const payload = await request.json();

		const apiUrl = env.RAILWAY_API_URL || 'https://web-production-9bb3b.up.railway.app';
		const apiToken = env.RAILWAY_API_TOKEN;

		// Forward the request to the Railway backend
		const railwayResponse = await fetch(`${apiUrl}/api/ai/generate`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(apiToken ? { 'Authorization': `Bearer ${apiToken}` } : {})
			},
			body: JSON.stringify(payload)
		});

		if (!railwayResponse.ok) {
			const errorData = await railwayResponse.json().catch(() => ({}));
			console.error('Railway API error:', errorData);
			throw error(railwayResponse.status, errorData.error || 'Error communicating with the backend API');
		}

		// Return the JSON response directly to the client
		const data = await railwayResponse.json();
		return json(data);
	} catch (err) {
		console.error('Chat API Error:', err);
		throw error(500, err instanceof Error ? err.message : 'Internal Server Error');
	}
}
