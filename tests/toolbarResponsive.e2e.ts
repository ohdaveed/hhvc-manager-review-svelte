import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * The canvas toolbar must fit the window it is in.
 *
 * Measured before this was pinned: at 375x812 the Karl button ran past the
 * right edge while `document.documentElement.scrollWidth` stayed clean, because
 * `main` and the shell are `overflow: hidden` and clip it. So the page-overflow
 * check alone cannot see this bug; the toolbar's own controls are measured too.
 *
 * At 1440x900 with both rails open the bar wrapped onto two rows: flex-wrap
 * breaks lines on each group's max-content width, which counted the whole
 * untruncated sf.gov URL and the page-type badge. One row is the contract.
 *
 * Rows are counted by vertical overlap, not by distinct `top` values: the
 * controls range from 16px to 44px tall under `items-center`, so their tops
 * differ even when they share a row.
 */
// A Transaction with a slug as long as the one this was written against
// (lookup-residential-health-code-violations, merged away under C1).
const PAGE = '/review/find-residential-hotel-and-shelter-records';

const toolbarControls = (page: Page) =>
	page.locator('nav.review-toolbar').evaluate((nav) =>
		[
			...nav.querySelectorAll(
				'a, button:not([role="radio"]), [aria-current], [data-testid="preview-width"], [role="group"], span.truncate'
			)
		]
			.map((el) => el.getBoundingClientRect())
			.filter((r) => r.width > 0)
			.map((r) => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom }))
	);

test('fits a 375px phone window: no overflow, every control on screen', async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 812 });
	await page.goto(PAGE);

	const nav = page.locator('nav.review-toolbar');
	await expect(nav.getByRole('button', { name: 'Karl views' })).toBeVisible();

	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= document.documentElement.clientWidth
		)
	).toBe(true);
	expect(await nav.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);

	const controls = await toolbarControls(page);
	expect(controls.length).toBeGreaterThan(3);
	for (const r of controls) {
		expect(r.left).toBeGreaterThanOrEqual(0);
		expect(r.right).toBeLessThanOrEqual(375);
	}
});

test('keeps every toolbar control on one row at 1440x900 with both rails open', async ({
	page
}) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto(PAGE);

	await expect(page.locator('.queue-rail')).toBeVisible();
	await expect(page.locator('.panel-rail')).toBeVisible();
	await expect(
		page.locator('nav.review-toolbar').getByRole('button', { name: 'Karl views' })
	).toBeVisible();

	const controls = await toolbarControls(page);
	expect(controls.length).toBeGreaterThan(3);
	// One row: some horizontal line passes through every control.
	const lowestTop = Math.max(...controls.map((r) => r.top));
	const highestBottom = Math.min(...controls.map((r) => r.bottom));
	expect(lowestTop).toBeLessThan(highestBottom);
});
