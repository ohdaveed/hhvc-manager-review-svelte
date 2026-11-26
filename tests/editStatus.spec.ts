import { describe, expect, it } from 'vitest';
import { hashText } from '../src/lib/corpus/hash';
import { editKey } from '../src/lib/stores/applySavedEdits';
import { classifyEdit, classifyLatestEdits } from '../src/lib/stores/editStatus';

const h = hashText;
const live = [{ id: 'row-1', path: 'topic-x--about' }];
const edit = (field_id: string, base: string | null, created_at = '2026-11-26T00:00:00Z') => ({
	id: `e-${field_id}-${created_at}`,
	page_id: 'row-1',
	field_id,
	new_content: 'Accepted wording',
	created_at,
	base_hash: base === null ? null : h(base)
});

describe('classifyEdit', () => {
	it('is current when the base copy still hashes to the anchor', () => {
		expect(classifyEdit({ base_hash: h('Base') }, h('Base'))).toBe('current');
	});

	it('is expired when the base copy moved', () => {
		expect(classifyEdit({ base_hash: h('Base') }, h('Base, reworded'))).toBe('expired');
	});

	it('is orphaned when the field is gone', () => {
		expect(classifyEdit({ base_hash: h('Base') }, undefined)).toBe('orphaned');
	});

	it('treats a row with no anchor as current rather than inventing a claim', () => {
		expect(classifyEdit({ base_hash: null }, h('Anything'))).toBe('current');
	});
});

describe('classifyLatestEdits', () => {
	const run = (base: Record<string, string>, edits: ReturnType<typeof edit>[]) =>
		classifyLatestEdits(
			live,
			edits,
			(_path, fieldId) => base[fieldId],
			async (t) => h(t)
		);

	it('lists only fields that are not current', async () => {
		const out = await run({ title: 'Title', summary: 'Summary, reworded' }, [
			edit('title', 'Title'),
			edit('summary', 'Summary'),
			edit('sections.gone.heading', 'Heading')
		]);
		expect(out).toEqual({
			[editKey('topic-x--about', 'summary')]: 'expired',
			[editKey('topic-x--about', 'sections.gone.heading')]: 'orphaned'
		});
	});

	it('judges a field by its newest edit only', async () => {
		const out = await run({ title: 'Title v2' }, [
			edit('title', 'Title v1', '2026-11-26T00:00:00Z'),
			edit('title', 'Title v2', '2026-11-26T01:00:00Z')
		]);
		expect(out).toEqual({});
	});

	it('is current again when copy changes and changes back', async () => {
		const edits = [edit('title', 'Title')];
		expect(await run({ title: 'Title, changed' }, edits)).not.toEqual({});
		expect(await run({ title: 'Title' }, edits)).toEqual({});
	});
});
