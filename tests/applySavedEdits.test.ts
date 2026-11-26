import { describe, it, expect } from 'vitest';
import { applySavedEdits, editKey, latestEdits } from '../src/lib/stores/applySavedEdits';

const page = () => ({
	id: 'topic-x--about',
	title: 'Original title',
	summary: 'Original summary.',
	sections: [{ fieldKey: 'how', heading: 'How', paragraphs: ['First.'] }]
});
const live = [{ id: 'row-1', path: 'topic-x--about' }];
const edit = (field_id: string, new_content: string, created_at: string, page_id = 'row-1') => ({
	page_id,
	field_id,
	new_content,
	created_at
});
const never = () => false;

describe('applySavedEdits', () => {
	it('writes the saved copy onto the page', () => {
		const p = page();
		const n = applySavedEdits([p], live, [edit('title', 'Saved', '2026-11-26T00:00:00Z')], never);
		expect(n).toBe(1);
		expect(p.title).toBe('Saved');
	});

	it('reaches section fields by field key', () => {
		const p = page();
		applySavedEdits(
			[p],
			live,
			[edit('sections.how.paragraphs.0', 'Edited.', '2026-11-26T00:00:00Z')],
			never
		);
		expect(p.sections[0].paragraphs[0]).toBe('Edited.');
	});

	it('last write wins by created_at, whatever the array order', () => {
		const p = page();
		applySavedEdits(
			[p],
			live,
			[
				edit('title', 'Newer', '2026-11-26T02:00:00Z'),
				edit('title', 'Older', '2026-11-26T01:00:00Z')
			],
			never
		);
		expect(p.title).toBe('Newer');
	});

	it('leaves a field alone while it is being typed into', () => {
		const p = page();
		const n = applySavedEdits(
			[p],
			live,
			[edit('title', 'Saved', '2026-11-26T00:00:00Z')],
			(path, fieldId) => path === 'topic-x--about' && fieldId === 'title'
		);
		expect(n).toBe(0);
		expect(p.title).toBe('Original title');
	});

	it('ignores edits for rows not in the review and fields that do not resolve', () => {
		const p = page();
		const n = applySavedEdits(
			[p],
			live,
			[
				edit('title', 'Elsewhere', '2026-11-26T00:00:00Z', 'row-unknown'),
				edit('sections.gone.paragraphs.0', 'x', '2026-11-26T00:00:00Z')
			],
			never
		);
		expect(n).toBe(0);
		expect(p.title).toBe('Original title');
	});

	it('is a no-op when the page already says it', () => {
		const p = page();
		const edits = [edit('title', 'Saved', '2026-11-26T00:00:00Z')];
		applySavedEdits([p], live, edits, never);
		expect(applySavedEdits([p], live, edits, never)).toBe(0);
	});
});

describe('applySavedEdits and optimistic rows', () => {
	it('does not apply a row the database has not confirmed', () => {
		const p = page();
		const n = applySavedEdits(
			[p],
			live,
			[{ ...edit('title', 'In flight', '2026-11-26T00:00:00Z'), id: 'temp-1764000000000' }],
			never
		);
		expect(n).toBe(0);
		expect(p.title).toBe('Original title');
	});

	it('does not fall back to an older confirmed row while a newer one is in flight', () => {
		const p = page();
		p.title = 'Shown now';
		applySavedEdits(
			[p],
			live,
			[
				{ ...edit('title', 'Older', '2026-11-26T00:00:00Z'), id: 'row-a' },
				{ ...edit('title', 'In flight', '2026-11-26T01:00:00Z'), id: 'temp-1' }
			],
			never
		);
		expect(p.title).toBe('Shown now');
	});

	it('applies the row once the insert returns it under its real id', () => {
		const p = page();
		applySavedEdits(
			[p],
			live,
			[{ ...edit('title', 'Saved', '2026-11-26T00:00:00Z'), id: 'row-b' }],
			never
		);
		expect(p.title).toBe('Saved');
	});
});

describe('applySavedEdits held-back saves', () => {
	it('reports a confirmed edit it leaves off a field with an unsaved change', () => {
		const p = page();
		const heard: [string, string, string | undefined][] = [];
		applySavedEdits(
			[p],
			live,
			[{ ...edit('title', 'Theirs', '2026-11-26T00:00:00Z'), id: 'row-c', user_id: 'other' }],
			() => true,
			(path, fieldId, e) => heard.push([path, fieldId, e.id])
		);
		expect(p.title).toBe('Original title');
		expect(heard).toEqual([['topic-x--about', 'title', 'row-c']]);
	});

	it('does not report an optimistic row, which is the reviewer saving', () => {
		const heard: string[] = [];
		applySavedEdits(
			[page()],
			live,
			[{ ...edit('title', 'Mine', '2026-11-26T00:00:00Z'), id: 'temp-2' }],
			() => true,
			(_p, fieldId) => heard.push(fieldId)
		);
		expect(heard).toEqual([]);
	});
});

describe('latestEdits', () => {
	it('keys the newest edit per field by page path', () => {
		const newest = latestEdits(live, [
			{ ...edit('title', 'Old', '2026-11-26T00:00:00Z'), id: 'row-1' },
			{ ...edit('title', 'New', '2026-11-26T01:00:00Z'), id: 'row-2' }
		]);
		expect(newest.get(editKey('topic-x--about', 'title'))?.id).toBe('row-2');
		expect(newest.get(editKey('topic-x--about', 'summary'))).toBeUndefined();
	});
});
