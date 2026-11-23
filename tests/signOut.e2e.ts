import { expect, test } from './fixtures';
import { signedIn } from './signedIn';

/**
 * The workspace says who is signed in and offers a way out without leaving
 * the page; the banner and read-only mode follow `onAuthStateChange`. The
 * address is the stub's fake one from `tests/signedIn.ts`.
 */
const PAGE = '/review/report-garbage-filth-vegetation';

test('shows the signed-in address and signs out in place', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
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

test('a long address truncates instead of widening the rail', async ({ page }) => {
	const long = 'a.very.long.reviewer.address.for.testing@example.test';
	await page.setViewportSize({ width: 1440, height: 900 });
	await signedIn(page);
	// Wraps the stub's session shim and swaps in a longer fake address.
	await page.addInitScript((email) => {
		const read = Storage.prototype.getItem;
		Storage.prototype.getItem = function (key: string) {
			const value = read.call(this, key);
			if (!value || !/^sb-.*-auth-token$/.test(key)) return value;
			const session = JSON.parse(value);
			session.user.email = email;
			return JSON.stringify(session);
		};
	}, long);
	await page.goto(PAGE);

	const email = page.getByTestId('signed-in-email');
	await expect(email).toHaveAttribute('title', long);
	const m = await email.evaluate((el) => {
		const rail = el.closest('.queue-rail') as HTMLElement;
		return {
			emailScroll: el.scrollWidth,
			emailClient: el.clientWidth,
			railScroll: rail.scrollWidth,
			railClient: rail.clientWidth
		};
	});
	expect(m.emailScroll).toBeGreaterThan(m.emailClient);
	expect(m.railScroll).toBeLessThanOrEqual(m.railClient);
	await expect(page.getByRole('button', { name: 'Sign out' })).toBeInViewport();
});
