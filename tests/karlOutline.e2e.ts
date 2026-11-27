/**
 * The Karl outline, in the real renderer.
 *
 * Unit tests pin what `placementsFor` decides; these check what a reviewer
 * actually gets: the switch reachable by keyboard, chips and outlines on the
 * three pilot pages, no WCAG 2.1 AA violation with the outline ON (its tints
 * and outlines are new colour on the page), the switch surviving a reload,
 * a signed-out reader still able to use it, and no outline on a draft.
 *
 * Screenshots go to `KARL_SHOTS` when it is set, so a person can look at them;
 * they assert nothing.
 */
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { DRAFT_IDS, gotoSignedIn } from './signedIn';

const RULES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const PILOTS = [
	{
		slug: 'report-rats-or-mice',
		// 3 sections since the Health Code section folded into What to know (2026-11-26).
		summary: '3 sections go into Karl.',
		sections: { placed: 4, unconfirmed: 0, unplaced: 0 }
	},
	{
		slug: 'information-what-happens-after-you-report-housing-pest-problem',
		// 6 sections since "Who can report" took the shared report text (2026-11-25);
		// 10 since "If a problem is found" split into three sections (2026-11-26);
		// 9 since "If a deadline is missed" moved to the owner page (2026-11-26).
		summary: '9 sections go into Karl.',
		sections: { placed: 9, unplaced: 0 }
	},
	{
		slug: 'property-owner-responsibilities-hhvc',
		summary: '4 sections: 3 go into Karl, 1 needs a fix.',
		sections: { placed: 3, 'needs-fix': 1 }
	},
	{
		// Rollout step 1: Step by step. Intro is an inferred mapping, and Step by
		// step has no Related panel.
		slug: 'step-by-step-report-a-pest-problem',
		summary: '2 sections: 1 goes into Karl, 1 unconfirmed.',
		sections: { placed: 1, unconfirmed: 1, unplaced: 0 }
	},
	{
		// Rollout step 2: Topic. Related (U5) has no panel; only Digital
		// Services can create a Topic page, which the summary says first.
		slug: 'topics--healthy-housing-conditions',
		// 8 sections since the Topic merge folded both hubs in (2026-11-25), plus
		// the prevention Resources block for the ported education pages; 10 since
		// Programs and workshops split out of Learn more (2026-11-26).
		summary: '10 sections go into Karl. 1 detail is unconfirmed.',
		caveat: 'Only SF.gov Digital Services can create a new Topic page.',
		sections: { placed: 10, unplaced: 0 }
	},
	{
		// Rollout step 3: Campaign. About PLACEHOLDER text needs a fix (the
		// 26-character spotlight button was shortened on 2026-11-27); "Start with
		// your own block" has no panel.
		slug: 'rat-free-blocks',
		summary: '6 sections go into Karl. 1 detail needs a fix.',
		sections: { placed: 6, unplaced: 0 }
	},
	{
		// Two callouts Karl has no Campaign component for; Contact us unconfirmed.
		slug: 'integrated-pest-management-education',
		summary: '7 sections go into Karl. 2 details need a fix, 1 detail is unconfirmed.',
		sections: { placed: 7 }
	},
	{
		// Rollout step 4: Report. The Related list lands in Content (no Related
		// panel); 18 PLACEHOLDER table cells.
		slug: 'report-healthy-housing-inspections-annual-summary',
		summary: '6 sections: 5 go into Karl, 1 needs a fix. 18 details need a fix.',
		sections: { placed: 5, 'needs-fix': 1 }
	},
	{
		// Rollout step 5: Agency. Four Subsection intro paragraphs have no field
		// (U20); the sections themselves place.
		slug: 'departments--healthy-housing-and-vector-control',
		summary: '6 sections go into Karl.',
		sections: { placed: 6 }
	},
	{
		// Rollout step 6: Location. Every mapping is inferred (U26); the address
		// and hours are placeholders, and belong in the Address snippet.
		slug: 'location-environmental-health-office',
		summary: '5 sections: 1 needs a fix, 4 unconfirmed. 5 details need a fix.',
		caveat: 'A Location’s address and opening hours come from its Address snippet',
		sections: { 'needs-fix': 1, unconfirmed: 4 }
	},
	{
		// Rollout step 7: About us, the last type the corpus uses.
		slug: 'departments--healthy-housing-and-vector-control--about',
		summary: '4 sections go into Karl.',
		caveat: 'Karl adds a button to this department’s Agency page that links here automatically',
		sections: { placed: 4 }
	}
] as const;

const noViolations = async (page: Page) => {
	const { violations } = await new AxeBuilder({ page }).withTags(RULES).analyze();
	expect(
		violations,
		violations.map((v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.help}`).join('\n')
	).toEqual([]);
};

/** Turn the outline on the way a keyboard user would, from the panel's Karl strip. */
async function switchOnByKeyboard(page: Page) {
	const toggle = page
		.getByRole('group', { name: 'Karl views' })
		.getByRole('switch', { name: 'Show Karl fields' });
	await expect(toggle).toBeVisible();
	await toggle.focus();
	await page.keyboard.press('Space');
	await expect(toggle).toBeChecked();
	await expect(toggle).toBeFocused();
}

const shoot = async (page: Page, name: string) => {
	const dir = process.env.KARL_SHOTS;
	if (dir) await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
};

test.describe('Karl outline', () => {
	for (const pilot of PILOTS) {
		test(`${pilot.slug}: chips, outlines and summary, AA at 1280 and 375`, async ({ page }) => {
			await page.setViewportSize({ width: 1280, height: 900 });
			await gotoSignedIn(page, `/review/${pilot.slug}`);
			await expect(page.locator('.karl-outline-summary')).toHaveCount(0);

			await switchOnByKeyboard(page);

			const summary = page.locator('.karl-outline-summary');
			if ('caveat' in pilot) {
				await expect(summary).toContainText(`Karl outline: ${pilot.summary}`);
				await expect(summary).toContainText(`Before you start: ${pilot.caveat}`);
			} else {
				await expect(summary).toHaveText(`Karl outline: ${pilot.summary}`);
			}
			for (const [status, n] of Object.entries(pilot.sections)) {
				await expect(
					page.locator(`#mockPage [data-karl-section][data-karl-status="${status}"]`)
				).toHaveCount(n);
			}
			await noViolations(page);
			await shoot(page, `karl-outline-${pilot.slug}-1280`);

			await page.setViewportSize({ width: 375, height: 812 });
			await expect(page.locator('.karl-outline-summary')).toBeVisible();
			await noViolations(page);
			await shoot(page, `karl-outline-${pilot.slug}-375`);
		});
	}

	test('a field with a reason of its own describes it to a screen reader', async ({ page }) => {
		// This used to be the rats report's "View Article 11" button, which had no
		// Karl home (U1). Since the 2026-11-26 audit nothing in the corpus is
		// unplaced, so the field with a reason of its own is a needs-fix one; the
		// one-chip-per-unmapped-field rule is covered by placement.test.ts. It was
		// the owners Spotlight button until that was shortened to fit Karl's 25
		// characters on 2026-11-27; the PLACEHOLDER paragraph is the one left.
		await gotoSignedIn(page, '/review/rat-free-blocks');
		await switchOnByKeyboard(page);
		const target = page.locator(
			'button[data-rewrite-field="sections.about-this-campaign.paragraphs.1"]'
		);
		await expect(target).toHaveAccessibleDescription(/Still holds PLACEHOLDER text/);
	});

	test('stays on across pages and a reload', async ({ page }) => {
		await gotoSignedIn(page, '/review/report-rats-or-mice');
		await switchOnByKeyboard(page);
		await page.reload();
		await page.waitForLoadState('networkidle');
		await expect(page.locator('.karl-outline-summary')).toBeVisible();
	});

	test('with the review panel collapsed, the canvas offers its own way to hide it', async ({
		page
	}) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto('/review/report-rats-or-mice');
		await page.waitForLoadState('networkidle');
		const pill = page.locator('.karl-outline-pill');
		await switchOnByKeyboard(page);
		// The switch is on screen beside the canvas, so the pill would only repeat it.
		await expect(pill).toBeHidden();
		await page.getByRole('button', { name: 'Collapse review panel' }).click();
		await expect(pill).toBeVisible();
		await pill.getByRole('button', { name: 'Hide' }).click();
		await expect(page.locator('.karl-outline-summary')).toHaveCount(0);
		await expect(pill).toHaveCount(0);
	});

	test('works signed out, from the base copy', async ({ page }) => {
		await page.goto('/review/property-owner-responsibilities-hhvc');
		await page.waitForLoadState('networkidle');
		await switchOnByKeyboard(page);
		await expect(page.locator('.karl-outline-summary')).toContainText('1 needs a fix');
		await noViolations(page);
	});

	test('is not offered on an AI-drafted page', async ({ page }) => {
		await gotoSignedIn(page, `/review/draft/${DRAFT_IDS.ready}`, { drafts: true });
		await expect(page.getByRole('group', { name: 'Karl views' })).toHaveCount(0);
		await expect(
			page.getByRole('button', { name: /^(Start|Resume) the Karl walkthrough$/ })
		).toBeVisible();
		await expect(page.locator('[data-karl-status]')).toHaveCount(0);
	});
});
