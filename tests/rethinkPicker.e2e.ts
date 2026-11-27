/**
 * Choosing a section to rethink, in the real renderer.
 *
 * The Rethink tab used to send the reviewer to the mockup for a "Rethink
 * section" button. On most pages none is on the first screen, and since
 * 2026-11-27 the buttons further down are hidden until hovered, so the tab
 * pointed at a control that was nowhere to be seen. The tab now lists the
 * page's sections itself, and the mockup's buttons show while it is open.
 */
import { expect, test } from './fixtures';
import { gotoSignedIn } from './signedIn';

const PAGE = '/review/report-garbage-clutter-or-overgrown-plants';

const opacities = (buttons: ReturnType<import('@playwright/test').Page['locator']>) =>
	buttons.evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));

test('the Rethink tab lists the sections, and picking one readies the request', async ({
	page
}) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await gotoSignedIn(page, PAGE);
	const onPage = page.locator('#mockPage .rethink-section');
	const count = await onPage.count();
	expect(count).toBeGreaterThan(0);

	// On any other tab the mockup's buttons wait for the pointer.
	await page.mouse.move(1300, 700);
	expect(await opacities(onPage)).toEqual(Array(count).fill('0'));

	await page.getByRole('radio', { name: 'Rethink' }).click();
	const picker = page.getByRole('list', { name: 'Sections on this page' });
	await expect(picker.getByRole('button')).toHaveCount(count);
	// ...and show at rest while this tab is open.
	await expect.poll(() => opacities(onPage)).toEqual(Array(count).fill('1'));

	const first = picker.getByRole('button').first();
	const name = (await first.innerText()).trim();
	await first.click();
	await expect(page.getByRole('button', { name: 'Rethink this section' })).toBeVisible();
	await expect(page.locator('#reviewPanel')).toContainText(name);
	// The same selection the mockup's own button makes.
	await expect(page.locator('#mockPage .rethink-section[aria-pressed="true"]')).toHaveCount(1);

	await page.getByRole('button', { name: 'Change section' }).click();
	await expect(picker).toBeVisible();
});

test('"Rethink section" on the mockup opens a collapsed review panel', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	// Queue open, so the panel is collapsed: the rails are exclusive.
	await gotoSignedIn(page, PAGE, { rail: 'queue' });
	await expect(page.getByRole('button', { name: 'Expand review panel' })).toBeVisible();

	const section = page.locator('#mockPage .page-section', {
		has: page.locator('.rethink-section')
	});
	await section.first().hover();
	await section.first().locator('.rethink-section').click();

	await expect(page.getByRole('button', { name: 'Rethink this section' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Expand queue' })).toBeVisible();
});
