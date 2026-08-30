import * as Sentry from '@sentry/sveltekit';

Sentry.init({
	dsn: 'https://e4c7ea0261da54a48a483333866a05cd@o4511996254093312.ingest.us.sentry.io/4511996261629952',

	tracesSampleRate: 1.0
	// uncomment the line below to enable Spotlight (https://spotlightjs.com)
	// spotlight: import.meta.env.DEV,
});
