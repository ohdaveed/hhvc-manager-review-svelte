import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { gotoSignedIn } from './signedIn';

/**
 * On the mockup, an edit target's padding is gone and its ring is drawn
 * outside the text (src/app.css, "every edit-target indicator is drawn
 * OUTSIDE the text"), so the field badge sits above the ring instead of in
 * the padding. Wherever there is too little room above a field, the badge
 * lands on other copy -- the summary's badge on the title, an audience line's
 * on the line above, a button URL's on its button. Those were all found by
 * selecting every field and are what this pins.
 *
 * Signed in, because signed out there are no edit targets and no badges.
 */
const PAGE = '/review/report-garbage-filth-vegetation';

async function badgeProblem(page: Page): Promise<string | null> {
	return page.evaluate(() => {
		const badge = document.querySelector('#mockPage .edit-target-badge');
		if (!badge) return 'no badge on the selected field';
		const r = badge.getBoundingClientRect();
		const self = badge.closest('.edit-target');
		for (const other of document.querySelectorAll('#mockPage .edit-target')) {
			if (other === self || other.contains(badge)) continue;
			const q = other.getBoundingClientRect();
			const overlaps = !(
				r.right <= q.left ||
				r.left >= q.right ||
				r.bottom <= q.top ||
				r.top >= q.bottom
			);
			if (q.width && overlaps)
				return `badge covers "${(other.textContent ?? '').trim().slice(0, 40)}"`;
		}
		const frame = document.querySelector('figure.mockup-frame')!;
		const f = frame.getBoundingClientRect();
		if (r.left < f.left || r.right > f.right) return 'badge runs outside the frame';
		if (frame.scrollWidth > frame.clientWidth) return 'frame scrolls sideways';
		return null;
	});
}

for (const preset of ['Phone width, 390px', 'Desktop width, 1024px']) {
	test(`no field badge covers other copy (${preset})`, async ({ page }) => {
		await page.setViewportSize({ width: 1800, height: 1200 });
		await gotoSignedIn(page, PAGE);
		await page.locator(`[aria-label="${preset}"]`).click();

		const ids = await page.evaluate(() => [
			...new Set(
				[...document.querySelectorAll('#mockPage [data-rewrite-field]')].map((e) =>
					e.getAttribute('data-rewrite-field')
				)
			)
		]);
		expect(ids.length).toBeGreaterThan(20);

		const target = (id: string) =>
			page
				.locator(
					`#mockPage [data-rewrite-field="${id}"] button.edit-target, #mockPage button.edit-target[data-rewrite-field="${id}"]`
				)
				.first();

		const problems: string[] = [];
		for (const id of ids as string[]) {
			await target(id).click();
			await page.mouse.move(0, 0);
			const p = await badgeProblem(page);
			if (p) problems.push(`${id}: ${p}`);
			// A selected button reveals its URL; that field's badge is the
			// case that needed its own row.
			if (id.endsWith('.button') && (await target(`${id}Url`).count())) {
				await target(`${id}Url`).click();
				await page.mouse.move(0, 0);
				const u = await badgeProblem(page);
				if (u) problems.push(`${id}Url: ${u}`);
			}
			await page.keyboard.press('Escape');
		}
		expect(problems).toEqual([]);
	});
}
