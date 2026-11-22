import { describe, expect, it } from 'vitest';
import { allPages } from '$lib/data/index';
import { karlComponentFindings } from './karlComponentChecks';
import { analyzePage } from './index';

const pages = allPages as Record<string, unknown>[];

/** `slug / finding id / item detail-prefix` for every issue in the corpus. */
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

describe('Karl component checks on the current corpus', () => {
	// Pinned, so a content edit that fixes or introduces one shows up here.
	it('finds exactly these issues', () => {
		expect(corpusIssues()).toEqual(
			[
				// Callouts: Karl offers them on Transaction, Information, Data story only.
				'sf.gov/integrated-pest-management-education / karl-callout / This is a free City service for eligible tenant groups, resident councils, and …',
				'sf.gov/integrated-pest-management-education / karl-callout / See [Integrated pest management for property owners and managers](ownerGuidance…',
				'sf.gov/mosquito-education-workshop / karl-callout / This is a free City service for eligible schools, summer camps, museums, and sc…',
				'sf.gov/mosquito-education-workshop / karl-callout / HHVC can provide a standards-alignment summary for teachers upon request. Verif…',
				'sf.gov/report/health-code-article-11-plain-language / karl-callout / This is not legal advice. The municipal code controls if this guide and the cod…',
				// Resource tiles on an Information page.
				'sf.gov/information/integrated-pest-management-for-property-owners-and-managers / karl-resources / Primary source: UC IPM guide for property managers',
				// 26 characters; Karl allows 25.
				'sf.gov/rat-free-blocks / karl-spotlightButton / See owner responsibilities',
				// Related cards linking to types Karl's Related section cannot hold.
				'sf.gov/information--article-11-compliance-for-property-owners / karl-related / Property owner responsibilities',
				'sf.gov/information/integrated-pest-management-for-property-owners-and-managers / karl-related / Property owner responsibilities',
				'sf.gov/integrated-pest-management-education / karl-related / Healthy Housing and Vector Control',
				// A Contact section on Information pages, which have no Contact us panel.
				'sf.gov/information--article-11-compliance-for-property-owners / karl-contact / Contact us',
				'sf.gov/information/integrated-pest-management-for-property-owners-and-managers / karl-contact / Contact us'
			].sort()
		);
	});

	it('leaves resource tiles on the Agency page unsettled, not flagged', () => {
		const agency = pages.find((p) => p.type === 'Agency')!;
		const finding = karlComponentFindings(agency).find((f) => f.id === 'karl-resources')!;
		expect(finding.status).toBe('unavailable');
		expect(finding.summary).toContain('does not say');
	});

	it('leaves the Topic spotlight button unsettled, not flagged', () => {
		const topic = pages.find((p) => p.type === 'Topic')!;
		const finding = karlComponentFindings(topic).find((f) => f.id === 'karl-spotlightButton')!;
		expect(finding.status).toBe('unavailable');
	});
});

describe('karlComponentFindings', () => {
	it('reports nothing for a page that uses no components', () => {
		expect(karlComponentFindings({ type: 'Campaign', sections: [{ heading: 'Hi' }] })).toEqual([]);
		expect(karlComponentFindings({})).toEqual([]);
	});

	it('says what Karl allows instead, naming the component and page type', () => {
		const [finding] = karlComponentFindings({
			type: 'Information',
			sections: [{ heading: 'Data', table: { caption: 'Counts' } }]
		});
		expect(finding.status).toBe('issue');
		expect(finding.items[0].detail).toBe(
			'Karl offers tables only on Report pages, not Information pages. Use a bulleted list instead.'
		);
		expect(finding.help.url).toMatch(/components\/tables$/);
	});

	it('judges step callouts and buttons by the page type', () => {
		const step = { title: 'Do it', callout: { text: 'Note' }, button: 'Go' };
		const ok = karlComponentFindings({ type: 'Transaction', sections: [{ steps: [step] }] });
		expect(ok.map((f) => f.status)).toEqual(['pass', 'pass']);
		const bad = karlComponentFindings({ type: 'Campaign', sections: [{ steps: [step] }] });
		expect(bad.map((f) => f.status)).toEqual(['issue', 'issue']);
	});

	it('flags an accordion title over 65 characters', () => {
		const heading = 'x'.repeat(66);
		const [finding] = karlComponentFindings({
			type: 'Transaction',
			sections: [{ heading, component: 'supporting' }]
		});
		expect(finding.items[0].detail).toContain('66 characters; Karl allows 65');
	});

	it('accepts a button at exactly 25 characters', () => {
		const [finding] = karlComponentFindings({
			type: 'Transaction',
			sections: [{ button: 'x'.repeat(25) }]
		});
		expect(finding.status).toBe('pass');
	});

	it('flags more spotlights than the page type allows', () => {
		const spot = { component: 'spotlight', heading: 'S' };
		const [finding] = karlComponentFindings({ type: 'Topic', sections: [spot, spot] });
		expect(finding.status).toBe('issue');
		expect(finding.items[0].detail).toContain('A Topic page allows 1');
	});

	it('is wired into analyzePage', () => {
		const page = pages.find((p) => p.slug === 'sf.gov/rat-free-blocks')!;
		const analysis = analyzePage({ page: page as never });
		expect(analysis.componentFindings.map((f) => f.id)).toContain('karl-spotlightButton');
	});
});
