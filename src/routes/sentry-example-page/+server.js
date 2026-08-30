// This is just a very simple API route that throws an example error.
// Feel free to delete this file and the entire sentry route.

// Keep the example page from exposing an endpoint that can manufacture Sentry events.
export const GET = async () => {
	return new Response(null, { status: 404 });
};
