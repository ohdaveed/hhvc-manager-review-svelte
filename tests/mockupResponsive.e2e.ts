import { expect, test } from '@playwright/test';

/**
 * The mockup must reflow on its OWN width, not the window's.
 *
 * SF.gov's components were written against `@media` — the viewport — but the
 * mockup renders inside a pane far narrower than the window. Measured before
 * this was fixed: at a 1280px viewport the frame was 541px while both
 * `matchMedia('(max-width: 900px)')` and `640px` reported false, so the mockup
 * showed a desktop layout at phone width and never reached tablet or mobile at
 * any window size. The frame is now a named container (`mockup`) and the
 * chrome queries it.
 *
 * Two failures this pins, because both were real and neither is obvious:
 *
 * 1. The frame was capped at `max-w-[880px]`, so a 3828px monitor showed a
 *    narrow card in a field of grey.
 * 2. Hiding the rails below 1024px was not enough on its own. The shell is a
 *    CSS grid whose template is an INLINE style, so `display: none` removed the
 *    rails while their grid TRACKS still reserved width — at 390px the canvas
 *    measured 280px and the frame 201px. The template has to collapse too.
 */
const PAGE = '/review/report-garbage-filth-vegetation';

const frameWidth = (page: import('@playwright/test').Page) =>
	page.locator('.mockup-frame').evaluate((el) => Math.round(el.getBoundingClientRect().width));

const footerColumnCount = (page: import('@playwright/test').Page) =>
	page
		.locator('.footer-grid')
		.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);

const overflows = (page: import('@playwright/test').Page) =>
	page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

test.describe('the mockup scales with the space it has', () => {
	test('grows past the old 880px cap on a large screen, keeping the reading measure', async ({
		page
	}) => {
		await page.setViewportSize({ width: 2560, height: 1200 });
		await page.goto(PAGE);

		expect(await frameWidth(page)).toBeGreaterThan(1200);
		// SF.gov sets body copy to a fixed measure; a wider frame must widen the
		// chrome, not the prose.
		const column = await page
			.locator('[class*="max-w-[760px]"]')
			.first()
			.evaluate((el) => Math.round(el.getBoundingClientRect().width));
		expect(column).toBe(760);
		expect(await footerColumnCount(page)).toBe(4);
		expect(await overflows(page)).toBe(false);
	});

	test('reaches the tablet layout when the pane narrows, not when the window does', async ({
		page
	}) => {
		await page.setViewportSize({ width: 834, height: 1112 });
		await page.goto(PAGE);

		// The window is 834px, but what decides the layout is the frame.
		expect(await footerColumnCount(page)).toBe(2);
		expect(await overflows(page)).toBe(false);
	});

	test('reaches the mobile layout, which needs the rails to stop reserving width', async ({
		page
	}) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto(PAGE);

		await expect(page.locator('.queue-rail')).toBeHidden();
		await expect(page.locator('.panel-rail')).toBeHidden();

		// 201px was the frame width when only `display: none` was applied and the
		// grid tracks still held their space. Anything near that means the shell
		// template stopped collapsing.
		expect(await frameWidth(page)).toBeGreaterThan(280);
		expect(await footerColumnCount(page)).toBe(1);
		expect(await overflows(page)).toBe(false);
	});
});
