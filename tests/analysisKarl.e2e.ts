/**
 * The Analysis panel's Reading Level and Link Targets cards, in the real renderer.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures';
import { gotoSignedIn } from './signedIn';

const RULES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

test('the Analysis panel shows Reading Level, Link Targets filters, and passes axe', async ({
	page
}) => {
	await page.setViewportSize({ width: 1280, height: 900 });
	await gotoSignedIn(page, '/review/report-rats-or-mice');
	await page.getByRole('tab', { name: 'Analysis' }).click();

	const panel = page.getByRole('tabpanel');
	await expect(panel.getByRole('heading', { name: 'Reading Level' })).toBeVisible();
	await expect(panel.getByRole('button', { name: 'Highlight on page' })).toBeVisible();
	await expect(panel.getByRole('heading', { name: 'Link Targets' })).toBeVisible();

	await panel.getByRole('button', { name: /External/i }).click();
	await panel.getByRole('button', { name: /All/i }).click();

	const { violations } = await new AxeBuilder({ page }).withTags(RULES).analyze();
	expect(
		violations,
		violations.map((v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.help}`).join('\n')
	).toEqual([]);
});
