import { describe, expect, it } from 'vitest';
import { pagesByKey } from '$lib/data/index';
import { outlineSummary, placementsFor, plainReason, worstOf } from './placement';
import type { ReviewRecord } from './reviewRecord';
import { toStorePage } from '$lib/stores/pageData.svelte';

const page = (key: string) =>
	(pagesByKey as Record<string, Parameters<typeof placementsFor>[0]>)[key];
const of = (key: string, record: ReviewRecord | null = null) =>
	placementsFor(page(key), record, pagesByKey);
const record = (over: Partial<ReviewRecord>): ReviewRecord => ({
	section_edits: {},
	decision: 'Needs review',
	...over
});
const statusOf = (p: ReturnType<typeof of>, id: string) => p.fields.get(id)?.status;

describe('status precedence', () => {
	it('shows the worst: Unplaced > Needs a fix > Unconfirmed > Placed', () => {
		expect(worstOf(['placed', 'unconfirmed', 'needs-fix'])).toBe('needs-fix');
		expect(worstOf(['unconfirmed', 'unplaced'])).toBe('unplaced');
		expect(worstOf(['placed'])).toBe('placed');
		expect(worstOf([])).toBe('placed');
	});
});

describe('rats report (Transaction pilot)', () => {
	const p = of('rodentsReport');

	it('labels a field with its panel, section and sub-field', () => {
		expect(p.fields.get('sections.what-to-do.steps.1.title')?.label).toBe(
			'What to Do · Section 2 · Section title'
		);
		expect(p.fields.get('sections.what-to-do.steps.0.button')?.label).toBe(
			'What to Do · Section 1 · Button link'
		);
		expect(p.fields.get('whatToKnow.thingsToKnow.1.label')?.label).toBe(
			'Things to Know · Block 2 · Title'
		);
		expect(p.fields.get('sections.how-your-report-is-processed.heading')?.label).toBe(
			'Custom Section 2 · Title'
		);
	});

	it('places the agency the page names (U6, narrowed)', () => {
		expect(p.fields.get('primaryAgency')).toMatchObject({
			rawName: 'primary_agency',
			status: 'placed'
		});
	});

	it('reports the section-level button and the audience list as unplaced', () => {
		expect(statusOf(p, 'sections.how-your-report-is-processed.button')).toBe('unplaced');
		for (let i = 0; i < 4; i++) expect(statusOf(p, `audience.${i}`)).toBe('unplaced');
	});

	it('gives the audience list one finding, not one per line', () => {
		const withReason = [0, 1, 2, 3].filter((i) => p.fields.get(`audience.${i}`)!.reasons.length);
		expect(withReason).toEqual([0]);
		expect(p.unplaced.map((u) => u.subject)).toEqual([
			'The “Who this is for” list',
			'“How your report is processed” — its button'
		]);
	});

	it('calls the inferred Custom Section mapping unconfirmed, not settled', () => {
		expect(p.sections.get('get-help-making-your-report')?.status).toBe('unconfirmed');
		expect(statusOf(p, 'sections.get-help-making-your-report.paragraphs.0')).toBe('unconfirmed');
	});

	it('places the rest', () => {
		for (const id of [
			'title',
			'summary',
			'whatToKnow.cost',
			'sections.what-to-do.heading',
			'sections.what-to-do.steps.2.callout.text',
			'sections.while-you-wait-tips-to-help-with-the-problem.heading',
			'sections.related-pages.cards.0.title'
		])
			expect(statusOf(p, id), id).toBe('placed');
	});

	it('lists the empty panels the Blueprint draws as placeholders', () => {
		const empty = p.panels.filter((x) => !x.filled && !x.inert).map((x) => x.rawName);
		expect(empty).toEqual(['special_cases', 'good_for_community', 'get_help', 'topics']);
		expect(p.panels.find((x) => x.rawName === 'redirect_url')?.inert).toBe(true);
	});

	it('has a confirmed URL pattern', () => {
		expect(p.url?.status).toBe('placed');
	});
});

describe('what happens after you report (Information pilot)', () => {
	const p = of('afterReport');

	it('reports the steps section as unplaced (U3), heading included', () => {
		const s = p.sections.get('how-a-report-moves-through-the-city');
		expect(s?.status).toBe('unplaced');
		expect(s?.reasons[0]).toBe('Steps on an Information page.');
		expect(statusOf(p, 'sections.how-a-report-moves-through-the-city.heading')).toBe('unplaced');
		const tray = p.unplaced.find((u) => u.subject.includes('How a report moves'));
		expect(tray?.fieldIds[0]).toBe('sections.how-a-report-moves-through-the-city.heading');
	});

	it('places Related, which Information has', () => {
		expect(p.sections.get('related-pages')).toMatchObject({ rawName: 'related', status: 'placed' });
	});

	it('marks the URL unconfirmed: Karl gives two patterns', () => {
		expect(p.url?.status).toBe('unconfirmed');
	});

	it('flags the required Primary agency as empty', () => {
		expect(p.panels.find((x) => x.rawName === 'primary_agency')).toMatchObject({
			required: true,
			filled: false
		});
	});
});

describe('look up building records (Resource Collection pilot)', () => {
	const p = of('recordsHub');

	it('says a Related list here needs a fix: it lands as Resource tiles (decision 5)', () => {
		const s = p.sections.get('related-pages');
		expect(s).toMatchObject({ rawName: 'body', status: 'needs-fix' });
		expect(s?.reasons.join(' ')).toMatch(/no Related panel/);
		expect(statusOf(p, 'sections.related-pages.cards.0.title')).toBe('needs-fix');
	});

	it('places the other sections', () => {
		expect(p.sections.get('building-lookups')?.status).toBe('placed');
		expect(p.sections.get('about-this-collection')?.status).toBe('placed');
	});
});

describe('rules judge the copy on screen (decision 7)', () => {
	it('fails a button an accepted edit pushed past 25 characters', () => {
		const id = 'sections.what-to-do.steps.0.button';
		expect(statusOf(of('rodentsReport'), id)).toBe('placed');
		const edited = of(
			'rodentsReport',
			record({ section_edits: { [id]: 'Report this problem through 311 now' } })
		);
		expect(edited.fields.get(id)).toMatchObject({ status: 'needs-fix' });
		expect(edited.fields.get(id)?.reasons[0]).toMatch(/35 characters/);
	});

	it('fails an edited title of 65 characters: Karl wants fewer than 65', () => {
		const p = of('rodentsReport', record({ edited_title: 'x'.repeat(65) }));
		expect(p.fields.get('title')?.status).toBe('needs-fix');
		expect(
			of('rodentsReport', record({ edited_title: 'x'.repeat(64) })).fields.get('title')?.status
		).toBe('placed');
	});

	it('fails a Description over 110 characters', () => {
		const p = of('afterReport', record({ edited_summary: 'x'.repeat(111) }));
		expect(p.fields.get('summary')?.status).toBe('needs-fix');
	});

	it('fails PLACEHOLDER text, uppercase only', () => {
		const id = 'sections.what-to-do.steps.0.title';
		expect(
			statusOf(of('rodentsReport', record({ section_edits: { [id]: 'PLACEHOLDER step' } })), id)
		).toBe('needs-fix');
		expect(
			statusOf(of('rodentsReport', record({ section_edits: { [id]: 'a placeholder step' } })), id)
		).toBe('placed');
	});
});

describe('section keys', () => {
	it('joins a section with a pinned fieldKey by its key, not its heading', () => {
		const p = of('article11Compliance');
		expect(p.sections.has('what-you-re-required-to-do')).toBe(true);
		expect(p.sections.has('what-you-must-do')).toBe(false);
		expect(p.fields.get('sections.what-you-re-required-to-do.heading')?.rawName).toBe(
			'information_section'
		);
	});

	it('gives every rendered field of every corpus page a status or leaves it out, never a bad label', () => {
		for (const key of Object.keys(pagesByKey)) {
			for (const f of of(key).fields.values()) {
				if (f.status === 'unplaced') expect(f.rawName, `${key} ${f.fieldId}`).toBeNull();
				else expect(f.label, `${key} ${f.fieldId}`).not.toBe('');
			}
		}
	});
});

describe('the page object the app renders', () => {
	// The layout hands over `pageStore.pages[n]`, built by `toStorePage`, which
	// adds `id` and stamps `fieldKey` on every section. Neither is copy, so
	// neither may surface as unplaced.
	it.each(['rodentsReport', 'afterReport', 'recordsHub'])(
		'%s: same placements as the corpus module',
		(key) => {
			const fromCorpus = of(key);
			const fromStore = placementsFor(toStorePage(page(key)) as never, null, pagesByKey);
			expect(fromStore.unplaced).toEqual(fromCorpus.unplaced);
			expect([...fromStore.fields.entries()]).toEqual([...fromCorpus.fields.entries()]);
			expect([...fromStore.sections.keys()]).toEqual([...fromCorpus.sections.keys()]);
		}
	);
});

describe('outline summary', () => {
	it('counts sections and things that will not carry over, not strings', () => {
		expect(outlineSummary(of('rodentsReport'))).toBe(
			'5 sections: 3 go into Karl, 2 unconfirmed. 2 things won’t carry over to Karl.'
		);
		expect(outlineSummary(of('afterReport'))).toBe(
			'5 sections: 5 go into Karl. 2 things won’t carry over to Karl.'
		);
		expect(outlineSummary(of('recordsHub'))).toBe(
			'4 sections: 3 go into Karl, 1 needs a fix. 1 thing won’t carry over to Karl.'
		);
	});
});

describe('what a chip shows', () => {
	it('turns an editor-facing reason into one plain sentence', () => {
		expect(plainReason('U1 — a section-level button outside any step. Transaction’s only…')).toBe(
			'A section-level button outside any step.'
		);
		expect(plainReason('The page carries `audience`, and **Karl** has a home. More.')).toBe(
			'The page carries audience, and Karl has a home.'
		);
	});

	it('chips page-level blocks and own reasons, not every string', () => {
		const p = of('rodentsReport');
		expect(p.fields.get('title')).toMatchObject({ chip: true, label: 'Page title' });
		expect(p.fields.get('summary')).toMatchObject({ chip: true, label: 'Description' });
		expect(p.fields.get('primaryAgency')).toMatchObject({ chip: true, label: 'Primary agency' });
		expect(p.fields.get('audience.0')?.chip).toBe(true);
		expect(p.fields.get('audience.1')?.chip).toBe(false);
		expect(p.fields.get('sections.what-to-do.steps.0.title')?.chip).toBe(false);
	});

	it('chips the What to know box once, as its two panels', () => {
		expect(of('rodentsReport').whatToKnow).toMatchObject({
			label: 'Cost · Things to Know',
			status: 'placed'
		});
		expect(of('recordsHub').whatToKnow).toBeNull();
	});
});
