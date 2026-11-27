import { describe, expect, it } from 'vitest';
import { pagesByKey } from '$lib/data/index';
import { extractCopy } from './fields';
import { copyAsRecorded, latestBy, latestByField } from './overlay';

describe('latestByField', () => {
	it('keeps the newest row per field by created_at, not by row order', () => {
		const latest = latestByField([
			{ field_id: 'title', new_content: 'second', created_at: '2026-08-02' },
			{ field_id: 'title', new_content: 'first', created_at: '2026-08-01' },
			{ field_id: 'summary', new_content: 'S', created_at: '2026-08-01' }
		]);
		expect(latest.get('title')?.new_content).toBe('second');
		expect(latest.get('summary')?.new_content).toBe('S');
	});

	it('drops rows whose content is not a string', () => {
		const rows = [{ field_id: 'title', new_content: null as unknown as string }];
		expect(latestByField(rows).size).toBe(0);
	});
});

describe('latestBy', () => {
	it('drops rows the key function maps to undefined', () => {
		const rows = [
			{ k: 'a', new_content: 'x' },
			{ k: undefined, new_content: 'y' }
		];
		expect([...latestBy(rows, (r) => r.k).keys()]).toEqual(['a']);
	});
});

describe('copyAsRecorded', () => {
	const rats = (pagesByKey as Record<string, object>).rodentsReport;
	const anyField = (page: object, suffix: string) =>
		Object.keys(extractCopy(page as never)).find((k) => k.endsWith(suffix))!;

	it('applies the newest saved edit per field to a raw corpus page', () => {
		const heading = anyField(rats, '.heading');
		const recorded = copyAsRecorded(rats, [
			{ field_id: 'title', new_content: 'old', created_at: '2026-01-01' },
			{ field_id: 'title', new_content: 'Report rats and mice', created_at: '2026-01-02' },
			{ field_id: heading, new_content: 'New heading', created_at: '2026-01-01' }
		]);
		const copy = extractCopy(recorded as never);
		expect(copy.title).toBe('Report rats and mice');
		expect(copy[heading]).toBe('New heading');
	});

	it('leaves the page it was given untouched', () => {
		const before = JSON.stringify(rats);
		copyAsRecorded(rats, [{ field_id: 'title', new_content: 'changed' }]);
		expect(JSON.stringify(rats)).toBe(before);
	});

	it('leaves an orphaned edit off rather than inventing a field', () => {
		const recorded = copyAsRecorded(rats, [
			{ field_id: 'sections.no-such-section.paragraphs.0', new_content: 'x' }
		]);
		expect(extractCopy(recorded as never)).toEqual(extractCopy(rats as never));
	});
});
