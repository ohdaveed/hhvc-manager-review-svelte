/**
 * The Analysis panel's Karl findings, in the real renderer.
 *
 * They are derived from the same placements the Karl outline draws, so the two
 * views give one answer. This checks the panel shows them, groups them, and
 * still passes axe. A screenshot goes to `KARL_SHOTS` when it is set.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures';
import { gotoSignedIn } from './signedIn';

const RULES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

test('the Analysis panel shows where the page lands in Karl', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 });
	await gotoSignedIn(page, '/review/report-rats-mice-four-legged-problems');
	await page.getByRole('tab', { name: 'Analysis' }).click();

	const panel = page.getByRole('tabpanel');
	await expect(panel).toContainText('Copy that won’t carry over');
	await expect(panel).toContainText('Karl rules not settled');
	await expect(panel).toContainText('URL pattern');
	await expect(panel).toContainText('What to do section');

	const { violations } = await new AxeBuilder({ page }).withTags(RULES).analyze();
	expect(
		violations,
		violations.map((v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.help}`).join('\n')
	).toEqual([]);

	const dir = process.env.KARL_SHOTS;
	if (dir) await panel.screenshot({ path: `${dir}/analysis-karl-rats-1280.png` });
});

test('a Transaction with no What to do section is flagged in the panel', async ({ page }) => {
	await gotoSignedIn(page, '/review/find-complaints-and-inspection-records');
	await page.getByRole('tab', { name: 'Analysis' }).click();
	await expect(page.getByRole('tabpanel')).toContainText('No What to do section');
});

test('the Transaction review findings show in the panel', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 });
	await gotoSignedIn(page, '/review/pay-your-annual-healthy-housing-fee-apartment-buildings');
	await page.getByRole('tab', { name: 'Analysis' }).click();
	const panel = page.getByRole('tabpanel');
	await expect(panel).toContainText('Title words in the description');
	await expect(panel).toContainText('not Resource Collection pages');

	const dir = process.env.KARL_SHOTS;
	if (dir) {
		const card = panel.getByText('Title words in the description').locator('xpath=../..');
		await card.scrollIntoViewIfNeeded();
		await page.screenshot({ path: `${dir}/analysis-karl-fee-1280.png` });
	}

	await gotoSignedIn(page, '/review/pay-healthy-housing-citation');
	await page.getByRole('tab', { name: 'Analysis' }).click();
	await expect(panel).toContainText('A Transaction should let people act');
	await expect(panel).toContainText('remove “a”');
	if (dir) {
		await panel.getByText('A Transaction should let people act').scrollIntoViewIfNeeded();
		await page.screenshot({ path: `${dir}/analysis-karl-citation-1280.png` });
	}
});
