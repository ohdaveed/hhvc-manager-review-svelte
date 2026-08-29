import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Accessibility gate for the SF.gov design-system components.
 *
 * Separate from tests/accessibility.e2e.ts on purpose. That file sweeps the
 * REVIEW APP's routes — a violation there means a page regressed. A violation
 * here means a COMPONENT regressed, and every page that uses it will fail next.
 * Keeping them apart means the failure message says which of those happened.
 *
 * Everything runs against /sfgov-components, which renders every component in
 * every state the frames specify. The route is public rather than dev-guarded
 * because playwright.config.ts runs `npm run build && npm run preview`; a
 * dev-only route is invisible to this file.
 */
const RULES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const SPECIMEN = '/sfgov-components';

test.beforeEach(async ({ page }) => {
	await page.goto(SPECIMEN);
	await page.waitForLoadState('networkidle');
});

test('no WCAG 2.1 AA violations across every component state', async ({ page }) => {
	const { violations } = await new AxeBuilder({ page }).withTags(RULES).analyze();

	// Name the rules in the failure. "4 violations" sends the next reader to the
	// HTML report; the rule ids usually identify the fix on their own.
	expect(
		violations,
		violations.map((v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.help}`).join('\n')
	).toEqual([]);
});

/**
 * Dropdown is a native <select>, and that is a decision rather than a shortcut.
 *
 * A custom listbox owns roving focus, aria-activedescendant, type-ahead,
 * Home/End, Escape-with-focus-restored, click-outside and the mobile picker —
 * every one of them a place this gate could start passing while the control is
 * actually broken. A native select cannot regress that way.
 *
 * This test exists so that a later "let's style the open menu properly" change
 * fails loudly instead of quietly reintroducing the risk.
 */
test('Dropdown renders a native select, not a custom listbox', async ({ page }) => {
	await expect(page.locator('select').first()).toBeVisible();
	expect(await page.locator('[role="combobox"]').count()).toBe(0);
	expect(await page.locator('[role="listbox"]').count()).toBe(0);

	// Every select carries a real <label for>, not an aria-label: visible text is
	// a stronger guarantee and survives translation.
	const selects = page.locator('select');
	for (let i = 0; i < (await selects.count()); i += 1) {
		const id = await selects.nth(i).getAttribute('id');
		expect(id, 'every select needs an id to be labelled').toBeTruthy();
		await expect(page.locator(`label[for="${id}"]`)).toHaveCount(1);
	}
});

/**
 * DataTable is a real table.
 *
 * The JSX builds its grid from divs and flexbox, which looks identical and
 * tells a screen reader nothing — no row or column association, no cell count,
 * no table navigation mode. axe does not catch that, because a div grid raises
 * no violation; it is simply invisible. So it is asserted directly.
 */
test('DataTable uses table semantics with scoped headers', async ({ page }) => {
	const tables = page.locator('table');
	expect(await tables.count()).toBeGreaterThan(0);

	// Column layout.
	await expect(page.locator('th[scope="col"]').first()).toBeVisible();
	// Row layout.
	await expect(page.locator('th[scope="row"]').first()).toBeVisible();

	// Every table has a caption: it names the scrollable region and labels the
	// table, and DataTable makes it a required prop for that reason.
	for (let i = 0; i < (await tables.count()); i += 1) {
		await expect(tables.nth(i).locator('caption')).toHaveCount(1);
	}
});

/**
 * The icon set is <img> files, so every glyph needs an alt decision. Icon makes
 * that decision required by its type — `label` or `decorative`, never neither.
 * TypeScript catches it at build time; this catches a JS call site or a `any`
 * that slipped through.
 */
test('every icon image has an explicit alt decision', async ({ page }) => {
	const images = page.locator('img');
	for (let i = 0; i < (await images.count()); i += 1) {
		const alt = await images.nth(i).getAttribute('alt');
		expect(alt, 'an img with no alt attribute at all is the failure').not.toBeNull();
	}
});

/**
 * The focus ring, WCAG 2.1 AA SC 1.4.11.
 *
 * The site ring is two stops: 4px of ground colour then 3px #386EBF. The first
 * stop is what makes the second one read — against #FCFCFC the blue measures
 * ~3.4:1, and against the navy footer (#000925) it is ~1.9:1, under the 3:1
 * floor. So on dark grounds the first stop becomes #FFFFFF rather than being
 * dropped, and the white is what carries the contrast.
 *
 * Asserted as a computed box-shadow rather than a screenshot: a visual diff
 * would go red on any unrelated layout change, and this is a colour contract.
 */
test('focus ring keeps its two stops, and whitens on dark grounds', async ({ page }) => {
	const onPage = page.locator('.ds-btn:not([data-on-dark])').first();
	await onPage.focus();
	const light = await onPage.evaluate((el) => getComputedStyle(el).boxShadow);
	expect(light, 'page-ground ring should use the page colour as its first stop').toContain(
		'rgb(252, 252, 252)'
	);
	expect(light).toContain('rgb(56, 110, 191)');

	const onDark = page.locator('.ds-btn[data-on-dark]').first();
	await onDark.focus();
	const dark = await onDark.evaluate((el) => getComputedStyle(el).boxShadow);
	expect(dark, 'dark-ground ring must whiten its first stop, not drop it').toContain(
		'rgb(255, 255, 255)'
	);
	expect(dark).toContain('rgb(56, 110, 191)');
});

/**
 * The collapsed breadcrumb's ellipsis announces as a button, so it has to do
 * something. The JSX renders it inert, which is fine for a static specimen and
 * an SC 4.1.2 failure in a shipped component.
 */
test('the breadcrumb ellipsis expands the hidden levels by keyboard', async ({ page }) => {
	const more = page.getByRole('button', { name: /Show \d+ hidden levels/ });
	await expect(more).toHaveCount(1);
	await expect(more).toHaveAttribute('aria-expanded', 'false');

	await more.focus();
	await page.keyboard.press('Enter');

	await expect(page.getByRole('button', { name: /Show \d+ hidden levels/ })).toHaveCount(0);
	// The full trail is now present, current page included and still not a link.
	await expect(page.locator('[aria-current="page"]')).toHaveCount(1);
});

/**
 * Error state, SC 1.4.1 and 3.3.1.
 *
 * Red alone is not the carrier: the border doubles to 2px, a filled glyph
 * appears, and the field points at the message through aria-describedby. The
 * border width is the part a colour-only regression would quietly drop.
 */
test('an errored field is marked invalid and described by its message', async ({ page }) => {
	const invalid = page.locator('[aria-invalid="true"]').first();
	await expect(invalid).toBeVisible();

	const describedBy = await invalid.getAttribute('aria-describedby');
	expect(describedBy, 'an errored field must point at its message').toBeTruthy();

	const errorId = describedBy!.split(' ').find((id) => id.endsWith('-error'));
	expect(errorId).toBeTruthy();
	await expect(page.locator(`#${errorId}`)).toBeVisible();

	// 2px, not colour. Read off the control wrapper for text inputs, or the
	// element itself for textarea and select.
	const width = await invalid.evaluate((el) => {
		const target = el.closest('.ds-control') ?? el;
		return getComputedStyle(target as Element).borderTopWidth;
	});
	expect(width).toBe('2px');
});

/**
 * The in-page axe panel is a convenience for whoever is editing a component.
 * If it ever disagrees with this file, the panel is the one that is wrong —
 * but a panel stuck on "running" means the dynamic import broke, and that is
 * worth catching.
 */
test('the in-page axe panel reports a result', async ({ page }) => {
	const result = page.getByTestId('axe-result');
	await expect(result).toBeVisible({ timeout: 15_000 });
	await expect(result).toContainText('No WCAG 2.1 AA violations on this page.');
});
