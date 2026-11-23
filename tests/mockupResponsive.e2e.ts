import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

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
 *
 * Under the default "Fit", a pane narrower than 1024px no longer reflows: the
 * frame lays out at 1024px and zooms down (`fitScale`), so the reviewer sees
 * the desktop layout. Below half scale (a phone window) it shows the phone
 * layout instead, and a pane narrower than a real phone lays out at 390px and
 * zooms down (`fitFrame`) rather than reflowing at a width no phone has.
 */
const PAGE = '/review/report-garbage-filth-vegetation';

const frameWidth = (page: Page) =>
	page.locator('.mockup-frame').evaluate((el) => Math.round(el.getBoundingClientRect().width));

const footerColumnCount = (page: Page) =>
	page
		.locator('.footer-grid')
		.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);

const overflows = (page: Page) =>
	page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

test.describe('the mockup scales with the space it has', () => {
	test('grows past the old 880px cap on a large screen, keeping the reading measure', async ({
		page
	}) => {
		await page.setViewportSize({ width: 2560, height: 1200 });
		await page.goto(PAGE);

		expect(await frameWidth(page)).toBeGreaterThan(1200);
		// SF.gov sets body copy to a fixed measure; a wider frame must widen the
		// chrome, not the prose. 616px is 7 of 12 columns of its 1076px grid,
		// measured on live sf.gov at 1280px (2026-11-22).
		const column = await page
			.locator('#mockPage .page-content')
			.evaluate((el) => Math.round(el.getBoundingClientRect().width));
		expect(column).toBe(616);
		expect(await footerColumnCount(page)).toBe(4);
		expect(await overflows(page)).toBe(false);
	});

	test('keeps the desktop layout under Fit, scaled down, when the pane is under 1024px', async ({
		page
	}) => {
		await page.setViewportSize({ width: 834, height: 1112 });
		await page.goto(PAGE);

		// The pane is ~754px. Letting the frame shrink to it used to reflow into
		// the tablet layout, so reviewers approved tablet without knowing. Fit now
		// lays out at 1024px and zooms down, and the readout says so.
		expect(await footerColumnCount(page)).toBe(4);
		await expect(page.getByTestId('preview-width')).toContainText(/Desktop · \d+%/);
		expect(await overflows(page)).toBe(false);
	});

	test('reaches the tablet layout when the frame is tablet width, not when the window is', async ({
		page
	}) => {
		await page.setViewportSize({ width: 834, height: 1112 });
		await page.goto(PAGE);
		await page.getByRole('radio', { name: 'Tablet width, 768px' }).click();

		// The window is 834px either way; what decides the layout is the frame.
		await expect.poll(() => footerColumnCount(page)).toBe(2);
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
		// The pane is narrower than 390px, so Fit zooms a real phone width into
		// it; the readout must say so rather than report a reflow.
		await expect(page.getByTestId('preview-width')).toContainText(/Phone · \d+%/);
		expect(await overflows(page)).toBe(false);
	});
});
