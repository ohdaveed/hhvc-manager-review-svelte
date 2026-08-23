import { describe, it, expect } from 'vitest';
import { extractFields } from './fields.js';

const page = {
	slug: 'sf.gov/topic-x--about',
	type: 'About us',
	title: 'About vector control',
	summary: 'What the program does.',
	audience: ['Residents', 'Property owners'],
	reading: 'Grade 6',
	editorStatus: 'placeholder',
	editorNote: 'An annotation that must not be hashed.',
	sections: [
		{
			heading: 'How to report',
			karl: 'Maps to an Information block.',
			paragraphs: ['First paragraph.', 'Second paragraph.'],
			bullets: ['First bullet.']
		},
		{
			heading: 'What happens next',
			paragraphs: ['Only paragraph.'],
			callout: { title: 'Note', text: 'Callout body.' }
		}
	]
};

describe('extractFields', () => {
	it('produces the exact id shapes the UI advertises', () => {
		expect(Object.keys(extractFields(page)).sort()).toEqual(
			[
				'audience.0',
				'audience.1',
				'sections.how-to-report.bullets.0',
				'sections.how-to-report.heading',
				'sections.how-to-report.paragraphs.0',
				'sections.how-to-report.paragraphs.1',
				'sections.what-happens-next.callout.text',
				'sections.what-happens-next.callout.title',
				'sections.what-happens-next.heading',
				'sections.what-happens-next.paragraphs.0',
				'summary',
				'title'
			].sort()
		);
	});

	it('maps ids to their text', () => {
		const fields = extractFields(page);
		expect(fields['title']).toBe('About vector control');
		expect(fields['audience.1']).toBe('Property owners');
		expect(fields['sections.how-to-report.paragraphs.1']).toBe('Second paragraph.');
		expect(fields['sections.what-happens-next.callout.text']).toBe('Callout body.');
	});

	it('excludes annotations and metadata', () => {
		const keys = Object.keys(extractFields(page));
		expect(keys).not.toContain('editorNote');
		expect(keys).not.toContain('karl');
		expect(keys).not.toContain('type');
		expect(keys).not.toContain('reading');
		expect(keys).not.toContain('slug');
	});

	it('omits absent optional collections rather than emitting empty ids', () => {
		const bare = { title: 'T', sections: [{ heading: 'H' }] };
		expect(Object.keys(extractFields(bare)).sort()).toEqual(['sections.h.heading', 'title']);
	});
});
