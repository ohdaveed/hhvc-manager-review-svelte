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
		expect(violation.where).toBe('sections.0.callout');
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
	// Deliberately asserts the CURRENT count rather than zero. These survive
	// despite the 1:1 decision recording callout titles as removed "on every
	// page", and folding each into its callout body is a copy edit on
	// reviewer-facing content -- a decision for the content owner, not a
	// drive-by fix. Pinning stops a fourth appearing quietly.
	//
	// Was 4 until the walk was fixed: five of the nine then in the corpus sit
	// under `sections[].steps[]` and a one-level pass never saw them. Six have
	// since been resolved, leaving three.
	it('has exactly the three known callout-title violations, and no others', () => {
		const violations = findOneToOneViolations(allPages);

		expect(violations.map((v) => `${v.slug}|${v.text}`)).toEqual([
			'sf.gov/report/health-code-article-11-plain-language|This is not legal advice',
			'sf.gov/pay-your-annual-healthy-housing-fee-apartment-buildings|Annual fee and reinspection fees are different',
			'sf.gov/pay-your-annual-healthy-housing-fee-apartment-buildings|What the annual fee supports'
		]);
	});

	// The bug this catches shipped once: a one-level pass over `page.sections[]`
	// reported 4 where the corpus had 9. An undercounting validator is worse
	// than none, because a pinned test then freezes the wrong number as correct.
	it('finds callouts nested below the top-level sections', () => {
		const nested = findOneToOneViolations(allPages).filter((v) => v.where.includes('.steps.'));

		expect(nested).toHaveLength(2);
	});

	it('carries no image the corpus has no panel for', () => {
		const images = findOneToOneViolations(allPages).filter((v) => v.rule === 'image-without-panel');

		expect(images).toEqual([]);
	});
});
