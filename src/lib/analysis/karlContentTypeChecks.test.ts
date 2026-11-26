import { describe, expect, it } from 'vitest';
import { allPages, pagesByKey } from '$lib/data/index';
import { CONTENT_TYPE_RULES, STEP_LIMIT } from '$lib/karl/contentTypeRules';
import { karlContentTypeFindings } from './karlContentTypeChecks';
import { analyzePage } from './index';

const pages = allPages as Record<string, unknown>[];

/** `slug / finding id / item text` for every issue in the corpus. */
function corpusIssues(): string[] {
	const out: string[] = [];
	for (const page of pages) {
		for (const f of karlContentTypeFindings(page)) {
			if (f.status !== 'issue') continue;
			for (const item of f.items) out.push(`${page.slug} / ${f.id} / ${item.text}`);
		}
	}
	return out.sort();
}

const steps = (n: number, title = 'Do the thing') =>
	Array.from({ length: n }, (_, i) => ({ title: title === '' ? '' : `${title} ${i + 1}` }));

const stepPage = (n: number, title?: string) => ({
	type: 'Step by step',
	sections: [{ heading: 'What to do', steps: steps(n, title) }]
});

const byId = (page: Record<string, unknown>, id: string) =>
	karlContentTypeFindings(page).find((f) => f.id === id);

describe('Karl content-type checks on the current corpus', () => {
	// Pinned, so a content edit that fixes or introduces one shows up here.
	it('finds exactly these issues', () => {
		expect(corpusIssues()).toEqual(
			[
				// Over Karl's recommended 5 steps (all within the 15 limit).
				'sf.gov/step-by-step/correct-a-violation-and-close-your-case / karl-step-count / 7 steps',
				'sf.gov/step-by-step/prepare-your-unit-for-pest-treatment / karl-step-count / 6 steps',
				'sf.gov/step-by-step/report-a-pest-problem / karl-step-count / 6 steps',
				// afterReport's "How a report moves through the City" left this list on
				// 2026-11-26: its steps became one Title and text block, which suits a
				// sequence of what the City does rather than tasks for the reader.
				// Five "1." … "5." headings on an Information page.
				'sf.gov/information/integrated-pest-management-for-property-owners-and-managers / karl-information-actionable / 5 numbered section headings'
				// No What to do findings remain: C2 moved the lookup and records pages
				// into What to do, and C1 removed or retyped the pages with custom
				// headings there.
			].sort()
		);
	});

	it('passes a Transaction whose steps are placed in What to do under that heading', () => {
		const rats = pages.find((p) => p.slug === 'sf.gov/report-rats-or-mice')!;
		expect(byId(rats, 'karl-transaction-what-to-do')?.status).toBe('pass');
	});
});

describe('Step by step', () => {
	it('passes at or under the recommended 5', () => {
		expect(byId(stepPage(5), 'karl-step-count')?.status).toBe('pass');
	});

	it('flags over 5 as a recommendation, not the limit', () => {
		const f = byId(stepPage(6), 'karl-step-count');
		expect(f?.status).toBe('issue');
		expect(f?.summary).toMatch(/recommends no more than 5/);
	});

	it('flags over 15 as Karl’s hard limit', () => {
		const f = byId(stepPage(STEP_LIMIT + 1), 'karl-step-count');
		expect(f?.status).toBe('issue');
		expect(f?.summary).toMatch(/Karl allows 15/);
	});

	it('counts steps across every section', () => {
		const page = {
			type: 'Step by step',
			sections: [
				{ heading: 'A', steps: steps(3) },
				{ heading: 'B', steps: steps(3) }
			]
		};
		expect(byId(page, 'karl-step-count')?.summary).toMatch(/^6 steps/);
	});

	it('reports unavailable, not pass, with no steps', () => {
		const findings = karlContentTypeFindings({ type: 'Step by step', sections: [] });
		expect(findings.map((f) => [f.id, f.status])).toEqual([['karl-step-count', 'unavailable']]);
	});

	it('flags untitled steps', () => {
		const f = byId(stepPage(2, ''), 'karl-step-titles');
		expect(f?.status).toBe('issue');
		expect(f?.items.map((i) => i.text)).toEqual(['Step 1', 'Step 2']);
	});
});

describe('Transaction', () => {
	it('does not accept a note that only mentions what_to_do: the section must be placed there', () => {
		const page = {
			type: 'Transaction',
			sections: [{ heading: 'Document your work', karl: 'what_to_do. Each step is one Section.' }]
		};
		const finding = byId(page, 'karl-transaction-what-to-do');
		expect(finding?.status).toBe('issue');
		expect(finding?.items[0].text).toBe('No What to do section');
	});

	it('flags steps placed in What to do under a heading Karl will not show', () => {
		const page = {
			type: 'Transaction',
			sections: [{ heading: 'Document your work', steps: [{ title: 'Take photos' }] }]
		};
		const finding = byId(page, 'karl-transaction-what-to-do');
		expect(finding?.status).toBe('issue');
		expect(finding?.items[0]).toMatchObject({ text: 'Document your work' });
	});

	it('flags a Transaction with no What to do', () => {
		const page = {
			type: 'Transaction',
			sections: [{ heading: 'About this', karl: 'things_to_know' }]
		};
		expect(byId(page, 'karl-transaction-what-to-do')?.status).toBe('issue');
	});
});

describe('Information', () => {
	it('passes plain title-and-text sections', () => {
		const page = { type: 'Information', sections: [{ heading: 'What it is', paragraphs: ['…'] }] };
		expect(byId(page, 'karl-information-actionable')?.status).toBe('pass');
	});

	it('ignores a single numbered heading', () => {
		const page = {
			type: 'Information',
			sections: [{ heading: '311 and you' }, { heading: '1. Only one' }]
		};
		expect(byId(page, 'karl-information-actionable')?.status).toBe('pass');
	});

	it('cites Karl’s non-actionable rule', () => {
		const f = byId({ type: 'Information', sections: [] }, 'karl-information-actionable');
		expect(f?.help.url).toBe(CONTENT_TYPE_RULES.informationNotActionable.url);
	});
});

it('is silent on types it has no rules for', () => {
	expect(karlContentTypeFindings({ type: 'Campaign', sections: [{ steps: steps(20) }] })).toEqual(
		[]
	);
});

it('reaches the analysis panel through analyzePage', () => {
	const page = pages.find((p) => p.slug === 'sf.gov/step-by-step/report-a-pest-problem');
	const analysis = analyzePage({ page: page as never });
	expect(analysis.contentTypeFindings.map((f) => f.id)).toEqual([
		'karl-step-count',
		'karl-step-titles'
	]);
});

describe('a Transaction gives the reader a way to act', () => {
	const actionOf = (p: object) =>
		karlContentTypeFindings(p as never).find((f) => f.id === 'karl-transaction-action');
	const tx = (extra: object) => ({
		type: 'Transaction',
		sections: [{ heading: 'What to do', steps: [{ title: 'Do it', text: ['Do the thing.'] }] }],
		...extra
	});

	it('flags a Transaction with no button and no Contact us', () => {
		const f = actionOf((pagesByKey as Record<string, object>).payCitation);
		expect(f?.status).toBe('issue');
		expect(f?.summary).toBe(
			'A Transaction should let people act: add a button in What to do, or a Contact us block.'
		);
	});

	it('passes a Transaction with a button', () => {
		expect(actionOf((pagesByKey as Record<string, object>).garbageReport)?.status).toBe('pass');
	});

	it('passes a Transaction whose only action is Contact us', () => {
		expect(actionOf(tx({ contact: { phone: ['311'] } }))?.status).toBe('pass');
	});

	it('gives a non-Transaction page no such finding', () => {
		expect(actionOf({ ...tx({}), type: 'Information' })).toBeUndefined();
	});

	it('flags exactly these Transaction pages on the current corpus', () => {
		const flagged = Object.entries(pagesByKey as Record<string, { type: string }>)
			.filter(([, p]) => p.type === 'Transaction' && actionOf(p)?.status === 'issue')
			.map(([k]) => k)
			.sort();
		expect(flagged).toEqual(
			[
				// appealNotice passes since C10 gave it a Contact us block; C1 removed
				// or retyped the other four. The citation page waits on its payment link (C3).
				'payCitation'
			].sort()
		);
	});
});
