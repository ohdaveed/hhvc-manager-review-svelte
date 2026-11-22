import { describe, expect, it } from 'vitest';
import { buildReviewExport } from '$lib/data/exportReview';
import type { ReviewPage, Edit } from '$lib/stores/reviewState';

describe('buildReviewExport', () => {
	it('combines corpus metadata with live review decisions and edits', () => {
		const corpus = [
			{ id: 'page-1', title: 'Page 1', slug: 'https://sf.gov/page-1', type: 'Service' },
			{ id: 'page-2', title: 'Page 2', slug: 'https://sf.gov/page-2', type: 'Information' }
		];

		const livePages: ReviewPage[] = [
			{
				id: 'live-1',
				review_id: 'rev-1',
				path: 'page-1',
				status: 'approved',
				manager_notes: 'Looks great.',
				page_checks: { altText: { status: 'pass', message: 'All images have alt' } }
			}
		];

		const edits: Edit[] = [
			{
				id: 'edit-1',
				page_id: 'live-1',
				field_id: 'heading-1',
				new_content: 'Updated Heading',
				created_at: '2026-11-22T05:10:00Z'
			}
		];

		const exportData = buildReviewExport(corpus, livePages, edits);

		expect(exportData.totalPages).toBe(2);
		expect(exportData.decidedCount).toBe(1);
		expect(exportData.pages).toHaveLength(2);

		const p1 = exportData.pages.find((p) => p.id === 'page-1');
		expect(p1?.status).toBe('approved');
		expect(p1?.managerNotes).toBe('Looks great.');
		expect(p1?.pageChecks).toEqual({
			altText: { status: 'pass', message: 'All images have alt' }
		});

		const p2 = exportData.pages.find((p) => p.id === 'page-2');
		expect(p2?.status).toBe('needs-review');
		expect(p2?.managerNotes).toBe('');

		expect(exportData.edits).toHaveLength(1);
		expect(exportData.edits[0].fieldId).toBe('heading-1');
		expect(exportData.edits[0].newContent).toBe('Updated Heading');
	});
});
