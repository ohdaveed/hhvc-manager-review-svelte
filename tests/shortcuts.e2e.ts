/**
 * The workspace's keyboard shortcuts and the toolbar's Queue button, in the
 * real renderer and signed in through the stub.
 *
 * A key here records a review decision, so the tests that matter most are the
 * ones where it must NOT: while typing, on another tab, and switched off.
 */
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { gotoSignedIn } from './signedIn';

// Undecided in the stub, and first in its section, so there is a next page.
const PAGE = '/review/report-garbage-clutter-or-overgrown-plants';

const badge = (page: Page) => page.getByTestId('toolbar-status');
// Scoped to the pinned decision: the Fix tab's tool switch is a radio group too.
const chosen = (page: Page) =>
	page.locator('#reviewPanel footer [role="radio"][aria-checked="true"]');
/** Put focus on the page itself, where a reviewer's keys land after a click. */
const blur = (page: Page) =>
	page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

test.beforeEach(async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await gotoSignedIn(page, PAGE);
	await expect(badge(page)).toHaveText('Undecided');
	await blur(page);
});

test('A, R, B and U record the decision, shown in the panel and the toolbar', async ({ page }) => {
	for (const [key, label] of [
		['a', 'Approved'],
		['r', 'Needs revision'],
		['b', 'Blocked']
	] as const) {
		await page.keyboard.press(key);
		await expect(chosen(page)).toHaveText(label);
		await expect(badge(page)).toHaveText(label);
	}

	// Undecided presses nothing: the control has three options, not four.
	await page.keyboard.press('u');
	await expect(chosen(page)).toHaveCount(0);
	await expect(badge(page)).toHaveText('Undecided');
});

test('typing, and keys meant for the browser, never record a decision', async ({ page }) => {
	await page.getByRole('tab', { name: /^Notes/ }).click();
	const notes = page.getByRole('textbox', { name: 'Feedback' });
	await notes.click();
	await page.keyboard.type('a bar');
	await expect(notes).toHaveValue('a bar');
	await expect(badge(page)).toHaveText('Undecided');

	await blur(page);
	await page.keyboard.press('Control+a');
	await expect(badge(page)).toHaveText('Undecided');
});

// The decision is pinned under every tab, so it leaves the screen only when
// the panel's rail is collapsed.
test('the keys work only while the decision is on screen', async ({ page }) => {
	await page.getByRole('button', { name: 'Collapse review panel' }).click();
	await blur(page);
	await page.keyboard.press('a');
	await expect(badge(page)).toHaveText('Undecided');

	await page.getByRole('button', { name: 'Expand review panel' }).click();
	await blur(page);
	await page.keyboard.press('a');
	await expect(badge(page)).toHaveText('Approved');
});

test('the keys can be turned off, and stay off after a reload', async ({ page }) => {
	const keys = page.getByRole('checkbox', { name: /^Keys:/ });
	await expect(keys).toBeChecked();
	await keys.uncheck();
	await blur(page);
	await page.keyboard.press('a');
	await page.keyboard.press(']');
	await expect(badge(page)).toHaveText('Undecided');
	await expect(page).toHaveURL(new RegExp(`${PAGE}$`));

	await page.reload();
	await expect(page.getByRole('checkbox', { name: /^Keys:/ })).not.toBeChecked();
});

test('] opens the next undecided page', async ({ page }) => {
	// Undecided, the link to the next undecided page reads "Skip for now".
	const next = page.getByRole('link', { name: /^Skip for now:/ });
	const href = await next.getAttribute('href');
	expect(href).toBeTruthy();
	await page.keyboard.press(']');
	await expect(page).toHaveURL(new RegExp(`${href}$`));
});

test('the Queue button says how far the review is, and \\ opens and closes the queue', async ({
	page
}) => {
	const queue = page.getByRole('button', { name: /^Queue/ });
	// The stub's four decided rows, over every page a reviewer can open.
	await expect(queue).toHaveAccessibleName(/^Queue 4 of \d+ decided$/);
	await expect(queue).toContainText(/4\/\d+/);

	await queue.click();
	await expect(page.locator('nav[aria-label="Pages in this review"]')).toBeVisible();
	// Open, the rail has its own collapse control; the toolbar button steps aside.
	await expect(queue).toHaveCount(0);

	await blur(page);
	await page.keyboard.press('\\');
	await expect(page.locator('#reviewQueueRail')).toBeHidden();
	await expect(queue).toBeVisible();
	await page.keyboard.press('\\');
	await expect(page.locator('nav[aria-label="Pages in this review"]')).toBeVisible();
});

test('a narrow toolbar keeps the Queue button as an icon, still named', async ({ page }) => {
	// 1100px leaves the bar 720px: measured, the labelled button wrapped it.
	await page.setViewportSize({ width: 1100, height: 800 });
	const queue = page.getByRole('button', { name: /^Queue/ });
	await expect(queue).toBeVisible();
	expect((await queue.boundingBox())!.width).toBeLessThan(40);
	const bar = await page.locator('nav.review-toolbar').boundingBox();
	expect(bar!.height).toBeLessThanOrEqual(48);
});
