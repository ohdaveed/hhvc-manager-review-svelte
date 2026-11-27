import { describe, expect, it } from 'vitest';
import { pagesByKey } from '$lib/data/index';
import { transcriptFor, transcriptMarkdown } from './transcript';
import type { ReviewRecord } from './reviewRecord';

const rats = (pagesByKey as Record<string, { title: string }>).rodentsReport;
const record = (over: Partial<ReviewRecord> = {}): ReviewRecord => ({
	section_edits: {},
	decision: 'Approved',
	...over
});

describe('transcriptFor', () => {
	it('transcribes the copy the page carries, not copy in the record', () => {
		const md = transcriptMarkdown(
			transcriptFor({ ...rats, title: 'Title on the page' }, record({ edited_title: 'Stale' }))
		);
		expect(md).toContain('Title on the page');
		expect(md).not.toContain('Stale');
	});

	it('keeps the edited slug from the record: a page object never carries one', () => {
		const md = transcriptMarkdown(transcriptFor(rats, record({ url_slug: 'report-rats-new' })));
		expect(md).toContain('report-rats-new');
	});

	it('keeps "no review" apart from "reviewed"', () => {
		expect(transcriptFor(rats, null).reviewed).toBeFalsy();
		expect(transcriptFor(rats, record()).reviewed).toBeTruthy();
	});

	it('drops the routable id, which is not copy', () => {
		const t = transcriptFor({ ...rats, id: 'report-rats-or-mice' }, null);
		expect(JSON.stringify(t.unmapped)).not.toContain('"id"');
	});
});
