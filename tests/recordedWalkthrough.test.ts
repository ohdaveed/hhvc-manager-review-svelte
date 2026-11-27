/**
 * The walkthrough and the Help tab's transcript are written from the copy as
 * recorded (`CONTEXT.md`): the base with the saved edits, and none of the
 * reviewer's unsaved typing. The layout used to hand them the page on screen
 * -- the copy as SHOWN -- so typing that was never saved leaked into the
 * editor's rebuild instructions for every field but the title and summary,
 * which came from the record instead.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { pageStore } from '../src/lib/stores/pageData.svelte.js';
import { extractCopy } from '../src/lib/corpus/fields';
import { buildWalkthrough } from '../src/lib/karl/walkthrough';
import { pagesByKey } from '../src/lib/data';

const page = pageStore.pages.find((p) => p.id === 'report-rats-or-mice')!;
const paragraph = Object.keys(extractCopy(page as never)).find((k) => /\.paragraphs\.0$/.test(k))!;
const live = [{ id: 'row-1', path: page.id }];
const saved = (id: string, text: string) => ({
	id,
	page_id: 'row-1',
	field_id: paragraph,
	new_content: text,
	created_at: '2026-11-27T00:00:00Z'
});

describe('pageStore.recordedPage', () => {
	afterEach(() => pageStore.cancelChange(page.id, paragraph));

	it('carries the saved edit and leaves the unsaved typing out', () => {
		pageStore.setChange(page.id, paragraph, 'Typed but never saved.');
		const recorded = pageStore.recordedPage(page.id, live, [saved('e1', 'The saved wording.')]);
		expect(extractCopy(recorded as never)[paragraph]).toBe('The saved wording.');
		// The page on screen still shows the typing.
		expect(extractCopy(page as never)[paragraph]).toBe('Typed but never saved.');
	});

	it('leaves out a save still in flight', () => {
		const base = extractCopy(page as never)[paragraph];
		const recorded = pageStore.recordedPage(page.id, live, [saved('temp-1', 'Not confirmed.')]);
		expect(extractCopy(recorded as never)[paragraph]).toBe(base);
	});

	it('is undefined for a page it never built', () => {
		expect(pageStore.recordedPage('no-such-page', live, [])).toBeUndefined();
	});
});

describe('the walkthrough of the recorded page', () => {
	afterEach(() => pageStore.cancelChange(page.id, paragraph));

	it('transcribes the saved edit, not the unsaved typing', () => {
		pageStore.setChange(page.id, paragraph, 'Typed but never saved.');
		const recorded = pageStore.recordedPage(page.id, live, [saved('e1', 'The saved wording.')])!;
		const { markdown } = buildWalkthrough(recorded, pagesByKey as never, null);
		expect(markdown).toContain('The saved wording.');
		expect(markdown).not.toContain('Typed but never saved.');
	});
});
