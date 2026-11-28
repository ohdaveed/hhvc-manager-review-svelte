import { describe, expect, it } from 'vitest';
import { extractLinkTargets } from './linkTargets';

const pagesByKey = {
	afterReport: { slug: 'sf.gov/after-you-report' }
};

describe('extractLinkTargets', () => {
	it('returns an empty list for nullish pages', () => {
		expect(extractLinkTargets(null)).toEqual([]);
	});

	it('extracts and classifies external and internal links across prose, cards, and buttons', () => {
		const links = extractLinkTargets(
			{
				summary:
					'See [CDC guidance](https://www.cdc.gov/rodents/index.html) or [next steps](afterReport).',
				sections: [
					{
						fieldKey: 'what-to-do',
						heading: 'What to do',
						paragraphs: [
							'Check [SF.gov housing](https://sf.gov/housing) or email [us](mailto:hhvc@sf.gov).'
						],
						button: 'Apply online',
						buttonUrl: 'https://portal.sfgov.org/apply',
						cards: [
							{ title: 'After you report', target: 'afterReport' },
							{ title: 'State law', url: 'https://leginfo.legislature.ca.gov/faces/codes.xhtml' }
						]
					}
				]
			},
			pagesByKey
		);

		expect(links.map((l) => [l.kind, l.displayUrl, l.fieldId])).toEqual([
			['external', 'cdc.gov/rodents/index.html', 'summary'],
			['internal', 'sf.gov/after-you-report', 'summary'],
			['internal', 'sf.gov/housing', 'sections.what-to-do.paragraphs.0'],
			['external', 'portal.sfgov.org/apply', 'sections.what-to-do.button'],
			['internal', 'sf.gov/after-you-report', 'sections.what-to-do.cards.0.title'],
			[
				'external',
				'leginfo.legislature.ca.gov/faces/codes.xhtml',
				'sections.what-to-do.cards.1.title'
			]
		]);
	});
});
