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
	await gotoSignedIn(page, '/review/report-rats-or-mice');
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

// This page used to be the corpus's "no What to do section" example. C2
// (decided Nov 24, 2026) gave it one, and no corpus Transaction lacks one now,
// so the panel is checked for the pass; karlContentTypeChecks.test.ts covers
// the issue path with fixtures.
test('a Transaction’s What to do section is reported in the panel', async ({ page }) => {
	await gotoSignedIn(page, '/review/find-complaints-and-inspection-records');
	await page.getByRole('tab', { name: 'Analysis' }).click();
	await expect(page.getByRole('tabpanel')).toContainText(
		'This Transaction has a What to do section, headed “What to do”.'
	);
});

// payFee used to carry the corpus's live Related-type finding (a card to a
// Resource Collection); that card moved into its body on 2026-11-26. The one
// left is a Campaign's card to the Agency page, so the panel is checked there.
test('a Related card Karl cannot hold shows in the panel', async ({ page }) => {
	await gotoSignedIn(page, '/review/integrated-pest-management-education');
	await page.getByRole('tab', { name: 'Analysis' }).click();
	await expect(page.getByRole('tabpanel')).toContainText('not Agency pages');
});

test('the Transaction review findings show in the panel', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 });
	await gotoSignedIn(page, '/review/pay-your-annual-healthy-housing-fee-apartment-buildings');
	await page.getByRole('tab', { name: 'Analysis' }).click();
	const panel = page.getByRole('tabpanel');
	await expect(panel).toContainText('Title words in the description');

	const dir = process.env.KARL_SHOTS;
	if (dir) {
		const card = panel.getByText('Title words in the description').locator('xpath=../..');
		await card.scrollIntoViewIfNeeded();
		await page.screenshot({ path: `${dir}/analysis-karl-fee-1280.png` });
	}

	await gotoSignedIn(page, '/review/pay-healthy-housing-citation');
	await page.getByRole('tab', { name: 'Analysis' }).click();
	await expect(panel).toContainText('A Transaction should let people act');
	// C5 dropped the article from this URL, so its old "remove “a”" finding is
	// gone; the placeholder finding is the other one this page still carries.
	await expect(panel).toContainText('Still holds PLACEHOLDER text');
	if (dir) {
		await panel.getByText('A Transaction should let people act').scrollIntoViewIfNeeded();
		await page.screenshot({ path: `${dir}/analysis-karl-citation-1280.png` });
	}
});
