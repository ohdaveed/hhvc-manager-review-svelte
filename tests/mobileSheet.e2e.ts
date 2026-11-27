import { expect, test } from './fixtures';
import { gotoSignedIn } from './signedIn';

/**
 * Below 1024px the queue and the review panel open as sheets over the canvas.
 * Open, a sheet is a modal dialog: everything else is `inert`, focus moves in,
 * its own control closes it, and focus goes back to the button that opened it.
 *
 * Each of these failed silently before it was fixed -- focus left behind the
 * sheet in content `inert` made unreachable, a "Collapse" button that flipped
 * the persisted desktop setting instead of closing, a desktop left inert after
 * the window widened -- so they are pinned here rather than trusted.
 */
const PAGE = '/review/report-garbage-clutter-or-overgrown-plants';

for (const sheet of [
	{ trigger: /^Review/, panel: '#reviewPanel', close: 'Close review panel' },
	// Signed in, the button's name goes on to say how far the review is.
	{ trigger: /^Queue/, panel: '#reviewQueueRail', close: 'Close queue' }
]) {
	test(`the ${sheet.close.replace('Close ', '')} sheet is a modal dialog`, async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await gotoSignedIn(page, PAGE);

		const trigger = page.getByRole('button', { name: sheet.trigger, exact: true });
		await trigger.click();

		const panel = page.locator(sheet.panel);
		await expect(panel).toHaveAttribute('role', 'dialog');
		await expect(panel).toHaveAttribute('aria-modal', 'true');
		await expect(page.locator('main')).toHaveJSProperty('inert', true);
		await expect(page.locator('.skip-to-panel')).toHaveJSProperty('inert', true);
		expect(await panel.evaluate((el) => el.contains(document.activeElement))).toBe(true);

		// Its own control closes it; it is not the desktop "Collapse".
		await panel.getByRole('button', { name: sheet.close }).click();
		await expect(panel).not.toHaveAttribute('role', 'dialog');
		await expect(page.locator('main')).toHaveJSProperty('inert', false);
		await expect(trigger).toBeFocused();

		// Escape closes it too, and returns focus the same way.
		await trigger.click();
		await expect(panel).toHaveAttribute('role', 'dialog');
		await page.keyboard.press('Escape');
		await expect(panel).not.toHaveAttribute('role', 'dialog');
		await expect(trigger).toBeFocused();
	});
}

test('widening past 1024px closes an open sheet and lifts inert', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await gotoSignedIn(page, PAGE);
	await page.getByRole('button', { name: /^Review/ }).click();
	await expect(page.locator('#reviewPanel')).toHaveAttribute('role', 'dialog');

	await page.setViewportSize({ width: 1280, height: 800 });
	await expect(page.locator('#reviewPanel')).not.toHaveAttribute('role', 'dialog');
	await expect(page.locator('main')).toHaveJSProperty('inert', false);
	await expect(page.locator('.sheet-backdrop')).toHaveCount(0);
});
