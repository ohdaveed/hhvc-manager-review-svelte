import { expect, test } from './fixtures';
import { gotoSignedIn } from './signedIn';

/**
 * The workspace header band: the way back to `/`, previous / next in queue
 * order, and the decision kept on screen when the panel is not.
 *
 * Signed out -- most of these -- `pagesStore` is empty and the queue lists the
 * corpus, so previous / next step through corpus order. That is a real state of
 * the app (anonymous browsing is supported on purpose) and keeps the navigation
 * specs independent of Supabase. The decision specs need a review row, so they
 * run signed in through the stub.
 */
const FIRST = '/review/report-garbage-clutter-or-overgrown-plants';

test('links back to the landing page from the queue', async ({ page }) => {
	await page.goto(FIRST);
	const home = page.getByTestId('all-pages-link');
	await expect(home).toHaveText('All pages');
	await home.click();
	await page.waitForURL((url) => url.pathname === '/');
});

test('steps to the next page and back in queue order', async ({ page }) => {
	await page.goto(FIRST);

	// The first page has nothing before it: an inert placeholder, not a link.
	await expect(page.getByTestId('prev-page')).toHaveCount(0);
	const next = page.getByTestId('next-page');
	await expect(next).toHaveAttribute('aria-label', /^Next page: .+/);
	await next.click();
	await page.waitForURL((url) => url.pathname !== new URL(FIRST, url).pathname);

	// One step on, previous leads straight back.
	const prev = page.getByTestId('prev-page');
	await expect(prev).toHaveJSProperty('href', new URL(FIRST, page.url()).href);
	await prev.click();
	await page.waitForURL(`**${FIRST}`);
});

test('names the page in the toolbar, with the slug as its tooltip', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto(FIRST);
	const title = page.getByTestId('toolbar-title');
	await expect(title).toHaveText('Report garbage, clutter, or overgrown plants');
	await expect(title).toHaveAttribute('title', /report-garbage-clutter-or-overgrown-plants/);
});

test('keeps the decision on screen when the panel is collapsed', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await gotoSignedIn(page, FIRST);

	await expect(page.getByTestId('toolbar-status')).toHaveText('Undecided');
	await page.getByRole('button', { name: 'Collapse review panel' }).click();
	await expect(page.getByRole('img', { name: 'Decision: Undecided' })).toBeVisible();
});

test('carries the decision on the phone Review button', async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 812 });
	await gotoSignedIn(page, FIRST);
	await expect(page.getByRole('button', { name: 'Review (Undecided)' })).toBeVisible();
});

// A decision moves the row to another queue group. Next used to follow it, so
// approving a page sent Next to the next APPROVED page (or greyed it out at the
// end of the queue). The round trip is the point: Next goes on to the row that
// came after, and Prev from there comes back.
test('keeps stepping from where the reviewer was after a decision', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await gotoSignedIn(page, FIRST);

	const next = page.getByTestId('next-page');
	const before = await next.getAttribute('href');
	expect(before).toContain('find-healthy-housing-inspector-by-neighborhood');

	await page.getByRole('radio', { name: 'Approved' }).click();
	await expect(page.getByTestId('toolbar-status')).toHaveText('Approved');
	await expect(next).toHaveAttribute('href', before!);

	await next.click();
	await page.waitForURL('**/find-healthy-housing-inspector-by-neighborhood');
	await expect(page.getByTestId('prev-page')).toHaveJSProperty(
		'href',
		new URL(FIRST, page.url()).href
	);
});

test('renders the export review data button in the queue footer', async ({ page }) => {
	await page.goto(FIRST);
	const exportBtn = page.getByTestId('export-review-data');
	await expect(exportBtn).toBeVisible();
	await expect(exportBtn).toHaveText('Export review data');
});
