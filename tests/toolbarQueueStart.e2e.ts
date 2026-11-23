import { expect, test } from './fixtures';

/**
 * The toolbar's way back to the queue's first row.
 *
 * It resolves to the SAME target as `Export review data` -- one `$derived` in
 * `+layout.svelte` feeds both -- so a reviewer who has wandered into another
 * page, the site map or the walkthrough has one click back to where the queue
 * starts.
 *
 * The behaviour worth pinning is the swap: on the first page itself the link
 * becomes plain text carrying `aria-current="page"`. A link that reloads the
 * page you are already on reads as broken, and hiding it outright would shift
 * the rest of the bar sideways as you move through the queue. Both halves are
 * asserted, because either one alone would pass with the swap removed.
 *
 * Signed out -- which is how e2e runs -- `pagesStore` is empty, so the target
 * falls back through `pageStore.pages[0]`, the corpus's own first entry. That
 * is a real state of the app (anonymous browsing is supported on purpose), and
 * it keeps this spec independent of Supabase.
 */
const FIRST = '/review/report-garbage-filth-vegetation';
const OTHER = '/review/departments--healthy-housing-and-vector-control';

test('offers a link back to the first queue page from any other page', async ({ page }) => {
	await page.goto(OTHER);

	const link = page.getByTestId('queue-start');
	await expect(link).toBeVisible();
	// The resolved URL, for the reason the third test spells out: the attribute
	// itself is relative before hydration and absolute after.
	await expect(link).toHaveJSProperty('href', new URL(FIRST, page.url()).href);
	// The tooltip names the destination page, not its slug.
	await expect(link).toHaveAttribute('title', /Back to the first page in the queue: .+/);

	await link.click();
	await page.waitForURL(`**${FIRST}`);
});

test('states the position instead of linking when already on that page', async ({ page }) => {
	await page.goto(FIRST);

	await expect(page.getByTestId('queue-start')).toHaveCount(0);
	// Scoped to the toolbar. "First page" is the toolbar's own fixed label, not a
	// page title, and the queue's current row carries `aria-current` too -- so a
	// bare `nav [aria-current]` matched one element only while the queue rendered
	// no rows signed out, which it no longer does.
	await expect(page.locator('.review-toolbar [aria-current="page"]')).toHaveText('First page');
});

test('renders the export review data button in the queue footer', async ({ page }) => {
	await page.goto(OTHER);

	const exportBtn = page.getByTestId('export-review-data');
	await expect(exportBtn).toBeVisible();
	await expect(exportBtn).toHaveText('Export review data');
});
