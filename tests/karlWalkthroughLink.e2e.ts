import { expect, test } from './fixtures';
import { gotoSignedIn } from './signedIn';

/**
 * `?view=walkthrough` opens a review page with the Karl walkthrough running,
 * and the URL follows the view both ways: entering adds it, so the address bar
 * is a link to the walkthrough; Exit strips it, so a reload lands on the
 * mockup rather than back in the drawer.
 */
const PAGE = '/review/report-garbage-clutter-or-overgrown-plants';

test('the deep link opens the walkthrough, and Exit takes the parameter away', async ({ page }) => {
	await page.goto(`${PAGE}?view=walkthrough`);
	await expect(page.locator('.drawer')).toBeVisible();
	await expect(page.getByRole('navigation', { name: 'Walkthrough' })).toBeVisible();

	await page.getByRole('button', { name: 'Exit walkthrough' }).click();
	await expect(page.locator('.drawer')).toHaveCount(0);
	await expect(page).toHaveURL(new RegExp(`${PAGE}$`));

	await page.reload();
	await expect(page.getByRole('button', { name: 'Start the Karl walkthrough' })).toBeVisible();
	await expect(page.locator('.drawer')).toHaveCount(0);
});

test('opening the walkthrough puts it in the URL, and a reload keeps it', async ({ page }) => {
	await page.goto(PAGE);
	await page.getByRole('button', { name: 'Start the Karl walkthrough' }).click();
	await expect(page.locator('.drawer')).toBeVisible();
	await expect(page).toHaveURL(new RegExp(`${PAGE}\\?view=walkthrough$`));

	await page.reload();
	await expect(page.locator('.drawer')).toBeVisible();
});

test('any other view value is ignored', async ({ page }) => {
	await page.goto(`${PAGE}?view=nonsense`);
	await expect(page.getByRole('button', { name: 'Start the Karl walkthrough' })).toBeVisible();
	await expect(page.locator('.drawer')).toHaveCount(0);
});

test('the home page links an approved page straight into its walkthrough', async ({ page }) => {
	// `decidedFirst`: the default fixture has no approved pages to link.
	await gotoSignedIn(page, '/', { decidedFirst: true });
	const list = page.getByRole('region', { name: 'All pages' });
	const first = list.getByRole('link', { name: /^Move to Karl: / }).first();
	await expect(first).toBeVisible();
	await first.click();
	await expect(page).toHaveURL(/\/review\/.+\?view=walkthrough$/);
	await expect(page.locator('.drawer')).toBeVisible();
});
