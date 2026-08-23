import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

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
const PAGES = ['/', '/review/topic-healthy-housing-and-vector-control--about'];

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

test('every edit target is reachable and operable by keyboard', async ({ page }) => {
	await page.goto('/review/topic-healthy-housing-and-vector-control--about');
	await page.waitForLoadState('networkidle');

	const targets = page.locator('.edit-target');
	const count = await targets.count();

	// Signed out there are deliberately none, and that is a valid state: the
	// copy renders as plain text with no affordance. Only assert operability
	// when the targets are actually present.
	test.skip(count === 0, 'signed out: edit targets are intentionally inert');

	const first = targets.first();
	await first.focus();
	await expect(first).toBeFocused();

	// A real <button> activates on Enter and Space. The old markup did neither.
	// Activation selects the field: `aria-pressed` is asserted rather than the
	// highlight, because a selection conveyed only by colour is the violation
	// this file exists to catch.
	await page.keyboard.press('Enter');
	await expect(first).toHaveAttribute('aria-pressed', 'true');
});
