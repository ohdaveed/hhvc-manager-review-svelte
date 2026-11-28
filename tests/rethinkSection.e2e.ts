/**
 * The mockup's "Rethink section" buttons and the Rethink tab, in the real
 * renderer.
 *
 * The buttons are hidden until hovered, so a reviewer on the Rethink tab would
 * have nothing on screen to choose a section with. They show at rest while
 * that tab is open, and using one opens the review panel on it.
 *
 * The tab asks the assistant for page suggestions as soon as it opens, so each
 * test answers that request itself: the signed-in session here is a stub the
 * real endpoint would refuse.
 */
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { gotoSignedIn } from './signedIn';

const PAGE = '/review/report-garbage-clutter-or-overgrown-plants';

const opacities = (buttons: ReturnType<Page['locator']>) =>
	buttons.evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));

const stubSuggestions = (page: Page) =>
	page.route('**/api/ai/generate', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				task: 'page-suggestions',
				model: 'gemini-3.1-flash-lite',
				disclosure: 'AI-assisted draft.',
				result: {
					plainLanguage: 'Shorten sentences in the opening summary.',
					structure: 'Move steps above background details.',
					codeAndScope: 'Map this section to an Information block in Karl.'
				}
			})
		})
	);

test('the mockup shows its "Rethink section" buttons while the Rethink tab is open', async ({
	page
}) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await stubSuggestions(page);
	await gotoSignedIn(page, PAGE);
	const onPage = page.locator('#mockPage .rethink-section');
	const count = await onPage.count();
	expect(count).toBeGreaterThan(0);

	// On any other tab the mockup's buttons wait for the pointer.
	await page.mouse.move(1300, 700);
	expect(await opacities(onPage)).toEqual(Array(count).fill('0'));

	await page.getByRole('tab', { name: 'Rethink' }).click();
	// ...and show at rest while this tab is open.
	await expect.poll(() => opacities(onPage)).toEqual(Array(count).fill('1'));
	await expect(
		page.getByRole('tabpanel').getByText('Plain language', { exact: true })
	).toBeVisible();
});

test('"Rethink section" on the mockup opens a collapsed review panel on the Rethink tab', async ({
	page
}) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await stubSuggestions(page);
	// Queue open, so the panel is collapsed: the rails are exclusive.
	await gotoSignedIn(page, PAGE, { rail: 'queue' });
	await expect(page.getByRole('button', { name: 'Expand review panel' })).toBeVisible();

	const section = page.locator('#mockPage .page-section', {
		has: page.locator('.rethink-section')
	});
	await section.first().hover();
	await section.first().locator('.rethink-section').click();

	await expect(page.getByRole('tab', { name: 'Rethink' })).toHaveAttribute('aria-selected', 'true');
	await expect(
		page.getByRole('tabpanel').getByText('Plain language', { exact: true })
	).toBeVisible();
	await expect(page.locator('#mockPage .rethink-section[aria-pressed="true"]')).toHaveCount(1);
	await expect(page.getByRole('button', { name: 'Expand queue' })).toBeVisible();
});
