import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { PAGE_ROWS, gotoSignedIn, signedIn } from './signedIn';

/**
 * Editing copy from the Fields panel, in the real renderer: typing changes the
 * mockup, Save persists, and a saved edit is on the mockup after a reload.
 *
 * Routes registered after `signedIn` take precedence over its catch-all
 * (Playwright matches in reverse registration order), which is how these
 * override `latest_edits` and accept the `edits` insert -- so those tests call
 * `signedIn`, then route, then navigate, rather than `gotoSignedIn`, which
 * would register the catch-all last.
 */
const PAGE = '/review/report-garbage-clutter-or-overgrown-plants';
const ROW = PAGE_ROWS[0];
const mockupTitle = (page: Page) =>
	page.getByRole('region', { name: 'Mockup preview' }).locator('[data-rewrite-field="title"]');

test('a saved edit is on the mockup when the page loads', async ({ page }) => {
	await signedIn(page);
	await page.route('**/rest/v1/latest_edits**', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify([
				{
					id: '00000000-0000-4000-8000-000000000299',
					page_id: ROW.id,
					field_id: 'title',
					new_content: 'Title saved in an earlier session',
					created_at: '2026-11-26T00:00:00Z'
				}
			])
		})
	);
	await page.goto(PAGE);
	await expect(page.getByText('Viewing signed out.')).toHaveCount(0);
	await expect(mockupTitle(page)).toHaveText('Title saved in an earlier session');
});

test('typing in the Fields panel edits the mockup, and Save persists it', async ({ page }) => {
	const inserts: unknown[] = [];
	await signedIn(page);
	await page.route('**/rest/v1/edits**', (route) => {
		const body = route.request().postDataJSON();
		inserts.push(body);
		return route.fulfill({
			status: 201,
			contentType: 'application/json',
			body: JSON.stringify({
				id: '00000000-0000-4000-8000-000000000300',
				created_at: '2026-11-26T01:00:00Z',
				...body
			})
		});
	});
	await page.goto(PAGE);
	await expect(page.getByText('Viewing signed out.')).toHaveCount(0);

	await mockupTitle(page).click();
	const input = page.getByRole('textbox', { name: /Title$/ });
	await expect(input).toBeVisible();
	await input.fill('Report trash and overgrown plants');
	await expect(mockupTitle(page)).toContainText('Report trash and overgrown plants');

	await page.getByRole('button', { name: 'Save the edit to Title' }).click();
	await expect(page.getByRole('button', { name: 'Save the edit to Title' })).toHaveCount(0);
	expect(inserts).toEqual([
		expect.objectContaining({
			page_id: ROW.id,
			field_id: 'title',
			new_content: 'Report trash and overgrown plants'
		})
	]);
	await expect(mockupTitle(page)).toContainText('Report trash and overgrown plants');
});

test('Escape in the Fields panel puts the original copy back', async ({ page }) => {
	await gotoSignedIn(page, PAGE);
	const before = await mockupTitle(page).textContent();
	await mockupTitle(page).click();
	const input = page.getByRole('textbox', { name: /Title$/ });
	await input.fill('Something else');
	await expect(mockupTitle(page)).toContainText('Something else');
	await input.press('Escape');
	await expect(mockupTitle(page)).not.toContainText('Something else');
	await expect(mockupTitle(page)).toContainText((before ?? '').trim());
});
