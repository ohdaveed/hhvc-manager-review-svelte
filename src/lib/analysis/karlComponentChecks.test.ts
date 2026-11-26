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
		// None since 2026-11-26: every Related card to a page type outside
		// Transaction, Information, Campaign and Topic moved into the page body.
		// The issue path is covered by the fixtures below.
		expect(corpusIssues()).toEqual([].sort());
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
		// payFee's own Related section, as it stood before its Resource
		// Collection card moved into the body (2026-11-26).
		const page = {
			type: 'Transaction',
			sections: [
				{
					heading: 'Related pages',
					karl: 'Maps to the related panel: repeatable "Page" chooser entries.',
					kind: 'placement',
					cards: [{ title: 'Property owner responsibilities', target: 'ownerHub' }]
				}
			]
		};
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
		// The IPM workshop with the Agency-page Related card it carried until
		// 2026-11-26, when that link moved into the page body.
		const ipm = pages.find((p) => p.slug === 'sf.gov/integrated-pest-management-education')! as {
			sections: { component?: string; cards?: unknown[] }[];
		};
		const page = {
			...ipm,
			sections: ipm.sections.map((s) =>
				s.component === 'related'
					? {
							...s,
							cards: [
								...(s.cards ?? []),
								{ title: 'Healthy Housing and Vector Control', target: 'pestsTopic' }
							]
						}
					: s
			)
		};
		const analysis = analyzePage({ page: page as never });
		expect(analysis.componentFindings.map((f) => f.id)).toEqual(['karl-related']);
	});
});
