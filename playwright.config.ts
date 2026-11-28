import { defineConfig } from '@playwright/test';

export default defineConfig({
	// Locally, reuse a preview already on :4173 instead of rebuilding for every
	// run -- start one with `bun run build && bun run preview` and re-run specs
	// against it. Rebuild after changing code, or the run tests the old build.
	// CI always builds fresh.
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173,
		reuseExistingServer: !process.env.CI
	},
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

	// CI: `github` turns each failure into an annotation on the PR naming the
	// spec and assertion, where the run summary otherwise said only "exit code
	// 1". `html` is what writes playwright-report/ -- the default CI reporter
	// writes nothing there, so the failure upload in pr.yml had been empty
	// (run 46124489150: "No files were found with the provided path"). Locally
	// `list` stays, since an html report opening on every failure is noise.
	reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',

	// The workflow uploads playwright-report/ on failure, but with tracing off
	// that artifact carries little beyond a stack. Recording on the retry costs
	// nothing on a green run and makes the upload worth having.
	use: { trace: 'on-first-retry' }
});
