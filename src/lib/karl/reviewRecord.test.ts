import { describe, it, expect } from 'vitest';
import { reviewRecordFor } from './reviewRecord';
import type { Edit, ReviewPage } from '$lib/stores/reviewState';

/**
 * This fold is the only thing standing between a reviewer's saved edits and
 * what an editor is told to type, so each property below is one a caller used
 * to get wrong on its own.
 */
const page = (over: Partial<ReviewPage> = {}): ReviewPage => ({
	id: 'row-1',
	review_id: 'rev-1',
	path: 'about-hhvc',
	status: 'needs-review',
	manager_notes: null,
	page_checks: null,
	...over
});

const edit = (field_id: string, new_content: string, created_at: string): Edit => ({
	page_id: 'row-1',
	field_id,
	new_content,
	created_at
});

describe('reviewRecordFor', () => {
	it('returns null when nothing is recorded, so the transcript knows no review happened', () => {
		// `buildTranscript` sets `reviewed` from the record's presence, so an
		// empty object here would claim a review that never took place.
		expect(reviewRecordFor('about-hhvc', [], [])).toBeNull();
		expect(reviewRecordFor(undefined, [page()], [])).toBeNull();
	});

	it('returns a record once the page carries a decision, even with no edits', () => {
		const record = reviewRecordFor('about-hhvc', [page({ status: 'approved' })], []);
		expect(record).not.toBeNull();
		expect(record?.decision).toBe('Approved');
		expect(record?.section_edits).toEqual({});
	});

	it('labels every status the way the transcript tests approval', () => {
		// `APPROVED_DECISIONS` in karl-transcript.js matches these as string
		// literals, so a label invented here reads as "NOT APPROVED".
		const labels = (['needs-review', 'approved', 'blocked', 'revise'] as const).map(
			(status) => reviewRecordFor('about-hhvc', [page({ status })], [])?.decision
		);
		expect(labels).toEqual(['Needs review', 'Approved', 'Blocked', 'Needs revision']);
	});

	it('splits title, summary and slug out of the section edits', () => {
		const record = reviewRecordFor(
			'about-hhvc',
			[page()],
			[
				edit('title', 'New title', '2026-01-01T00:00:00Z'),
				edit('summary', 'New summary', '2026-01-01T00:00:01Z'),
				edit('slug', 'new-slug', '2026-01-01T00:00:02Z'),
				edit('sections.0.paragraphs', 'New body', '2026-01-01T00:00:03Z')
			]
		);
		expect(record?.edited_title).toBe('New title');
		expect(record?.edited_summary).toBe('New summary');
		expect(record?.url_slug).toBe('new-slug');
		expect(record?.section_edits).toEqual({ 'sections.0.paragraphs': 'New body' });
	});

	it('is last-write-wins by created_at, not by row order', () => {
		// The rows arrive newest-first here, which is what PostgREST may do: a
		// fold trusting row order would keep the stale value.
		const record = reviewRecordFor(
			'about-hhvc',
			[page()],
			[
				edit('title', 'Newest', '2026-01-03T00:00:00Z'),
				edit('title', 'Oldest', '2026-01-01T00:00:00Z'),
				edit('title', 'Middle', '2026-01-02T00:00:00Z')
			]
		);
		expect(record?.edited_title).toBe('Newest');
	});

	it('ignores edits belonging to another page', () => {
		// Note the record is still returned: `pages.status` is NOT NULL, so any
		// page in the loaded review has a decision to report. What must not
		// happen is another page's text arriving in this page's fields.
		const record = reviewRecordFor(
			'about-hhvc',
			[page()],
			[{ page_id: 'row-2', field_id: 'title', new_content: 'Someone else', created_at: 'z' }]
		);
		expect(record?.edited_title).toBeUndefined();
		expect(record?.section_edits).toEqual({});
	});

	it('matches the live page on path, not on row id', () => {
		// `pageData.id` is the routable corpus id and `pages.path` holds it; the
		// row's own uuid is not something a caller has.
		expect(reviewRecordFor('row-1', [page({ status: 'approved' })], [])).toBeNull();
		expect(reviewRecordFor('about-hhvc', [page({ status: 'approved' })], [])).not.toBeNull();
	});
});
