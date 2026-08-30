import { test as base, expect } from '@playwright/test';

/**
 * The e2e `test` every spec here imports, instead of `@playwright/test`.
 *
 * It adds one auto-fixture: the page is watched for uncaught exceptions,
 * console errors and failed navigations, and the test fails at teardown if any
 * arrived. Nothing in this suite watched for those before, which left a whole
 * class of defect invisible — CLAUDE.md documents the live example, where a
 * `latest_edits` view missing from the database makes the edits hydration fail,
 * "logs to the console and leaves the app rendering". Every gate here passed
 * over that, `verify:live` included, because the page still renders.
 *
 * ## What is deliberately NOT a failure
 *
 * Signed out, the app is EXPECTED to fail its Supabase reads: the mockups come
 * from a static corpus and render fine, while every `TO authenticated` policy
 * denies the review data. That is the documented signed-out state, not a
 * regression, and an unscoped gate would go red on every review page. Measured
 * against the local stack before this was written:
 *
 *   [http 401]      /rest/v1/reviews?select=id&order=created_at.desc&limit=1
 *   [console.error] Failed to load resource: ... 401 (Unauthorized)
 *   [console.error] No review found: {code: 42501, ... permission denied ...}
 *
 * So Supabase's own endpoints are out of scope. They are matched by PATH
 * (`/rest/v1/`, `/auth/v1/`) rather than by host, because the host differs by
 * environment — 127.0.0.1:54321 locally, a placeholder domain in CI, the real
 * project in a preview — and a host-based rule would silently stop matching in
 * one of them.
 *
 * The scoping stays narrow on purpose. A missing view, a broken import or a
 * failed hydration reports a DIFFERENT message and still fails, which is the
 * whole point.
 */
const IGNORED_URL = /\/(rest|auth)\/v1\//;

/** Signed-out review load. The app logs this itself and keeps rendering. */
const IGNORED_TEXT = [/No review found/];

export const test = base.extend<{ failOnPageErrors: void }>({
	failOnPageErrors: [
		async ({ page }, use) => {
			const problems: string[] = [];

			// An uncaught exception is never expected, whatever the URL.
			page.on('pageerror', (error) => {
				problems.push(`uncaught exception: ${error.message}`);
			});

			page.on('console', (message) => {
				if (message.type() !== 'error') return;
				const from = message.location().url ?? '';
				const text = message.text();
				if (IGNORED_URL.test(from)) return;
				if (IGNORED_TEXT.some((pattern) => pattern.test(text))) return;
				problems.push(`console.error: ${text}`);
			});

			// Only the navigation itself. A subresource 4xx is covered by the
			// console rule above; asserting every request here would re-report the
			// Supabase 401 this fixture exists to tolerate.
			page.on('response', (response) => {
				if (response.request().resourceType() !== 'document') return;
				if (response.status() >= 400) {
					problems.push(`HTTP ${response.status()} for ${response.url()}`);
				}
			});

			await use();

			expect(problems, `the page reported ${problems.length} problem(s)`).toEqual([]);
		},
		{ auto: true }
	]
});

export { expect };
