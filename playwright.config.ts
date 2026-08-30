import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: { command: 'npm run build && npm run preview', port: 4173 },
	testMatch: '**/*.e2e.{ts,js}',

	// A stray `test.only` cuts the run to one test and still reports green.
	// `e2e` is a required check under ruleset `main: require CI`, so that is the
	// gate silently disappearing rather than failing -- the same failure mode
	// pr.yml's actionlint step guards against for the workflow file itself.
	forbidOnly: !!process.env.CI,

	// One retry in CI only. A single flake should not block a merge, and a test
	// that fails twice is a real failure. Locally a retry would only hide a flake
	// from whoever is writing the test.
	retries: process.env.CI ? 1 : 0,

	// The workflow uploads playwright-report/ on failure, but with tracing off
	// that artifact carries little beyond a stack. Recording on the retry costs
	// nothing on a green run and makes the upload worth having.
	use: { trace: 'on-first-retry' }
});
