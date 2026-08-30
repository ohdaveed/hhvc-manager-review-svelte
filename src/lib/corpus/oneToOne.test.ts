import { describe, expect, it } from 'vitest';
import { findOneToOneViolations } from './oneToOne.js';
import { allPages } from '../data/index.js';

describe('findOneToOneViolations', () => {
	it('passes a page with no callout title and no photo', () => {
		const clean = [
			{ slug: 'x', type: 'Transaction', sections: [{ heading: 'H', callout: { text: 'body' } }] }
		];

		expect(findOneToOneViolations(clean)).toEqual([]);
	});

	it('flags a callout title, which Karl has no field for on any host', () => {
		const pages = [
			{
				slug: 'x',
				type: 'Transaction',
				sections: [
					{ heading: 'How to apply', callout: { title: 'Not legal advice', text: 'body' } }
				]
			}
		];

		const [violation] = findOneToOneViolations(pages);

		expect(violation.rule).toBe('callout-title');
		expect(violation.text).toBe('Not legal advice');
		expect(violation.where).toContain('How to apply');
	});

	it('ignores an empty or whitespace callout title', () => {
		const pages = [
			{ slug: 'x', type: 'Transaction', sections: [{ callout: { title: '   ', text: 'b' } }] }
		];

		expect(findOneToOneViolations(pages)).toEqual([]);
	});

	// The type list comes from the panel inventory, not a hardcoded set, so
	// this moves when the field map moves.
	it('flags a photo on a Transaction but allows one on Information', () => {
		const onTransaction = [{ slug: 'a', type: 'Transaction', photo: { alt: 'A yard' } }];
		const onInformation = [{ slug: 'b', type: 'Information', photo: { alt: 'A yard' } }];

		expect(findOneToOneViolations(onTransaction)[0]?.rule).toBe('image-without-panel');
		expect(findOneToOneViolations(onInformation)).toEqual([]);
	});

	it('fails closed on a type with no panel inventory', () => {
		const unknown = [{ slug: 'c', type: 'Newsletter', photo: { alt: 'x' } }];

		expect(findOneToOneViolations(unknown)[0]?.rule).toBe('image-without-panel');
	});
});

describe('the real corpus', () => {
	// Deliberately asserts the CURRENT count rather than zero. Four callout
	// titles survive despite the 1:1 decision recording them as removed "on
	// every page", and folding them into their callout bodies is a copy edit on
	// reviewer-facing content -- a decision for the content owner, not a
	// drive-by fix. This pins the number so it cannot grow quietly, and turns
	// red the moment someone adds a fifth.
	it('has exactly the four known callout-title violations, and no others', () => {
		const violations = findOneToOneViolations(allPages);

		expect(violations.map((v) => v.rule)).toEqual([
			'callout-title',
			'callout-title',
			'callout-title',
			'callout-title'
		]);
		expect(violations.map((v) => v.slug)).toEqual([
			'sf.gov/report-garbage-filth-vegetation',
			'sf.gov/find-healthy-housing-inspector-by-neighborhood',
			'sf.gov/report/health-code-article-11-plain-language',
			'sf.gov/information/tenant-rights-and-reporting-housing-conditions'
		]);
	});

	it('carries no image the corpus has no panel for', () => {
		const images = findOneToOneViolations(allPages).filter((v) => v.rule === 'image-without-panel');

		expect(images).toEqual([]);
	});
});
