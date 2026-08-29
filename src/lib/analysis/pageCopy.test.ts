import { describe, it, expect } from 'vitest';
import { analyzableCopy, classifyKey, readabilityTextFrom } from './pageCopy';
import { scoreReadability } from './readability';
import { allPages } from '$lib/data/index';

describe('classifyKey', () => {
	it('treats destinations as urls, never as prose', () => {
		expect(classifyKey('sections.a.buttonUrl')).toBe('url');
		expect(classifyKey('sections.a.cards.0.url')).toBe('url');
		expect(classifyKey('contact.email.0')).toBe('url');
	});

	it('treats control text as labels', () => {
		expect(classifyKey('sections.a.button')).toBe('label');
		expect(classifyKey('sections.a.steps.0.button')).toBe('label');
		expect(classifyKey('sections.a.cards.0.title')).toBe('label');
	});

	it('treats SEO and routing strings as meta, so they never reach the score', () => {
		expect(classifyKey('seoTitle')).toBe('meta');
		expect(classifyKey('metaDescription')).toBe('meta');
		expect(classifyKey('topicTag')).toBe('meta');
	});

	it('treats headings as headings', () => {
		expect(classifyKey('title')).toBe('heading');
		expect(classifyKey('sections.a.heading')).toBe('heading');
		expect(classifyKey('sections.a.steps.0.title')).toBe('heading');
		expect(classifyKey('sections.a.callout.title')).toBe('heading');
	});

	it('falls through to prose', () => {
		expect(classifyKey('summary')).toBe('prose');
		expect(classifyKey('sections.a.steps.0.bullets.2')).toBe('prose');
	});
});

describe('analyzableCopy', () => {
	const page = {
		title: 'Report rats',
		summary: 'How to report.',
		sections: [{ heading: 'What to do', paragraphs: ['Call 311.'], button: 'Report through 311' }]
	};

	it('drops empty strings rather than counting them as fields', () => {
		const entries = analyzableCopy({ ...page, summary: '   ' });
		expect(entries.some((e) => e.key === 'summary')).toBe(false);
	});

	it('applies a saved edit over the corpus text', () => {
		const entries = analyzableCopy(page, [
			{ field_id: 'title', new_content: 'Report rats and mice', created_at: '2026-08-01' }
		]);
		expect(entries.find((e) => e.key === 'title')?.text).toBe('Report rats and mice');
	});

	it('applies the newest edit when a field has several, matching the append-only fold', () => {
		const entries = analyzableCopy(page, [
			{ field_id: 'title', new_content: 'second', created_at: '2026-08-02' },
			{ field_id: 'title', new_content: 'first', created_at: '2026-08-01' }
		]);
		expect(entries.find((e) => e.key === 'title')?.text).toBe('second');
	});
});

describe('readabilityTextFrom', () => {
	it('excludes labels and urls, and keeps headings', () => {
		const text = readabilityTextFrom(
			analyzableCopy({
				title: 'Report rats',
				sections: [
					{
						heading: 'What to do',
						paragraphs: ['Call 311.'],
						button: 'Report through 311',
						buttonUrl: 'https://sf.gov/x'
					}
				]
			})
		);
		expect(text).toContain('What to do');
		expect(text).toContain('Call 311.');
		expect(text).not.toContain('Report through 311');
		expect(text).not.toContain('https://sf.gov/x');
	});

	it('separates entries with a blank line, so a heading is a sentence boundary', () => {
		const text = readabilityTextFrom(analyzableCopy({ title: 'What to do', summary: 'Call 311.' }));
		expect(text).toContain('\n\n');
	});
});

describe('over the real corpus', () => {
	// The reason this module reads the corpus instead of the DOM: `steps` is
	// never rendered, and on the Transaction pages it is most of the copy. If
	// this ever returns nothing for a steps key, the score silently starts
	// measuring a fraction of the page again.
	it('measures step copy, which the renderer never emits', () => {
		const rodents = (allPages as Record<string, unknown>[]).find((p) =>
			String(p.slug).includes('report-rats-mice-four-legged-problems')
		);
		expect(rodents, 'the rodents page must be in allPages').toBeTruthy();
		const entries = analyzableCopy(rodents as never);
		const stepEntries = entries.filter((e) => /\.steps\.\d+\./.test(e.key));
		expect(stepEntries.length).toBeGreaterThan(10);
		const score = scoreReadability(readabilityTextFrom(entries));
		expect(score.instructional).toBe(true);
	});

	it('produces analyzable text for every page in the corpus', () => {
		for (const page of allPages as Record<string, unknown>[]) {
			const text = readabilityTextFrom(analyzableCopy(page as never));
			expect(text.length, `${String(page.slug)} produced no analyzable text`).toBeGreaterThan(50);
		}
	});
});
