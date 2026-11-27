import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { gotoSignedIn } from './signedIn';

/**
 * The propose-a-page form, driven in a browser with `/api/pages` and
 * `/api/ai/generate` stubbed at the HTTP boundary.
 *
 * The form's pending, error and success states were never rendered by any
 * spec, and its error text carries its own colour, so they were also outside the
 * axe gate -- the same blind spot `tests/signedIn.ts` documents. Each state is
 * therefore scanned AFTER it is proven on screen.
 *
 * The error case answers 200 with a body that is not JSON rather than a 500:
 * a 4xx/5xx subresource logs a browser-level console error, which
 * `./fixtures` fails on, and carving an exception into that gate is the wrong
 * trade. A body the client cannot parse reaches the same "nothing was saved"
 * branch (`createDraft` throws before any row exists).
 */

const DRAFT_ID = '9f1c2f0e-0000-4000-8000-0000000000a1';
const DESCRIPTION = 'A page explaining how to report a broken elevator in a rental building.';

const noViolations = async (page: Page) => {
	const { violations } = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
		.analyze();
	expect(
		violations,
		violations.map((v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.help}`).join('\n')
	).toEqual([]);
};

/** Stub the two endpoints. `post` decides what creating the row answers. */
async function stubApi(
	page: Page,
	post: (route: import('@playwright/test').Route) => Promise<void> | void
) {
	const requests: { method: string; auth: string | undefined; body: unknown }[] = [];
	await page.route('**/api/pages', async (route) => {
		const request = route.request();
		requests.push({
			method: request.method(),
			auth: request.headers()['authorization'],
			body: request.postDataJSON()
		});
		if (request.method() === 'POST') return post(route);
		return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
	});
	// Held until released, so the "being drafted" confirmation is observed while
	// the model is still running -- which is when a reviewer actually sees it.
	let release: () => void = () => {};
	const gate = new Promise<void>((resolve) => (release = resolve));
	await page.route('**/api/ai/generate', async (route) => {
		await gate;
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				result: {
					slug: 'sf.gov/draft-elevator',
					type: 'Transaction',
					title: 'Report a broken elevator',
					summary: 'Report an elevator that is out of service.',
					sections: []
				},
				valid: true,
				issues: [],
				model: 'gemini-stub'
			})
		});
	});
	return { requests, release };
}

const form = (page: Page) => page.locator('form');

test('submitting shows the pending state, then confirms with a link to the draft', async ({
	page
}) => {
	let answer: () => void = () => {};
	const held = new Promise<void>((resolve) => (answer = resolve));
	const { requests, release } = await stubApi(page, async (route) => {
		await held;
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				id: DRAFT_ID,
				path: `draft:${DRAFT_ID}`,
				title: 'Report a broken elevator'
			})
		});
	});
	await gotoSignedIn(page, '/');
	await page.getByRole('button', { name: 'Propose a page' }).click();
	await expect(form(page)).toBeVisible();

	await page.getByLabel('What should the page do?').fill(DESCRIPTION);
	const submit = page.getByRole('button', { name: 'Draft this page' });
	await expect(submit).toBeEnabled();
	await submit.click();

	// Pending: the POST is held, so this is the state a slow save shows.
	await expect(form(page).getByText('Saving your description…')).toBeVisible();
	await expect(submit).toBeDisabled();
	await noViolations(page);

	answer();

	// Confirmed: the row exists, the text is cleared and the link targets the
	// draft route, never `/review/draft:<id>`.
	const open = form(page).getByRole('link', { name: 'Open the draft' });
	await expect(open).toHaveAttribute('href', `/review/draft/${DRAFT_ID}`);
	await expect(form(page).getByText(/is being drafted/)).toBeVisible();
	await expect(page.getByLabel('What should the page do?')).toHaveValue('');
	await expect(form(page).getByText('Saving your description…')).toHaveCount(0);
	await noViolations(page);

	// What went over the wire: the description, authenticated.
	const created = requests.find((r) => r.method === 'POST');
	expect(created?.body).toEqual({ description: DESCRIPTION });
	expect(created?.auth).toMatch(/^Bearer .+/);

	release();
	await expect.poll(() => requests.some((r) => r.method === 'PATCH')).toBe(true);
});

test('an unsaved submission says so, keeps the text and can be retried', async ({ page }) => {
	await stubApi(page, (route) =>
		route.fulfill({ status: 200, contentType: 'text/plain', body: 'not json' })
	);
	await gotoSignedIn(page, '/');
	await page.getByRole('button', { name: 'Propose a page' }).click();

	const field = page.getByLabel('What should the page do?');
	await field.fill(DESCRIPTION);
	await page.getByRole('button', { name: 'Draft this page' }).click();

	const alert = form(page).getByRole('alert');
	await expect(alert).toHaveText('Nothing was saved. Your description is still here; try again.');
	await expect(field).toHaveValue(DESCRIPTION);
	await expect(field).toHaveAttribute('aria-invalid', 'true');
	await expect(page.getByRole('button', { name: 'Draft this page' })).toBeEnabled();
	await noViolations(page);
});

test('a description over the limit is refused and named', async ({ page }) => {
	const { requests } = await stubApi(page, (route) => route.abort());
	await gotoSignedIn(page, '/');
	await page.getByRole('button', { name: 'Propose a page' }).click();

	await page.getByLabel('What should the page do?').fill('a'.repeat(2001));

	await expect(form(page).getByRole('alert')).toHaveText('Too long');
	await expect(form(page).getByText(/1 character over the 2,000 character limit/)).toBeVisible();
	await expect(page.getByRole('button', { name: 'Draft this page' })).toBeDisabled();
	await noViolations(page);
	expect(requests).toEqual([]);
});
