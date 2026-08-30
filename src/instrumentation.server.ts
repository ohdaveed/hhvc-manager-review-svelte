import * as Sentry from '@sentry/sveltekit';

Sentry.init({
	dsn: 'https://e4c7ea0261da54a48a483333866a05cd@o4511996254093312.ingest.us.sentry.io/4511996261629952',

	// Mirrors hooks.client.ts -- see the reasoning there. Kept in step by hand;
	// the two inits are separate entry points and neither imports the other.
	environment: __SENTRY_ENVIRONMENT__,
	tracesSampleRate: 0.1,

	// The server side of this app is the AI proxy, so a request body here is a
	// reviewer's field text on its way to the backend.
	dataCollection: {
		userInfo: false,
		httpBodies: []
	}
});
