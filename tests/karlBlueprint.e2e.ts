/**
 * The Blueprint view, in the real renderer: the page as its Karl form, empty
 * panels shown as empty, everything unplaced in one tray, and "Show on page"
 * landing on the right element with the outline on. axe runs in the view at a
 * desktop and a phone width. Screenshots go to `KARL_SHOTS` when set.
 */
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { gotoSignedIn } from './signedIn';

const RULES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const noViolations = async (page: Page) => {
	const { violations } = await new AxeBuilder({ page }).withTags(RULES).analyze();
	expect(
		violations,
		violations.map((v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.help}`).join('\n')
	).toEqual([]);
};

const shoot = async (page: Page, name: string) => {
	const dir = process.env.KARL_SHOTS;
	if (dir) await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
};

const shootViewport = async (page: Page, name: string) => {
	const dir = process.env.KARL_SHOTS;
	if (dir) await page.screenshot({ path: `${dir}/${name}.png` });
};

async function openBlueprint(page: Page) {
	await page.getByRole('tab', { name: /Fields/ }).click();
	await page.getByRole('button', { name: 'Build in Karl' }).click();
	await expect(page.getByRole('heading', { name: 'Build in Karl', level: 2 })).toBeVisible();
}

const panelOrder = (page: Page) =>
	page
		.locator('[data-karl-panel]')
		.evaluateAll((els) => els.map((e) => e.getAttribute('data-karl-panel')));

const PILOTS = [
	{
		slug: 'report-rats-or-mice',
		first: ['title', 'description', 'primary_agency', 'cost', 'things_to_know', 'what_to_do'],
		empty: ['Cost (empty)', 'Topics (empty)'],
		tray: 0
	},
	{
		slug: 'information-what-happens-after-you-report-housing-pest-problem',
		first: ['title', 'description', 'primary_agency', 'part_of', 'information_section'],
		empty: ['Primary agency (empty)', 'Part of (empty)'],
		tray: 0
	},
	{
		slug: 'property-owner-responsibilities-hhvc',
		first: [
			'title',
			'description',
			'primary_agency',
			'data_dashboard',
			'introductory_text',
			'body'
		],
		empty: ['Data dashboard (empty)', 'Custom section (empty)'],
		tray: 0
	},
	{
		slug: 'step-by-step-report-a-pest-problem',
		first: ['title', 'primary_agency', 'description', 'intro', 'steps'],
		empty: ['Primary agency (empty)', 'Topics (empty)'],
		tray: 0
	},
	{
		slug: 'topics--healthy-housing-conditions',
		first: ['title', 'primary_agency', 'description', 'top_level_topic', 'content_fields'],
		empty: ['Primary agency (empty)', 'Set top-level? (empty)'],
		tray: 0
	},
	{
		slug: 'rat-free-blocks',
		first: ['title', 'primary_agency', 'logo', 'background_header_image', 'theme', 'spotlight_1'],
		empty: ['Logo (empty)', 'Color theme (empty)'],
		tray: 0
	},
	{
		slug: 'report-health-code-article-11-plain-language',
		first: ['title', 'date', 'primary_agency', 'spotlight', 'content'],
		empty: ['Primary agency (empty)', 'Print version (empty)'],
		tray: 0
	},
	{
		slug: 'departments--healthy-housing-and-vector-control',
		first: ['title', 'show_agency_list', 'description', 'logo', 'main_image'],
		empty: ['Logo (empty)', 'Public records (empty)'],
		tray: 0
	},
	{
		slug: 'location-environmental-health-office',
		first: ['title', 'primary_agency', 'description', 'alert', 'image', 'body', 'intro'],
		empty: ['Primary agency (empty)', 'Alert (empty)'],
		tray: 0
	},
	{
		slug: 'departments--healthy-housing-and-vector-control--about',
		first: ['title', 'primary_agency', 'about_info', 'resources'],
		empty: ['Primary agency (empty)'],
		tray: 0
	}
] as const;

test.describe('Blueprint', () => {
	test('Location: Karl’s groups name the fields, and both page notes lead', async ({ page }) => {
		await gotoSignedIn(page, '/review/location-environmental-health-office');
		await openBlueprint(page);
		await expect(page.locator('.bp-page-caveat')).toHaveCount(2);
		await expect(
			page.locator('[data-karl-panel="body"]').getByRole('heading', { level: 3 })
		).toHaveText('Essential information · Body');
		await expect(
			page.locator('[data-karl-panel="intro"]').getByRole('heading', { level: 3 })
		).toHaveText('Getting here · Intro');
	});

	test('Agency: the two Subsection panels are named by their section, titles keep their pre-fill', async ({
		page
	}) => {
		await gotoSignedIn(page, '/review/departments--healthy-housing-and-vector-control');
		await openBlueprint(page);
		await expect(
			page.locator('[data-karl-panel="services"]').getByRole('heading', { level: 3 })
		).toHaveText('Services · Subsection');
		await expect(
			page.locator('[data-karl-panel="resources"]').getByRole('heading', { level: 3 })
		).toHaveText('Resources · Subsection');
		await expect(page.locator('[data-karl-panel="resources_title"]')).toContainText('Resources');
		await expect(page.locator('[data-karl-panel="resources"] .bp-caveat')).toHaveCount(1);
	});

	test('Report: tables are named, and table text not being translated is Good to know', async ({
		page
	}) => {
		await gotoSignedIn(page, '/review/report-health-code-article-11-plain-language');
		await openBlueprint(page);
		const content = page.locator('[data-karl-panel="content"]');
		await expect(content.locator('.bp-note')).toHaveText(
			'Good to know: Text in tables is not machine translated into SF.gov’s other languages.'
		);
		await expect(content.locator('.bp-caveat')).toHaveCount(0);
	});

	test('Topic: who can create it, the stream named as the form names it, and its caveats', async ({
		page
	}) => {
		await gotoSignedIn(page, '/review/topics--healthy-housing-conditions');
		await openBlueprint(page);
		await expect(page.locator('.bp-page-caveat')).toContainText(
			'Only SF.gov Digital Services can create a new Topic page.'
		);
		const stream = page.locator('[data-karl-panel="content_fields"]');
		await expect(stream.getByRole('heading', { level: 3 })).toHaveText('Child topics');
		await expect(stream).not.toContainText('outer StreamField');
		await expect(stream.locator('.bp-caveat')).toHaveCount(2);
	});

	test('Step by step: steps are Step blocks, with Karl’s advice and the Topics caveat', async ({
		page
	}) => {
		await gotoSignedIn(page, '/review/step-by-step-report-a-pest-problem');
		await openBlueprint(page);
		const steps = page.locator('[data-karl-panel="steps"]');
		await expect(steps).toContainText('Step 1 — Title');
		await expect(steps).not.toContainText('Section specifics');
		await expect(steps).toContainText('Karl suggests aiming for no more than 5');
		await expect(page.locator('[data-karl-panel="topics"]')).toContainText(
			'Karl’s rule unconfirmed'
		);
	});

	for (const pilot of PILOTS) {
		test(`${pilot.slug}: Karl order, empty panels, tray, AA at 1280 and 375`, async ({ page }) => {
			await page.setViewportSize({ width: 1280, height: 900 });
			await gotoSignedIn(page, `/review/${pilot.slug}`);
			await openBlueprint(page);

			expect((await panelOrder(page)).slice(0, pilot.first.length)).toEqual(pilot.first);
			// Disabled-by-design panels get no slot.
			expect(await panelOrder(page)).not.toContain('redirect_url');
			for (const empty of pilot.empty) {
				await expect(page.getByRole('heading', { name: empty, level: 3 })).toBeVisible();
			}
			await expect(page.locator('.bp-tray-item')).toHaveCount(pilot.tray);

			await noViolations(page);
			await shoot(page, `karl-blueprint-${pilot.slug}-1280`);
			await page.setViewportSize({ width: 375, height: 812 });
			await noViolations(page);
			await shoot(page, `karl-blueprint-${pilot.slug}-375`);
		});
	}

	test('the top bar steps between pages without leaving the view, and Review leaves it', async ({
		page
	}) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await gotoSignedIn(page, '/review/report-rats-or-mice');
		await openBlueprint(page);

		// Neither rail is drawn, not even collapsed: the queue is the stepper.
		await expect(page.locator('#reviewQueueRail')).toBeHidden();
		await expect(page.locator('#reviewPanel')).toBeHidden();
		const picker = page.getByLabel('Page', { exact: true });
		await expect(picker.locator('option:checked')).toHaveText(
			/^Report a problem · \d+ of \d+ — Report rats or mice$/
		);

		// Next is a link to the next page, and the view survives the navigation.
		await page.getByRole('link', { name: /^Next page: / }).click();
		await expect(page).not.toHaveURL(/\/review\/report-rats-or-mice$/);
		await expect(page.getByRole('heading', { name: 'Build in Karl', level: 2 })).toBeVisible();
		await expect(picker.locator('option:checked')).not.toHaveText(/Report rats or mice$/);

		// The picker jumps anywhere in the queue.
		await picker.selectOption('report-rats-or-mice');
		await expect(page).toHaveURL(/\/review\/report-rats-or-mice$/);
		await expect(page.getByRole('heading', { name: 'Build in Karl', level: 2 })).toBeVisible();

		// Review is the other half of the mode switch, and brings the rails back.
		await page
			.getByRole('navigation', { name: 'Mode' })
			.getByRole('button', { name: 'Review' })
			.click();
		await expect(page.getByRole('heading', { name: 'Build in Karl', level: 2 })).toHaveCount(0);
		await expect(page.locator('#reviewPanel')).toBeVisible();
	});

	test('a required empty panel says Karl will not save without it', async ({ page }) => {
		await gotoSignedIn(
			page,
			'/review/information-what-happens-after-you-report-housing-pest-problem'
		);
		await openBlueprint(page);
		await expect(
			page.locator('[data-karl-panel="primary_agency"]').getByText(/Karl won’t save the page/)
		).toBeVisible();
	});

	test('"Show on page" lands on the field, focused, with the outline on', async ({ page }) => {
		// The Step by step intro: no report page keeps an inferred Custom Section
		// since each folded its Health Code line into its steps (2026-11-26).
		await gotoSignedIn(page, '/review/step-by-step-report-a-pest-problem');
		await openBlueprint(page);
		// A slot, not a tray item: the tray is empty on every corpus page since
		// the 2026-11-26 audit.
		await page
			.getByRole('button', { name: /^Show on page: .+, unconfirmed$/ })
			.first()
			.click();

		await expect(page.getByRole('heading', { name: 'Build in Karl', level: 2 })).toHaveCount(0);
		await expect(page.locator('.karl-outline-summary')).toBeVisible();
		const field = page.locator(
			'[data-rewrite-field="sections.who-this-information-is-for.heading"]'
		);
		await expect(field).toBeFocused();
		await expect(field).toBeInViewport();
	});

	test('picking a panel outlines its copy in the read-only mockup, and back', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await gotoSignedIn(page, '/review/report-rats-or-mice');
		await openBlueprint(page);
		const mock = page.getByRole('region', { name: 'What the public sees' });
		// Read-only: the copy renders, with no edit buttons.
		await expect(mock.locator('[data-rewrite-field="title"]')).toBeVisible();
		await expect(mock.locator('button[data-rewrite-field]')).toHaveCount(0);
		// The first panel with copy is picked to start, and numbered in the mockup.
		await expect(mock.locator('[data-rewrite-field="title"]')).toHaveAttribute('data-bp-active');
		await expect(mock.locator('[data-rewrite-field="title"]')).toHaveAttribute('data-bp-n', '1');

		const desc = page.locator('[data-karl-panel="description"]');
		await desc.getByRole('button', { name: 'Description', exact: true }).click();
		await expect(desc.getByRole('button', { name: 'Description', exact: true })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		await expect(mock.locator('[data-rewrite-field="summary"]')).toHaveAttribute('data-bp-active');
		await expect(mock.locator('[data-rewrite-field="title"]')).not.toHaveAttribute(
			'data-bp-active'
		);

		// Clicking copy in the mockup picks its panel.
		await mock.locator('[data-rewrite-field="title"]').click();
		await expect(page.locator('[data-karl-panel="title"]')).toHaveAttribute('data-active');
		await shootViewport(page, 'karl-blueprint-split-1440');
	});

	test('copy, check off every panel, then mark the page built; it survives a reload', async ({
		page,
		context
	}) => {
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);
		await page.setViewportSize({ width: 1440, height: 900 });
		await gotoSignedIn(page, '/review/report-rats-or-mice');
		await openBlueprint(page);

		const title = page.locator('[data-karl-panel="title"]');
		await title.getByRole('button', { name: /^Copy Page title/ }).click();
		await expect(title.getByRole('button', { name: /^Copy Page title/ })).toHaveText('Copied');
		expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
			await title.locator('.bp-value-text').first().innerText()
		);
		await expect(page.getByRole('status').filter({ hasText: /^Copied Page title/ })).toBeVisible();

		// A formatted value is shown, and copied, as the text it stands for: no
		// markdown brackets or asterisks on screen or on the clipboard. The
		// clipboard carries bare HTML too, with the outside link as a real link.
		const rich = page.locator('[data-karl-panel="things_to_know"] .bp-value').nth(1);
		await expect(rich.locator('.bp-value-text')).toContainText('The Health Code requires');
		await expect(rich.locator('.bp-value-text')).not.toContainText('](');
		await expect(rich.getByRole('list', { name: /^Links in / })).toContainText(
			/External link.*Internal link\s*choose the page/s
		);
		await rich.getByRole('button', { name: /^Copy / }).click();
		// The write is asynchronous: read only once the button says it landed, or
		// the read races it ("Clipboard data has changed").
		await expect(rich.getByRole('button', { name: /^Copy / })).toHaveText('Copied');
		const clip = await page.evaluate(async () => {
			const [item] = await navigator.clipboard.read();
			const read = async (type: string) => (await item.getType(type)).text();
			return { plain: await read('text/plain'), html: await read('text/html') };
		});
		expect(clip.plain).toContain('The Health Code requires');
		expect(clip.plain).not.toMatch(/\]\(|\*\*/);
		expect(clip.html).toContain('<a href="https://codelibrary.amlegal.com/');
		// The SF.gov page is chosen in Karl: its words travel, a link does not.
		expect(clip.html).not.toContain('/review/');

		const mark = page.getByRole('button', { name: 'Mark page as built in Karl' });
		await expect(mark).toBeDisabled();
		const boxes = page.getByRole('checkbox', { name: 'Entered in Karl' });
		const total = await boxes.count();
		expect(total).toBeGreaterThan(0);
		await expect(page.getByText(`0 of ${total} entered in Karl`)).toBeVisible();
		for (let i = 0; i < total; i++) await boxes.nth(i).check();
		await expect(page.getByText(`${total} of ${total} entered in Karl`)).toBeVisible();
		await mark.click();
		await expect(page.getByText('Built in Karl. Marked on this device.')).toBeVisible();
		await shootViewport(page, 'karl-blueprint-built-1440');

		await page.reload();
		await openBlueprint(page);
		await expect(page.getByText('Built in Karl. Marked on this device.')).toBeVisible();
		// Unchecking a panel unmarks the page.
		await boxes.first().uncheck();
		await expect(page.getByRole('button', { name: 'Mark page as built in Karl' })).toBeDisabled();
	});

	test('only an approved page builds without a "not approved yet" warning', async ({ page }) => {
		await gotoSignedIn(page, '/review/property-owner-responsibilities-hhvc');
		await openBlueprint(page);
		await expect(page.getByRole('note')).toContainText(
			'Not approved yet This page is Needs revision in the review'
		);
		await gotoSignedIn(page, '/review/step-by-step-report-a-pest-problem');
		await openBlueprint(page);
		await expect(page.getByRole('note')).toHaveCount(0);
	});

	const reviewTab = (page: Page) =>
		page.getByRole('navigation', { name: 'Mode' }).getByRole('button', { name: 'Review' });

	test('the view takes both rails and gives them back as they were', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await gotoSignedIn(page, '/review/report-rats-or-mice');
		await openBlueprint(page);
		// Gone, not collapsed: there is no "Expand queue" strip to reopen.
		await expect(page.getByRole('button', { name: 'Expand queue' })).toHaveCount(0);
		await expect(page.locator('#reviewQueueRail')).toBeHidden();
		await reviewTab(page).click();
		// As the helper left them, which is as the workspace opens: the review
		// panel open, the queue collapsed.
		await expect(page.getByRole('button', { name: 'Collapse review panel' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Expand queue' })).toBeVisible();
	});

	test('Review returns to the mockup', async ({ page }) => {
		await gotoSignedIn(page, '/review/property-owner-responsibilities-hhvc');
		await openBlueprint(page);
		await reviewTab(page).click();
		await expect(page.getByRole('region', { name: 'Mockup preview' })).toBeVisible();
	});
});
