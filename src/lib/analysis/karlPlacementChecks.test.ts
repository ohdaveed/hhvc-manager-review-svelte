import { describe, expect, it } from 'vitest';
import { pagesByKey } from '$lib/data/index';
import { karlPlacementFindings, recordFromEdits } from './karlPlacementChecks';
import { analyzePage } from './index';

const page = (key: string) => (pagesByKey as Record<string, object>)[key];
const byId = (key: string, id: string, edits = []) =>
	karlPlacementFindings(page(key) as never, edits).find((f) => f.id === id)!;

describe('recordFromEdits', () => {
	it('keeps the newest edit per field and splits out title and summary', () => {
		const record = recordFromEdits([
			{ field_id: 'sections.a.heading', new_content: 'new', created_at: '2026-11-02' },
			{ field_id: 'sections.a.heading', new_content: 'old', created_at: '2026-11-01' },
			{ field_id: 'title', new_content: 'T', created_at: '2026-11-01' },
			{ field_id: 'summary', new_content: 'S', created_at: '2026-11-01' }
		]);
		expect(record.section_edits).toEqual({ 'sections.a.heading': 'new' });
		expect(record.edited_title).toBe('T');
		expect(record.edited_summary).toBe('S');
	});
});

describe('the Analysis panel reads the same placements as the Karl outline', () => {
	it('lists what will not carry over on the rats report', () => {
		const f = byId('rodentsReport', 'karl-unplaced');
		expect(f.status).toBe('issue');
		expect(f.items.map((i) => i.text)).toEqual([
			'The “Who this is for” list',
			'“How your report is processed” — its button'
		]);
	});

	it('finds nothing on the rats report that needs a fix, until an edit breaks a limit', () => {
		expect(byId('rodentsReport', 'karl-needs-fix').status).toBe('pass');
		const edited = byId('rodentsReport', 'karl-needs-fix', [
			{
				field_id: 'sections.what-to-do.steps.0.button',
				new_content: 'Report this problem through 311 now'
			}
		] as never);
		expect(edited.status).toBe('issue');
		expect(edited.items[0].detail).toMatch(/35 characters; Karl wants 25 or fewer/);
	});

	it('lists what Karl’s own pages leave unsettled, as unavailable rather than an issue', () => {
		const f = byId('rodentsReport', 'karl-unconfirmed');
		expect(f.status).toBe('unavailable');
		expect(f.items.map((i) => i.text)).toEqual([
			'Get help making your report',
			'How your report is processed'
		]);
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
	// is the literal uppercase string only. The inspector lookup's "#" button sits
	// outside any step, so it is reported under copy that won't carry over.
	it('reports the inspector lookup’s unplaced "#" button as copy that won’t carry over', () => {
		const unplaced = byId('inspectorLookup', 'karl-unplaced');
		expect(unplaced.status).toBe('issue');
		expect(unplaced.items.map((i) => i.text)).toContain('“Open the lookup tool” — its button');
	});
});

describe('title words reused in the description', () => {
	it('flags the annual fee page, which repeats 6 title words', () => {
		const f = byId('payFee', 'karl-description-reuse');
		expect(f.status).toBe('issue');
		expect(f.items[0].text).toBe('pay, annual, healthy, housing, fee, apartment');
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
