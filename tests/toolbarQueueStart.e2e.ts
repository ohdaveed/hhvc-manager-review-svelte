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
	await expect(page.locator('nav [aria-current="page"]')).toHaveText('First page');
});

test('points at the same page as Export review data', async ({ page }) => {
	await page.goto(OTHER);

	// Compare the RESOLVED `href` property, not the attribute, and poll.
	//
	// `resolve()` emits a relative path during SSR (`../review/x`) and an
	// absolute one after hydration (`/review/x`), so two bare `getAttribute`
	// reads can straddle hydration and disagree about links that are in fact
	// identical -- which is exactly how this test failed on its first full-suite
	// run while passing alone. The `href` PROPERTY is always the absolute URL,
	// and `expect.poll` retries until the page settles.
	const hrefOf = (testId: string) =>
		page.getByTestId(testId).evaluate((el) => (el as HTMLAnchorElement).href);

	await expect.poll(async () => hrefOf('queue-start')).toBe(await hrefOf('export-review-data'));
});
