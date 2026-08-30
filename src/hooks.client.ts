import { dev } from '$app/environment';
import * as Sentry from '@sentry/sveltekit';
import { handleErrorWithSentry, replayIntegration } from '@sentry/sveltekit';

Sentry.init({
	dsn: 'https://e4c7ea0261da54a48a483333866a05cd@o4511996254093312.ingest.us.sentry.io/4511996261629952',

	// One Sentry project serves every deploy, so this is the only thing telling
	// a preview's errors apart from production's. Stamped at build time by
	// `deployContext()` in vite.config.ts.
	environment: __SENTRY_ENVIRONMENT__,

	// The wizard ships 1.0 -- every transaction, forever. That is a quota
	// decision nobody makes deliberately, so production samples at 10% and
	// development keeps the full picture where the volume is a handful of
	// requests and the detail is what you want.
	tracesSampleRate: dev ? 1.0 : 0.1,

	// Session replay records what a reviewer does on the page, and what they do
	// here is type copy for SF.gov. Recording a routine editing session is not
	// something to enable by default, so no session is sampled for its own sake
	// -- replay is kept only where it pays for itself, around an actual error.
	replaysSessionSampleRate: 0,
	replaysOnErrorSampleRate: dev ? 0 : 1.0,
	integrations: [replayIntegration()],

	// Both default to sending. `userInfo` carries the signed-in reviewer's
	// identity and `httpBodies` the request payloads -- which for this app are
	// the very copy edits under review, plus whatever is in flight to the AI
	// proxy. Neither is needed to diagnose an error, and the safe setting is
	// the one that does not have to be remembered.
	dataCollection: {
		userInfo: false,
		httpBodies: []
	}
});

// If you have a custom error handler, pass it to `handleErrorWithSentry`
export const handleError = handleErrorWithSentry();
