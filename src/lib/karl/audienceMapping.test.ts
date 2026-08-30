/**
 * `audience` has a Karl destination, and the transcript has to say so.
 *
 * It used to sit in `NOT_MIGRATED_PAGE_FIELDS` — the set documented as "mockup
 * fields with no Karl destination and no intention of gaining one" — which
 * suppressed it from the unmapped sweep entirely. A reviewer was therefore
 * never told that the audience line on all 29 pages has somewhere to go, and
 * the likely outcome of that silence is the line being deleted at migration
 * rather than placed.
 *
 * The destination is settled by published output rather than by guidance:
 * sf.gov/manage-covid-19-schools-childcare-and-youth-programs renders
 * "Who this information is for" as an H3 inside its grey "What to know" box,
 * with the audiences as a bulleted list. That box is Karl's
 * "What to know before you start", and its entries are `things_to_know`
 * (`title_and_text`) — so the field maps, and the field map's own precedence
 * rule is what makes a live page decisive here: E3 says how a page should be
 * built, E4 says what a published page actually renders.
 *
 * What the field does NOT have is room, which is why this is reported as a gap
 * rather than resolved into a panel. The Help Center caps Things to know at 2
 * entries and 14 of the 15 pages carrying it already spend both, so placing an
 * audience means deciding which existing entry it replaces.
 */
import { describe, it, expect } from 'vitest';
import { buildTranscript } from '$lib/legacy-core/karl-transcript.js';
import { pagesByKey } from '$lib/data/index';

type Unmapped = { path: string; shape: string; reason: string };

const transcriptFor = (page: unknown) =>
	buildTranscript(page, null, pagesByKey) as { unmapped?: Unmapped[] };

const audienceGap = (page: unknown) =>
	(transcriptFor(page).unmapped ?? []).filter((u) => u.path === 'audience');

describe('audience is reported, not suppressed', () => {
	it('reports the gap on every page that carries an audience', () => {
		const pages = Object.values(pagesByKey) as { audience?: unknown[] }[];
		const carrying = pages.filter((p) => Array.isArray(p.audience) && p.audience.length > 0);

		expect(carrying.length, 'the corpus should still have audience lines to place').toBeGreaterThan(
			0
		);
		for (const page of carrying) {
			expect(audienceGap(page), `${(page as { title?: string }).title}`).toHaveLength(1);
		}
	});

	it('names the Things to know destination rather than claiming none exists', () => {
		const [gap] = audienceGap(pagesByKey.filthReport);

		// The specific wording is free to change; what must not come back is the
		// generic sweep reason, which asserts the opposite of what is true.
		expect(gap.reason).not.toMatch(/no \w+ panel documented in the field map accepts it/);
		expect(gap.reason).toMatch(/Things to know/);
		expect(gap.reason).toMatch(/Who this information is for/);
	});

	it('cites the published page the destination was read off', () => {
		const [gap] = audienceGap(pagesByKey.filthReport);
		expect(gap.reason).toContain('sf.gov/manage-covid-19-schools-childcare-and-youth-programs');
	});

	it('explains that the blocker is the 2-entry budget, not a missing field', () => {
		const [gap] = audienceGap(pagesByKey.filthReport);
		expect(gap.reason).toMatch(/caps Things to know at 2/);
	});

	/**
	 * `things_to_know` is Transaction-only. Telling an Information page its
	 * audience belongs in a panel that type does not have would send an editor
	 * looking for a field that is not on their form — a worse failure than the
	 * silence this whole change replaced, because it looks actionable.
	 */
	it('does not promise a Things to know entry on types that have no such panel', () => {
		const nonTransaction = (Object.values(pagesByKey) as { type?: string }[]).filter(
			(p) => p.type && p.type !== 'Transaction'
		);
		expect(
			nonTransaction.length,
			'the corpus should still have non-Transaction pages'
		).toBeGreaterThan(0);

		for (const page of nonTransaction) {
			const [gap] = audienceGap(page);
			if (!gap) continue;
			expect(gap.reason, `${page.type}`).toMatch(/nowhere on this type to put it/);
			expect(gap.reason, `${page.type}`).toMatch(/Transaction-only/);
			expect(gap.reason, `${page.type}`).not.toMatch(/already spend both/);
		}
	});

	it('still cites the live pattern on both branches', () => {
		const transaction = audienceGap(pagesByKey.filthReport)[0];
		const information = audienceGap(pagesByKey.afterReport)[0];
		for (const gap of [transaction, information]) {
			expect(gap.reason).toContain('Who this information is for');
		}
	});
});
