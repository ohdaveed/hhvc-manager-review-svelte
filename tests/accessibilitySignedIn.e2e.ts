import AxeBuilder from '@axe-core/playwright';
// Type-only, which the tests/e2eFixtureImports guard allows: it binds nothing
// at runtime, so it cannot bypass the fixture that `test` carries.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { DRAFT_IDS, gotoSignedIn } from './signedIn';

/**
 * The axe gate, over the surfaces only a signed-in reviewer sees.
 *
 * `tests/accessibility.e2e.ts` scans the mockups, which render from the static
 * corpus and therefore render signed out. Everything the TOOL puts around them
 * -- the queue, the decision controls, the checks list, the fields panel --
 * needs review data, so none of it was ever in a page axe looked at. That gap
 * had already cost us a real WCAG AA failure: `--color-sfds-slate-l2` measured
 * 4.08:1 on the selected queue row against its `#edf4f7` tint, below the 4.5
 * floor, while this gate reported green.
 *
 * `tests/signedIn.ts` explains why the state is stubbed at the HTTP boundary
 * rather than signed in for real. The short version: e2e runs a production
 * build, where `ensureDevSession` is dead code by design, and CI has no
 * Supabase project to sign in to.
 *
 * Each test proves the surface RENDERED before it scans. A panel that silently
 * showed its empty state would scan clean and reinstate the blind spot under a
 * new name, which is the one failure mode this file exists to prevent.
 */
const RULES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** The row `signedIn.ts` gives `page_checks` and an edit. */
const PAGE = '/review/report-garbage-filth-vegetation';

const noViolations = async (page: Page) => {
	const { violations } = await new AxeBuilder({ page }).withTags(RULES).analyze();
	expect(
		violations,
		violations.map((v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.help}`).join('\n')
	).toEqual([]);
};

test('no WCAG 2.1 AA violations in the signed-in queue and decision panel', async ({ page }) => {
	await gotoSignedIn(page, PAGE);

	// The queue's four status groups and the decision controls, which only
	// exist for a signed-in reviewer.
	await expect(page.getByRole('heading', { name: 'Manager Review' })).toBeVisible();
	// Radios, not buttons: the decision is a single choice, and `ReviewPanel`
	// models it as a radiogroup. Asserting the wrong role here failed loudly,
	// which is the point of asserting the surface rendered at all.
	await expect(page.getByRole('radio', { name: 'Approve' })).toBeEnabled();
	await expect(page.getByText('67%')).toBeVisible();

	await noViolations(page);
});

test('no WCAG 2.1 AA violations in the page checks under the decision', async ({ page }) => {
	await gotoSignedIn(page, PAGE);

	// No tab click: the page checks live under the decision, on the default
	// tab. The separate "Checks" tab this test used to open rendered the SAME
	// component with `showOnlyChecks`, which is why the note here used to warn
	// about an unscoped locator matching a hidden second copy. One tab was a
	// strict subset of another; it is gone, and so is the duplicate.
	await expect(page.getByRole('tab', { name: 'Decision' })).toHaveAttribute('data-state', 'active');

	// `page_checks` rows, which exist on this page only in the fixture.
	await expect(page.getByRole('tabpanel')).toContainText('2 images have no alt text.');

	await noViolations(page);
});

test('no WCAG 2.1 AA violations in the Fields panel with a field selected', async ({ page }) => {
	await gotoSignedIn(page, PAGE);

	// Selecting copy in the mockup is what opens this panel; signed out the
	// same click yields a panel that cannot offer to save anything.
	await page.locator('[data-rewrite-field]').first().click();
	await expect(page.getByRole('tab', { name: /Fields/ })).toHaveAttribute('data-state', 'active');

	await noViolations(page);
});

test('no WCAG 2.1 AA violations in the Analysis panel', async ({ page }) => {
	await gotoSignedIn(page, PAGE);
	await page.getByRole('tab', { name: 'Analysis' }).click();
	await expect(page.getByRole('tabpanel')).toContainText(/Readability|Findings|accessibility/i);

	await noViolations(page);
});

test('no WCAG 2.1 AA violations in the signed-in Karl walkthrough', async ({ page }) => {
	await gotoSignedIn(page, PAGE);
	await page.getByRole('button', { name: 'Open Karl walkthrough' }).click();
	await page.waitForSelector('.drawer');

	// Signed in the steps carry the reviewer's edits, so this is not the same
	// render the signed-out walkthrough test covers.
	await expect(page.locator('.drawer')).toBeVisible();

	await noViolations(page);
});

test('no WCAG 2.1 AA violations on the signed-in landing page', async ({ page }) => {
	await gotoSignedIn(page, '/', { drafts: true });

	// The progress line and Continue link only exist once the review loaded,
	// and the list only names drafts once `draft_pages` did.
	await expect(page.getByRole('link', { name: /^Continue to / })).toBeVisible();
	await expect(
		page
			.getByRole('region', { name: 'All pages' })
			.getByRole('link', { name: 'Report a leaking roof' })
	).toBeVisible();

	await noViolations(page);
});

// One scan per banner state: each renders different copy and colours, so the
// `ready` banner passing says nothing about the failure alert or stale notice.
const DRAFT_STATES = [
	['ready', 'requested by you'],
	['drafting', 'Drafting this page…'],
	['stale', 'This draft stopped before finishing.'],
	['failed', 'The draft could not be generated.']
] as const;

for (const [state, proof] of DRAFT_STATES) {
	test(`no WCAG 2.1 AA violations on a ${state} draft page`, async ({ page }) => {
		await gotoSignedIn(page, `/review/draft/${DRAFT_IDS[state]}`, { drafts: true });

		await expect(page.getByRole('complementary', { name: 'AI draft' })).toContainText(proof);
		if (state === 'ready') await expect(page.getByText('Before you report').first()).toBeVisible();

		await noViolations(page);
	});
}
