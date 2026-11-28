import { describe, expect, it } from 'vitest';
import { pagesByKey } from '$lib/data';
import { buildReadinessSummary } from './readinessRows';

const sampleTransactionPage = {
	id: 'report-rats-or-mice',
	slug: 'sf.gov/report-rats-or-mice',
	type: 'Transaction',
	title: 'Report rats or mice',
	summary: 'Report rodents in your building or neighborhood.',
	whatToKnow: {
		cost: 'Free',
		thingsToKnow: ['You can report anonymously.']
	},
	sections: [
		{
			fieldKey: 'what-to-do',
			heading: 'What to do',
			component: 'what-to-do',
			steps: [
				{
					title: 'Report online',
					text: ['Use the 311 form.'],
					karl: 'Steps'
				}
			],
			karl: 'What to do'
		},
		{
			fieldKey: 'unknown-notes',
			heading: 'Editor scratch',
			component: 'body',
			kind: 'editor',
			paragraphs: ['Internal note only.'],
			karl: 'None — editor note'
		}
	]
};

describe('buildReadinessSummary', () => {
	it('returns an empty summary when no page is given', () => {
		expect(buildReadinessSummary(null, null, pagesByKey)).toEqual({
			inKarlCount: 0,
			totalCount: 0,
			unit: 'items',
			rows: []
		});
	});

	it('lists Title, Summary, What to know, and each section with Karl statuses', () => {
		const summary = buildReadinessSummary(sampleTransactionPage, null, pagesByKey);
		expect(summary.unit).toBe('sections');
		expect(summary.totalCount).toBe(2);
		expect(summary.rows.map((r) => r.label)).toEqual([
			'Title / H1',
			'Summary / Lead',
			'What to know',
			'What to do',
			'Editor scratch'
		]);
		expect(summary.rows[0].badge).toBe('populated');
		expect(summary.rows[1].badge).toBe('populated');
		expect(summary.rows[2].badge).toBe('mapped');
		expect(summary.rows[3].highlightKind).toBe('section');
		expect(summary.rows[3].highlightTarget).toBe('what-to-do');
	});

	it('marks Title and Summary as ai-drafted on draft pages', () => {
		const summary = buildReadinessSummary(sampleTransactionPage, null, pagesByKey, {
			isDraft: true
		});
		expect(summary.rows[0].badge).toBe('ai-drafted');
		expect(summary.rows[0].badgeLabel).toBe('AI-drafted');
		expect(summary.rows[1].badge).toBe('ai-drafted');
	});
});
