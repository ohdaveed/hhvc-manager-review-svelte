import { expect, test } from './fixtures';
import { signedIn } from './signedIn';

/**
 * The workspace says who is signed in and offers a way out without leaving
 * the page; the banner and read-only mode follow `onAuthStateChange`. The
 * address is the stub's fake one from `tests/signedIn.ts`.
 */
const PAGE = '/review/report-garbage-filth-vegetation';

test('shows the signed-in address and signs out in place', async ({ page }) => {
	// Wide enough that the queue rail, which holds the control, starts open.
	await page.setViewportSize({ width: 1700, height: 900 });
	await signedIn(page);
	await page.goto(PAGE);

	const email = page.getByTestId('signed-in-email');
	await expect(email).toHaveText('e2e@hhvc.test');
	await expect(email).toHaveAttribute('title', 'e2e@hhvc.test');
	await expect(page.getByText('Viewing signed out.')).toHaveCount(0);

	const url = page.url();
	await page.getByRole('button', { name: 'Sign out' }).click();

	await expect(page.getByText('Viewing signed out.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Sign out' })).toHaveCount(0);
	expect(page.url()).toBe(url);
});

test('the queue sheet carries the sign-out control on a phone', async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 812 });
	await signedIn(page);
	await page.goto(PAGE);
	await page.getByRole('button', { name: 'Queue', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
});

test('starts the queue collapsed at 1440 until the reviewer chooses', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto(PAGE);
	const rail = page.locator('.queue-rail');
	await expect(rail.getByRole('button', { name: 'Expand queue' })).toBeVisible();

	await rail.getByRole('button', { name: 'Expand queue' }).click();
	await expect(rail.getByRole('button', { name: 'Collapse queue' })).toBeVisible();

	await page.reload();
	await expect(rail.getByRole('button', { name: 'Collapse queue' })).toBeVisible();
});
