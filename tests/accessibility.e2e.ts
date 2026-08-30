import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures';

/**
 * Accessibility gate.
 *
 * SF.gov is a public-sector property, so WCAG 2.1 AA is an obligation rather
 * than a nicety. This runs in the existing `e2e` job, which the `main: require
 * CI` ruleset already requires — so a regression blocks the merge instead of
 * being noticed later.
 *
 * The edit targets are what prompted it: they were `<p role="button"
 * tabindex="0">` with a click handler and no keyboard handler, which meant a
 * keyboard-only reviewer could not edit anything on a page whose entire purpose
 * is editing.
 */
const RULES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

// Signed out, which is what an unauthenticated Playwright run sees. The mockup
// content is static, so the page renders fully either way.
//
// The list is chosen by MARKUP COVERAGE, not by taste: between them these
// pages render every block type the mockup can produce. Without the last
// three, the gate could not see the table (which is focusable on purpose --
// axe's own `scrollable-region-focusable` requires it), the steps list, the
// definition list behind Top facts, or the What-to-know box's heading order.
const PAGES = [
	'/',
	'/review/departments--healthy-housing-and-vector-control--about',
	// 7 tables, page-level spotlight, cards
	'/review/report-health-code-article-11-plain-language',
	// whatToKnow (Cost + Things to know), cards, steps, section button
	'/review/report-garbage-filth-vegetation',
	// Top facts (<dl>), including an entry flagged unverified
	'/review/mosquito-education-workshop'
];

for (const path of PAGES) {
	test(`no WCAG 2.1 AA violations on ${path}`, async ({ page }) => {
		await page.goto(path);
		await page.waitForLoadState('networkidle');

		const { violations } = await new AxeBuilder({ page }).withTags(RULES).analyze();

		// Name the rules in the failure: "3 violations" sends the next reader to
		// the HTML report, whereas the rule ids usually identify the fix.
		expect(
			violations,
			violations.map((v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.help}`).join('\n')
		).toEqual([]);
	});
}

/**
 * The walkthrough and the site map are VIEWS of the review route, not routes,
 * so the PAGES sweep above cannot reach them -- both need a click. Without
 * these two the axe gate cannot see the drawer's step list, its gap callouts,
 * or the site map's 29 cards and 143 links, which between them are most of
 * what those two features render.
 */
for (const view of [
	{ name: 'Karl walkthrough', open: 'Open Karl walkthrough', ready: '.drawer' },
	{ name: 'site map', open: 'Site map', ready: '.sitemap' }
]) {
	test(`no WCAG 2.1 AA violations in the ${view.name}`, async ({ page }) => {
		await page.goto('/review/report-garbage-filth-vegetation');
		await page.waitForLoadState('networkidle');

		await page.getByRole('button', { name: view.open }).click();
		await page.waitForSelector(view.ready);

		const { violations } = await new AxeBuilder({ page }).withTags(RULES).analyze();

		expect(
			violations,
			violations.map((v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.help}`).join('\n')
		).toEqual([]);
	});
}
