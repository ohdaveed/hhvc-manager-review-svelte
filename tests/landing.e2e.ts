import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { DRAFT_IDS, gotoSignedIn, signedIn } from './signedIn';

/**
 * The landing page and the AI-drafted page route, in a real browser.
 *
 * Every test here proves its surface rendered before it asserts on it: a
 * landing page stuck on "Loading your progress" or a draft route stuck on
 * "Loading draft…" would satisfy a negative assertion while showing nothing,
 * which is the blind spot `tests/signedIn.ts` documents. And the fixture in
 * `./fixtures` fails any test that logs a console error, so "opening this does
 * not log an error" needs no assertion of its own -- it is the gate.
 */

const banner = (page: Page) => page.getByRole('complementary', { name: 'AI draft' });
const draftUrl = (id: string) => `/review/draft/${id}`;

test.describe('signed in', () => {
	test('the landing page resumes the review in one click', async ({ page }) => {
		await gotoSignedIn(page, '/', { decidedFirst: true });

		await expect(
			page.getByRole('region', { name: 'Your progress' }).getByText(/\d+ of \d+ decided/)
		).toBeVisible();
		// The first `needs-review` row in queue order. `decidedFirst` puts decided
		// rows ahead of it in store order, which Continue must not follow.
		const next = page.getByRole('link', { name: /^Continue: / });
		await expect(next).toHaveAttribute(
			'href',
			'/review/report-garbage-clutter-or-overgrown-plants'
		);
		await next.click();

		await expect(page).toHaveURL(/\/review\/report-garbage-clutter-or-overgrown-plants$/);
		// The workspace opens on the decision, with the queue one click away.
		await expect(page.getByRole('heading', { name: 'Decision' })).toBeVisible();
		await page.getByRole('button', { name: 'Expand queue' }).click();
		await expect(page.locator('nav[aria-label="Pages in this review"] a').first()).toBeVisible();
	});

	test('Continue to a draft goes to the draft route, never a draft: URL', async ({ page }) => {
		// Every corpus row decided, so the next undecided page IS a draft:
		// `pages.path` is `draft:<uuid>`, which `/review/[slug]` would hard-404.
		await gotoSignedIn(page, '/', { corpusDecided: true });

		const next = page.getByRole('link', { name: /^Continue: / });
		await expect(next).toHaveAttribute('href', draftUrl(DRAFT_IDS.ready));
		await next.click();

		await expect(page).toHaveURL(new RegExp(`${draftUrl(DRAFT_IDS.ready)}$`));
		expect(page.url()).not.toContain('draft:');
		await expect(page.getByRole('complementary', { name: 'AI draft' })).toBeVisible();
	});

	test('every draft is listed on the landing page and none links to draft:', async ({ page }) => {
		await gotoSignedIn(page, '/', { drafts: true });

		const list = page.getByRole('region', { name: 'All pages' });
		// All four states, named by `draft_pages.title` for the ones with no
		// corpus entry and by the page's own title for the ready one.
		//
		// NOT `exact`. A row is one anchor wrapping the title, the status badge
		// and the page type, so its accessible name is all three joined -- the
		// ready draft matches a corpus page and so carries a type line, while the
		// three unbuilt ones have neither type nor badge and are bare titles.
		// Anchoring on the title is what both shapes have in common.
		for (const title of [
			'Report a noisy construction site',
			'Report a leaking roof',
			'Report a broken heater',
			'Report a pest problem'
		]) {
			await expect(
				list.getByRole('link', { name: new RegExp(`^${title}\\b`) }).first()
			).toBeVisible();
		}

		await expect(list.getByRole('link', { name: 'A draft from another review' })).toHaveCount(0);

		const hrefs = await page
			.locator('a[href]')
			.evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
		expect(hrefs.filter((h) => h.includes('draft:') || h.includes('draft%3A'))).toEqual([]);
		expect(hrefs).toContain(draftUrl(DRAFT_IDS.drafting));

		await list.getByRole('link', { name: 'Report a leaking roof' }).click();
		await expect(page).toHaveURL(new RegExp(`${draftUrl(DRAFT_IDS.drafting)}$`));
		await expect(banner(page).getByRole('status')).toHaveText('Drafting this page…');
	});
});

test.describe('the draft route', () => {
	test('a draft in the queue links to the draft route and is marked current', async ({ page }) => {
		await gotoSignedIn(page, draftUrl(DRAFT_IDS.drafting), { drafts: true, rail: 'queue' });

		const row = page.locator(
			`nav[aria-label="Pages in this review"] a[href="${draftUrl(DRAFT_IDS.drafting)}"]`
		);
		await expect(row).toHaveCount(1);
		await expect(row).toHaveAttribute('aria-current', 'page');
		await expect(row).toContainText('Report a leaking roof');
		const hrefs = await page
			.locator('nav[aria-label="Pages in this review"] a')
			.evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
		expect(hrefs.filter((h) => h.includes('draft:'))).toEqual([]);
	});

	test('a ready draft opens in the workspace with its banner and its page', async ({ page }) => {
		await gotoSignedIn(page, draftUrl(DRAFT_IDS.ready), { drafts: true });

		const top = banner(page);
		await expect(top).toBeVisible();
		await expect(top).toContainText('requested by you');
		await expect(top).toContainText('How to report construction noise');
		// The page itself, not just the chrome around it.
		await expect(page.getByText('Before you report').first()).toBeVisible();
		await expect(top.getByRole('button', { name: 'Retry' })).toHaveCount(0);
	});

	test('a fresh drafting row shows progress and no retry, without logging an error', async ({
		page
	}) => {
		// A drafting draft has NO pageStore entry, so the layout's `pageData` is
		// undefined and every workspace component renders without a page. The
		// fixture fails this test on a console error or an uncaught exception.
		await gotoSignedIn(page, draftUrl(DRAFT_IDS.drafting), { drafts: true });

		await expect(banner(page).getByRole('status')).toHaveText('Drafting this page…');
		await expect(page.getByRole('button', { name: 'Retry' })).toHaveCount(0);
		await expect(page.getByText('This draft stopped before finishing.')).toHaveCount(0);
	});

	test('a drafting row whose tab closed is stale, not spinning forever', async ({ page }) => {
		// `updated_at` in the fixture is months old, past DRAFT_STALE_MS.
		await gotoSignedIn(page, draftUrl(DRAFT_IDS.stale), { drafts: true });

		await expect(page.getByText('This draft stopped before finishing.')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
		await expect(page.getByText('Drafting this page…')).toHaveCount(0);
	});

	test('a fresh drafting row turns stale on screen once the clock passes 90s', async ({ page }) => {
		// The banner ticks every 5s; the browser clock is advanced rather than
		// waited on, so the swap from spinner to retry is observed without a reload.
		await page.clock.install({ time: new Date() });
		await gotoSignedIn(page, draftUrl(DRAFT_IDS.drafting), { drafts: true });
		await expect(banner(page).getByRole('status')).toHaveText('Drafting this page…');

		await page.clock.fastForward(120_000);

		await expect(page.getByText('This draft stopped before finishing.')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
	});

	test('a failed draft names the failure and offers a retry', async ({ page }) => {
		await gotoSignedIn(page, draftUrl(DRAFT_IDS.failed), { drafts: true });

		await expect(banner(page).getByRole('alert')).toHaveText('The draft could not be generated.');
		await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
	});
});

test.describe('signed out', () => {
	test('the landing page explains and links to sign in without claiming progress', async ({
		page
	}) => {
		await page.goto('/');

		await expect(page.getByRole('heading', { name: 'HHVC mockup review' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
		await expect(page.getByText(/to record decisions and track your progress/)).toBeVisible();
		await expect(page.getByText(/\d+ of \d+ decided/)).toHaveCount(0);
		await expect(page.getByRole('link', { name: /^Continue: / })).toHaveCount(0);
		await expect(page.getByText('Checking your session…')).toHaveCount(0);
		// The review's own furniture is for signed-in reviewers; a visitor gets
		// the sign-in card and then the pages.
		await expect(
			page.getByRole('heading', { name: 'Review guide and moving pages into Karl' })
		).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Propose a page' })).toHaveCount(0);
		await expect(page.getByRole('heading', { name: 'All pages' })).toBeVisible();
	});
});

test.describe('status card', () => {
	test('fits a phone: the page does not scroll sideways at 375px', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 812 });
		await gotoSignedIn(page, '/', { drafts: true, decidedFirst: true });

		await expect(page.getByRole('link', { name: /^Continue: / })).toBeVisible();
		// The Continue button carries the page title. It once did so with
		// `nowrap`, measured at 437px inside a 343px card: the whole page scrolled
		// 97px sideways. It truncates now; this holds it to that.
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		expect(overflow).toBe(0);
	});

	test('a failed load says so, and Try again recovers in place', async ({ page }) => {
		await signedIn(page);
		// The first `reviews` read fails; later ones fall through to the fixture.
		let failures = 1;
		await page.route('**/rest/v1/reviews*', (route) =>
			failures-- > 0
				? route.fulfill({ status: 500, contentType: 'application/json', body: '{}' })
				: route.fallback()
		);
		await page.goto('/');

		// Before `loadReview` rejected on error, this state was unreachable and the
		// card said "Loading your progress…" forever.
		await expect(page.getByText("Your progress didn't load")).toBeVisible();
		await page.getByRole('button', { name: 'Try again' }).click();
		await expect(
			page.getByRole('region', { name: 'Your progress' }).getByText(/^\d+ of \d+ decided$/)
		).toBeVisible();
		await expect(page.getByText("Your progress didn't load")).toHaveCount(0);
	});
});
