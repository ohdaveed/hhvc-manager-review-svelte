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
 * entries and 15 of the 16 pages carrying it already spend both, so placing an
 * audience means deciding which existing entry it replaces.
 *
 * Since the 2026-11-26 unmapped-content audit no page in the corpus carries an
 * audience list outside Information: each was placed in a Things to know entry
 * or an Intro, folded into the body, or removed. The gap tests below therefore
 * run against `pagesByKeyWithGaps` (see gapFixtures.ts), which puts the
 * pre-audit lists back on a few pages; the Information tests still read the
 * real corpus.
 *
 * Information is the exception, and the one type where the transcript PLACES
 * the line rather than reporting it. Information has neither `things_to_know`
 * nor an `intro`, but its body is `information_section`, a repeatable stream of
 * Title-and-text blocks with no cap. So the audience becomes that stream's first
 * block, titled as the live page titles it — the same H3-plus-bullets shape, in
 * the only free-text home the type has. Every other type keeps its gap.
 */
import { describe, it, expect } from 'vitest';
import { buildTranscript } from '$lib/legacy-core/karl-transcript.js';
import { pagesByKey } from '$lib/data/index';
import { pagesByKeyWithGaps } from './gapFixtures';

type Unmapped = { path: string; shape: string; reason: string };

// `object`, not `unknown`: karl-transcript.js documents
// `@param {object} page`, and checkJs enforces it. Every caller passes a
// corpus page.
const transcriptFor = (page: object) =>
	buildTranscript(page, null, pagesByKey) as { unmapped?: Unmapped[] };

const audienceGap = (page: object) =>
	(transcriptFor(page).unmapped ?? []).filter((u) => u.path === 'audience');

describe('audience is reported, not suppressed', () => {
	it('reports the gap on every non-Information page that carries an audience', () => {
		const pages = Object.values(pagesByKeyWithGaps) as { audience?: unknown[]; type?: string }[];
		const carrying = pages.filter(
			(p) => p.type !== 'Information' && Array.isArray(p.audience) && p.audience.length > 0
		);

		expect(
			carrying.length,
			'the fixtures should still have audience lines to place'
		).toBeGreaterThan(0);
		for (const page of carrying) {
			expect(audienceGap(page), `${(page as { title?: string }).title}`).toHaveLength(1);
		}
	});

	it('names the Things to know destination rather than claiming none exists', () => {
		const [gap] = audienceGap(pagesByKeyWithGaps.garbageReport);

		// The specific wording is free to change; what must not come back is the
		// generic sweep reason, which asserts the opposite of what is true.
		expect(gap.reason).not.toMatch(/no \w+ panel documented in the field map accepts it/);
		expect(gap.reason).toMatch(/Things to know/);
		expect(gap.reason).toMatch(/Who this information is for/);
	});

	it('cites the published page the destination was read off', () => {
		const [gap] = audienceGap(pagesByKeyWithGaps.garbageReport);
		expect(gap.reason).toContain('sf.gov/manage-covid-19-schools-childcare-and-youth-programs');
	});

	it('explains that the blocker is the 2-entry budget, not a missing field', () => {
		const [gap] = audienceGap(pagesByKeyWithGaps.garbageReport);
		expect(gap.reason).toMatch(/caps Things to know at 2/);
	});

	/**
	 * `things_to_know` is Transaction-only. Telling an Information page its
	 * audience belongs in a panel that type does not have would send an editor
	 * looking for a field that is not on their form — a worse failure than the
	 * silence this whole change replaced, because it looks actionable.
	 */
	it('does not promise a Things to know entry on types that have no such panel', () => {
		const nonTransaction = (Object.values(pagesByKeyWithGaps) as { type?: string }[]).filter(
			(p) => p.type && p.type !== 'Transaction'
		);
		expect(
			nonTransaction.length,
			'the corpus should still have non-Transaction pages'
		).toBeGreaterThan(0);

		for (const page of nonTransaction) {
			const [gap] = audienceGap(page);
			if (!gap) continue;
			expect(gap.reason, `${page.type}`).toMatch(/not on this type/);
			expect(gap.reason, `${page.type}`).toMatch(/Transaction-only/);
			expect(gap.reason, `${page.type}`).not.toMatch(/already spend both/);
		}
	});

	/**
	 * Step by step and Location have no `things_to_know` but do have `intro` —
	 * a free-text slot before the body. Naming it beats telling an editor the
	 * line has nowhere to go, which is what the first version of this said.
	 */
	it('points types with an intro panel at it by name', () => {
		const stepByStep = {
			slug: 'sf.gov/step-by-step/x',
			type: 'Step by step',
			title: 'T',
			summary: 's',
			audience: ['A tenant'],
			sections: [{ heading: 'H', kind: 'body', karl: 'n', paragraphs: ['p'] }]
		};
		const [gap] = audienceGap(stepByStep);
		expect(gap.reason).toMatch(/\*\*Intro\*\*/);
		expect(gap.reason).not.toMatch(/dropped deliberately/);
	});

	it('still cites the live pattern on both branches', () => {
		const transaction = audienceGap(pagesByKeyWithGaps.garbageReport)[0];
		const otherType = (
			Object.values(pagesByKeyWithGaps) as { type?: string; audience?: unknown[] }[]
		).find(
			(p) =>
				p.type !== 'Transaction' &&
				p.type !== 'Information' &&
				Array.isArray(p.audience) &&
				p.audience.length > 0
		);
		expect(otherType, 'the fixtures should still have a non-Transaction audience').toBeDefined();
		const other = audienceGap(otherType!)[0];
		for (const gap of [transaction, other]) {
			expect(gap.reason).toContain('Who this information is for');
		}
	});
});

type Entry = {
	rawName: string;
	fields: { label: string; value: string }[];
	notes: string[];
	overlaid: boolean;
};
const fullTranscript = (page: object, record: object | null = null) =>
	buildTranscript(page, record, pagesByKey) as {
		entries: Entry[];
		claims: Record<string, string>;
		unmapped: Unmapped[];
	};

describe('on an Information page, audience is the first Information section block', () => {
	const information = (
		Object.values(pagesByKey) as { type?: string; audience?: string[] }[]
	).filter((p) => p.type === 'Information' && Array.isArray(p.audience) && p.audience.length > 0);

	it('applies to every Information page that carries one', () => {
		expect(
			information.length,
			'the corpus should still have Information audiences'
		).toBeGreaterThan(0);
		for (const page of information) {
			const t = fullTranscript(page);
			// Placement, not merely absence: a dropped line also has no gap.
			expect(t.claims.audience, `${page.type}`).toBe('information_section');
			expect(t.unmapped.filter((u) => u.path === 'audience')).toEqual([]);
			const first = t.entries.find((e) => e.rawName === 'information_section');
			expect(first?.fields).toEqual([
				{ label: 'Title', value: 'Who this information is for' },
				{ label: 'Text', value: page.audience!.map((a) => `- ${a}`).join('\n') }
			]);
		}
	});

	it('says the title is supplied, not reviewed copy', () => {
		const first = fullTranscript(pagesByKey.afterReport).entries.find(
			(e) => e.rawName === 'information_section'
		);
		expect(first?.notes.join(' ')).toMatch(/not in the mockup/);
		expect(first?.notes.join(' ')).toContain(
			'sf.gov/manage-covid-19-schools-childcare-and-youth-programs'
		);
	});

	it('types the reviewed audience, not the authored one', () => {
		const t = fullTranscript(pagesByKey.afterReport, {
			section_edits: { 'audience.0': 'Edited audience' },
			decision: 'Needs review'
		});
		const first = t.entries.find((e) => e.rawName === 'information_section');
		expect(first?.overlaid).toBe(true);
		expect(first?.fields[1].value.split('\n')[0]).toBe('- Edited audience');
	});
});
