import { describe, expect, it } from 'vitest';
import { allPages } from '$lib/data/index';
import { karlComponentFindings } from './karlComponentChecks';
import { analyzePage } from './index';

const pages = allPages as Record<string, unknown>[];

/** `slug / finding id / item text` for every issue in the corpus. */
function corpusIssues(): string[] {
	const out: string[] = [];
	for (const page of pages) {
		for (const f of karlComponentFindings(page)) {
			if (f.status !== 'issue') continue;
			for (const item of f.items) out.push(`${page.slug} / ${f.id} / ${item.text}`);
		}
	}
	return out.sort();
}

// Only Related targets are judged here now. Every other component check moved
// into the placements (`$lib/karl/placement`), where `placement.test.ts`
// covers it, so the Karl outline and the Analysis panel cannot disagree.
describe('Related targets on the current corpus', () => {
	// Pinned, so a content edit that fixes or introduces one shows up here.
	it('finds exactly these issues', () => {
		expect(corpusIssues()).toEqual(
			[
				'sf.gov/find-complaints-and-inspection-records / karl-related / Healthy Housing and Vector Control',
				'sf.gov/find-healthy-housing-inspector-by-neighborhood / karl-related / Healthy Housing and Vector Control',
				'sf.gov/information--article-11-compliance-for-property-owners / karl-related / Property owner responsibilities',
				'sf.gov/information/integrated-pest-management-for-property-owners-and-managers / karl-related / Property owner responsibilities',
				'sf.gov/information/learn-what-hhvc-can-inspect / karl-related / Healthy Housing and Vector Control',
				'sf.gov/integrated-pest-management-education / karl-related / Healthy Housing and Vector Control',
				'sf.gov/mosquito-education-workshop / karl-related / Healthy Housing and Vector Control',
				'sf.gov/pay-your-annual-healthy-housing-fee-apartment-buildings / karl-related / Property owner responsibilities',
				// Surfaced 2026-11-26, not introduced: these Related sections were
				// unclassified until their karl notes named the Related panel, so the
				// check never reached them. Karl's Related cannot hold a Report or a
				// Step by step page; each needs a content decision.
				'sf.gov/information/who-to-call-about-a-housing-problem / karl-related / Health Code Article 11 in plain language',
				'sf.gov/information/who-to-call-about-a-housing-problem / karl-related / Report a pest problem, start to finish',
				'sf.gov/question-notice-of-violation / karl-related / Health Code Article 11 in plain language'
			].sort()
		);
	});
});

describe('karlComponentFindings', () => {
	it('reports nothing for a page with no Related section', () => {
		expect(karlComponentFindings({ type: 'Campaign', sections: [{ heading: 'Hi' }] })).toEqual([]);
		expect(karlComponentFindings({})).toEqual([]);
	});

	it('flags a Related card linking to a type Karl’s Related cannot hold', () => {
		const [finding] = karlComponentFindings({
			type: 'Transaction',
			sections: [{ component: 'related', cards: [{ title: 'Owners', target: 'ownerHub' }] }]
		});
		expect(finding.id).toBe('karl-related');
		expect(finding.status).toBe('issue');
		expect(finding.items[0].detail).toMatch(/not Resource Collection pages/);
	});

	it('judges a Related section the placements put in Related, without a component tag', () => {
		const page = pages.find(
			(p) => p.slug === 'sf.gov/pay-your-annual-healthy-housing-fee-apartment-buildings'
		)!;
		const finding = karlComponentFindings(page).find((f) => f.id === 'karl-related');
		expect(finding?.status).toBe('issue');
		expect(finding?.items.map((i) => i.text)).toContain('Property owner responsibilities');
		expect(finding?.items[0].detail).toMatch(/not Resource Collection pages/);
	});

	it('skips a card whose target is not in the corpus', () => {
		expect(
			karlComponentFindings({
				type: 'Transaction',
				sections: [{ component: 'related', cards: [{ title: 'Elsewhere', target: 'noSuchKey' }] }]
			})
		).toEqual([]);
	});

	it('passes a Related card linking to a type Karl’s Related can hold', () => {
		const [finding] = karlComponentFindings({
			type: 'Transaction',
			sections: [{ component: 'related', cards: [{ title: 'After', target: 'afterReport' }] }]
		});
		expect(finding.status).toBe('pass');
	});

	it('no longer judges components the placements cover', () => {
		expect(
			karlComponentFindings({
				type: 'Campaign',
				sections: [
					{ heading: 'x', callout: { text: 'Note' }, component: 'spotlight', button: 'Go' }
				]
			})
		).toEqual([]);
	});

	it('is wired into analyzePage', () => {
		const page = pages.find((p) => p.slug === 'sf.gov/integrated-pest-management-education')!;
		const analysis = analyzePage({ page: page as never });
		expect(analysis.componentFindings.map((f) => f.id)).toEqual(['karl-related']);
	});
});
