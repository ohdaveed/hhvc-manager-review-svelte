import { describe, it, expect } from 'vitest';
import { labelCount, longParagraphs, rawUrlsInProse, vagueLabels } from './textChecks';
import type { CopyEntry } from './pageCopy';

const label = (key: string, text: string): CopyEntry => ({ key, text, kind: 'label' });
const prose = (key: string, text: string): CopyEntry => ({ key, text, kind: 'prose' });

describe('vagueLabels', () => {
	it('flags a button label from the button list', () => {
		const issues = vagueLabels([label('sections.a.button', 'Submit')]);
		expect(issues.map((i) => i.text)).toEqual(['Submit']);
	});

	it('does not flag a button label that says what it does', () => {
		expect(vagueLabels([label('sections.a.button', 'Report through 311')])).toEqual([]);
	});

	it('flags an empty label rather than passing it silently', () => {
		const issues = vagueLabels([label('sections.a.button', '   ')]);
		expect(issues[0].text).toBe('(empty)');
	});

	it('ignores trailing punctuation and emphasis when matching', () => {
		const issues = vagueLabels([label('sections.a.cards.0.title', '**Learn more**')]);
		expect(issues).toHaveLength(1);
	});

	it('reads link labels out of markdown links in body copy', () => {
		const issues = vagueLabels([
			prose('sections.a.paragraphs.0', 'See [click here](https://sf.gov/x) for the fee schedule.')
		]);
		expect(issues).toHaveLength(1);
		expect(issues[0].text).toBe('click here');
		expect(issues[0].detail).toContain('https://sf.gov/x');
	});

	it('passes a descriptive markdown link label', () => {
		const issues = vagueLabels([
			prose('sections.a.paragraphs.0', 'Read the [pest prevention guide](https://sf.gov/x).')
		]);
		expect(issues).toEqual([]);
	});

	it('judges a link label against the link list, not the button list', () => {
		// "go" is vague on a button and not on a link; checking a markdown link
		// against the button list would invent a finding.
		const issues = vagueLabels([
			prose('sections.a.paragraphs.0', 'You can [go](https://sf.gov/x).')
		]);
		expect(issues).toEqual([]);
	});
});

describe('rawUrlsInProse', () => {
	it('flags a URL printed in body copy', () => {
		const issues = rawUrlsInProse([
			prose('sections.a.paragraphs.0', 'Go to https://sf.gov/report now.')
		]);
		expect(issues).toHaveLength(1);
	});

	it('does not flag a URL that is already inside a markdown link', () => {
		// This is the regression: nine properly-labelled links across three
		// corpus pages were reported as pasted URLs before markdown was read.
		const issues = rawUrlsInProse([
			prose(
				'sections.a.paragraphs.0',
				'See [Pest prevention](https://ipm.ucanr.edu/home-and-landscape/pest-prevention/) for more.'
			)
		]);
		expect(issues).toEqual([]);
	});

	it('never flags a url-kind entry, which is supposed to hold a URL', () => {
		const issues = rawUrlsInProse([
			{ key: 'sections.a.buttonUrl', text: 'https://sf.gov/report', kind: 'url' }
		]);
		expect(issues).toEqual([]);
	});
});

describe('longParagraphs', () => {
	it('flags a paragraph past three sentences', () => {
		const issues = longParagraphs([prose('p', 'One thing. Two thing. Three thing. Four thing.')]);
		expect(issues).toHaveLength(1);
		expect(issues[0].detail).toContain('4 sentences');
	});

	it('allows exactly three', () => {
		expect(longParagraphs([prose('p', 'One thing. Two thing. Three thing.')])).toEqual([]);
	});

	it('does not count the dots in a link URL as sentence breaks', () => {
		const issues = longParagraphs([
			prose('p', 'Read [the guide](https://ipm.ucanr.edu/home/a.b.c/d.e.f/) before you start.')
		]);
		expect(issues).toEqual([]);
	});
});

describe('labelCount', () => {
	it('counts button labels and markdown links together', () => {
		const total = labelCount([
			label('sections.a.button', 'Report through 311'),
			prose('sections.a.paragraphs.0', 'See [one](https://a) and [two](https://b).')
		]);
		expect(total).toBe(3);
	});
});

describe('multiple pasted URLs in one field', () => {
	it('reports every bare URL, not just the first', () => {
		// The panel derives its count and its item list from this, so one issue
		// per field would understate the finding and leave the later addresses
		// with nothing for a reviewer to act on.
		const issues = rawUrlsInProse([
			prose('p', 'Go to https://sf.gov/a then https://sf.gov/b and finally www.example.com today.')
		]);
		expect(issues.map((i) => i.text)).toEqual([
			'https://sf.gov/a',
			'https://sf.gov/b',
			'www.example.com'
		]);
	});

	it('still reports a single URL once', () => {
		expect(rawUrlsInProse([prose('p', 'Go to https://sf.gov/a now.')])).toHaveLength(1);
	});
});
