import { describe, it, expect } from 'vitest';
import { analyzePage } from './index';
import { allPages } from '$lib/data/index';

/**
 * The module contract: "A check with nothing to look at reports `unavailable`,
 * never `pass`." It held for `link-text`, which guards on its label count, and
 * for the four DOM checks -- but `raw-urls` and `paragraph-length` reported a
 * green pass for having scanned nothing, because neither looked at whether
 * there was any body copy at all.
 *
 * Unreachable on today's corpus, where every page carries prose. Not
 * unreachable for a caller: `analyzePage` takes any page-shaped object, and a
 * page of nothing but buttons and links would have been told "No bare URLs in
 * body copy" as though that had been verified.
 */
describe('a check with an empty denominator', () => {
	// Labels and a URL only: nothing this classifies as prose or heading.
	const noBodyCopy = {
		sections: [
			{
				fieldKey: 'only-a-button',
				button: 'Report through 311',
				buttonUrl: 'https://sf.gov/report'
			}
		]
	};

	const findingFor = (page: object, id: string) =>
		analyzePage({ page: page as never }).findings.find((f) => f.id === id)!;

	it('reports no data for bare URLs when there is no body copy', () => {
		const finding = findingFor(noBodyCopy, 'raw-urls');
		expect(finding.status).toBe('unavailable');
		expect(finding.summary).toContain('no body copy');
	});

	it('reports no data for paragraph length when there are no paragraphs', () => {
		const finding = findingFor(noBodyCopy, 'paragraph-length');
		expect(finding.status).toBe('unavailable');
		expect(finding.summary).toContain('no paragraphs');
	});

	it('still reports no data for link text when there are no labels', () => {
		const finding = findingFor({ summary: 'Just a sentence of copy.' }, 'link-text');
		expect(finding.status).toBe('unavailable');
	});

	it('never reports pass with a zero denominator, on any check', () => {
		// The general form of the bug, asserted across every check at once.
		const empty = analyzePage({ page: {} as never });
		expect(empty.findings.length).toBeGreaterThan(0);
		for (const finding of empty.findings) {
			expect(finding.status, `${finding.id} passed with nothing to scan`).not.toBe('pass');
		}
	});

	it('states the denominator it scanned when it does pass', () => {
		// A pass a reviewer cannot check is not much better than an unearned one.
		const page = (allPages as Record<string, unknown>[]).find((p) =>
			String(p.slug).includes('report-rats-mice-four-legged-problems')
		)!;
		const analysis = analyzePage({ page: page as never });
		for (const finding of analysis.findings.filter((f) => f.status === 'pass')) {
			expect(finding.summary, `${finding.id}: "${finding.summary}"`).toMatch(/\d/);
		}
	});
});
