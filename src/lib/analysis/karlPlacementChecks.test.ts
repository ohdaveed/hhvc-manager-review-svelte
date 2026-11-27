import { describe, expect, it } from 'vitest';
import { pagesByKey } from '$lib/data/index';
import { gapPages } from '$lib/karl/gapFixtures';
import { copyAsRecorded, type EditRow } from '$lib/corpus/overlay';
import { karlPlacementFindings } from './karlPlacementChecks';
import { analyzePage } from './index';

const page = (key: string) => (pagesByKey as Record<string, object>)[key];
/** Findings for a corpus page with `edits` saved on it: the copy as recorded. */
const byId = (key: string, id: string, edits: EditRow[] = []) =>
	karlPlacementFindings(copyAsRecorded(page(key), edits) as never).find((f) => f.id === id)!;

describe('the Analysis panel reads the same placements as the Karl outline', () => {
	it('lists what will not carry over on the rats report', () => {
		// Nothing does since the 2026-11-26 audit; the gap fixture puts the
		// pre-audit section button back.
		expect(byId('rodentsReport', 'karl-unplaced').status).toBe('pass');
		const f = karlPlacementFindings(gapPages.rodentsReport as never).find(
			(x) => x.id === 'karl-unplaced'
		)!;
		expect(f.status).toBe('issue');
		expect(f.items.map((i) => i.text)).toEqual(['“What the Health Code requires” — its button']);
	});

	it('finds nothing on the rats report that needs a fix, until an edit breaks a limit', () => {
		expect(byId('rodentsReport', 'karl-needs-fix').status).toBe('pass');
		const edited = byId('rodentsReport', 'karl-needs-fix', [
			{
				field_id: 'sections.what-to-do.steps.1.button',
				new_content: 'Report this problem through 311 now'
			}
		] as never);
		expect(edited.status).toBe('issue');
		expect(edited.items[0].detail).toMatch(/35 characters; Karl wants 25 or fewer/);
	});

	it('lists what Karl’s own pages leave unsettled, as unavailable rather than an issue', () => {
		// Every report page folded its Custom Section into its steps (2026-11-26),
		// so the gap overlay puts the rats page's inferred mapping back.
		expect(byId('rodentsReport', 'karl-unconfirmed').status).toBe('pass');
		const f = karlPlacementFindings(gapPages.rodentsReport as never).find(
			(x) => x.id === 'karl-unconfirmed'
		)!;
		expect(f.status).toBe('unavailable');
		expect(f.items.map((i) => i.text)).toEqual(['What the Health Code requires']);
		const location = byId('ehOffice', 'karl-unconfirmed');
		expect(location.items[0]).toMatchObject({ text: 'This page' });
		expect(location.items[0].detail).toMatch(/Parking, Accessibility/);
	});

	it('fails empty fields only when one is required', () => {
		expect(byId('rodentsReport', 'karl-empty-fields').status).toBe('pass');
		const agency = byId('pestsTopic', 'karl-empty-fields');
		expect(agency.status).toBe('issue');
		expect(agency.items[0]).toEqual({
			text: 'Public records',
			detail: 'Required: Karl won’t save the page without it.'
		});
	});

	it('checks the URL only where Karl’s pages agree on the pattern', () => {
		expect(byId('rodentsReport', 'karl-url-pattern').status).toBe('pass');
		expect(byId('afterReport', 'karl-url-pattern').status).toBe('unavailable');
		const nested = karlPlacementFindings({
			...(page('rodentsReport') as object),
			slug: 'sf.gov/report/rats'
		} as never).find((f) => f.id === 'karl-url-pattern')!;
		expect(nested.status).toBe('issue');
	});

	it('gives every corpus page six findings, each citing a Karl help page', () => {
		for (const [key, p] of Object.entries(pagesByKey)) {
			const findings = karlPlacementFindings(p as never);
			expect(
				findings.map((f) => f.id),
				key
			).toEqual([
				'karl-unplaced',
				'karl-needs-fix',
				'karl-unconfirmed',
				'karl-empty-fields',
				'karl-url-pattern',
				'karl-description-reuse'
			]);
			for (const f of findings)
				expect(f.help.url, `${key} ${f.id}`).toMatch(/^https:\/\/sfdigitalservices/);
		}
	});

	it('is wired into analyzePage', () => {
		const analysis = analyzePage({ page: page('rodentsReport') as never });
		expect(analysis.placementFindings.map((f) => f.id)).toContain('karl-unplaced');
	});
});

describe('dead button links', () => {
	const edit = (field_id: string, value: string) =>
		[{ field_id, new_content: value, created_at: '2026-11-24T00:00:00Z' }] as never;

	it('flags a placed button whose URL is "#"', () => {
		const finding = byId('article11Guide', 'karl-needs-fix', edit('spotlight.buttonUrl', '#'));
		expect(finding.status).toBe('issue');
		expect(finding.items.map((i) => i.detail).join('\n')).toMatch(
			/Button link goes nowhere \('#'\)\./
		);
	});

	it('says nothing about the same button with a real URL', () => {
		const details = byId('article11Guide', 'karl-needs-fix')
			.items.map((i) => i.detail)
			.join('\n');
		expect(details).not.toMatch(/goes nowhere/);
	});

	// Decision 14 (docs/plans/2026-11-23-karl-field-mapping-layer.md): PLACEHOLDER
	// is the literal uppercase string only. C2 moved the inspector lookup's "#"
	// button into a What to do step, so it is now placed, and reported as a
	// Button link that goes nowhere. C3 keeps the placeholder until the live build.
	it('reports the inspector lookup’s placed "#" button as a link that goes nowhere', () => {
		const f = byId('inspectorLookup', 'karl-needs-fix');
		expect(f.status).toBe('issue');
		expect(f.items.map((i) => i.detail)).toContain("Button link goes nowhere ('#').");
	});
});

describe('title words reused in the description', () => {
	it('flags a description that repeats 6 title words', () => {
		const edits = [
			{
				field_id: 'summary',
				new_content:
					'Pay your annual Healthy Housing fee if you own an apartment building with 3 or more rental units.',
				created_at: 'z'
			}
		];
		const f = byId('payFee', 'karl-description-reuse', edits as never);
		expect(f.status).toBe('issue');
		expect(f.items[0].text).toBe('pay, annual, healthy, housing, fee, apartment');
	});

	it('passes the annual fee page after its rewrite', () => {
		expect(byId('payFee', 'karl-description-reuse').status).toBe('pass');
	});

	// Ruling 2026-11-26: the bed bugs description names bed bugs rather than
	// "these pests", because a description is also read without its title.
	// Naming the subject costs two title words, so this flag is accepted.
	it('flags the bed bugs page, which names its subject on purpose', () => {
		expect(byId('bedBugsInfo', 'karl-description-reuse').status).toBe('issue');
	});

	it('passes the complaints records page, which repeats 1', () => {
		expect(byId('findRecords', 'karl-description-reuse').status).toBe('pass');
	});

	it('judges an edited description', () => {
		const edits = [
			{
				field_id: 'summary',
				new_content: 'Owners of buildings with 3 or more units owe it each year.',
				created_at: 'z'
			}
		];
		expect(byId('payFee', 'karl-description-reuse', edits as never).status).toBe('pass');
	});
});

describe('articles in the slug', () => {
	const urlOf = (slug: string) =>
		karlPlacementFindings({
			slug,
			type: 'Transaction',
			title: 'T',
			summary: 'S',
			sections: []
		} as never).find((f) => f.id === 'karl-url-pattern')!;

	it('flags an article as a whole word in the slug', () => {
		const f = urlOf('sf.gov/report-a-pest-problem');
		expect(f.status).toBe('issue');
		expect(f.items.map((i) => i.detail)).toContain('Karl drops articles from URLs: remove “a”.');
	});

	it('does not flag letters inside a word', () => {
		expect(urlOf('sf.gov/data-analytics').status).toBe('pass');
	});

	it('judges a slug the reviewer edited, which only the review record carries', () => {
		// The old fold filed a `slug` edit under `section_edits.slug`, so the
		// check read the authored slug and missed the new one.
		const f = karlPlacementFindings(
			{
				slug: 'sf.gov/data-analytics',
				type: 'Transaction',
				title: 'T',
				summary: 'S',
				sections: []
			} as never,
			{ section_edits: {}, decision: 'Needs review', url_slug: 'sf.gov/report-a-pest-problem' }
		).find((x) => x.id === 'karl-url-pattern')!;
		expect(f.status).toBe('issue');
	});

	it('flags exactly the Transaction slugs the review names', () => {
		const flagged = Object.values(pagesByKey as Record<string, { slug: string; type: string }>)
			.filter((p) => p.type === 'Transaction')
			.filter((p) =>
				karlPlacementFindings(p as never)
					.find((f) => f.id === 'karl-url-pattern')!
					.items.some((i) => /articles/.test(i.detail ?? ''))
			)
			.map((p) => p.slug)
			.sort();
		// The review named five. C1 removed the two get-ready pages and C5 dropped
		// the article from the other three, so none is left; the fixtures above
		// keep the detection itself covered.
		expect(flagged).toEqual([]);
	});
});
