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

	it('gives every corpus page five findings, each citing a Karl help page', () => {
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
				'karl-url-pattern'
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
