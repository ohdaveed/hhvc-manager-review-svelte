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

	// The transcript makes the audience list the FIRST Information section
	// block, so every authored section sits one slot lower in Karl than its
	// position among the mockup's sections. The outline has to count the same way.
	it('places the audience list as Information section 1 and numbers the rest after it', () => {
		expect(p.fields.get('audience.0')).toMatchObject({
			rawName: 'information_section',
			label: 'Information section 1 · Text',
			status: 'placed'
		});
		expect(p.fields.get('sections.how-to-follow-up-on-your-report.heading')?.label).toBe(
			'Information section 2 · Title'
		);
		expect(p.sections.get('what-this-page-does-not-promise')?.label).toBe('Information section 5');
		expect(p.unplaced.map((u) => u.subject)).not.toContain('The “Who this is for” list');
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
			'5 sections: 5 go into Karl. 1 thing won’t carry over to Karl.'
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

describe('Blueprint slot reasons', () => {
	it('says which section makes a repeatable panel need a fix, and why', () => {
		const body = of('recordsHub').panels.find((x) => x.rawName === 'body');
		expect(body?.status).toBe('needs-fix');
		expect(body?.reasons).toEqual([
			'“Related pages”: This page type has no Related panel, so these links go into Body instead.'
		]);
		expect(of('recordsHub').panels.find((x) => x.rawName === 'title')?.reasons).toEqual([]);
	});
});

describe('Step by step', () => {
	const p = of('stepPestReport');

	it('labels steps in Step by step’s own fields', () => {
		expect(p.fields.get('sections.what-to-do.steps.1.title')?.label).toBe('Steps · Step 2 · Title');
		expect(p.fields.get('sections.what-to-do.steps.0.text.0')?.label).toBe(
			'Steps · Step 1 · Step description'
		);
	});

	it('notes six steps against Karl’s aim of five, without calling it a fix', () => {
		const s = p.sections.get('what-to-do');
		expect(s?.status).toBe('placed');
		expect(s?.reasons).toEqual(['This page has 6 steps; Karl suggests aiming for no more than 5.']);
	});

	it('reports a step with no title as needing a fix', () => {
		const id = 'sections.what-to-do.steps.2.title';
		const q = of('stepPestReport', record({ section_edits: { [id]: '  ' } }));
		expect(q.sections.get('what-to-do')?.status).toBe('needs-fix');
		expect(q.sections.get('what-to-do')?.reasons).toContain(
			'Step 3 has no title; Karl requires one on every step.'
		);
	});

	it('reports Related pages as unplaced: Step by step has no Related panel', () => {
		for (const key of ['stepPestReport', 'stepCorrectViolation', 'stepPrepUnit'])
			expect(of(key).sections.get('related-pages')?.status, key).toBe('unplaced');
	});

	it('shows the Topics caveat on the Blueprint slot, and an unconfirmed URL', () => {
		expect(p.panels.find((x) => x.rawName === 'topics')?.caveats).toEqual([
			'Karl’s own pages disagree on whether this page then shows up on that Topic page automatically.'
		]);
		expect(p.url?.status).toBe('unconfirmed');
	});

	it('summarises the page', () => {
		expect(outlineSummary(p)).toBe(
			'2 sections: 1 goes into Karl, 1 unconfirmed. 2 things won’t carry over to Karl.'
		);
	});
});

describe('Topic', () => {
	const p = of('healthyHousingTopic');

	it('names the stream and the block, never the stream alone', () => {
		expect([...p.sections.values()].map((s) => s.label)).toEqual([
			'Child topics · Spotlight block',
			'Child topics · Services block 1',
			'Child topics · Services block 2',
			'Child topics · Resources block',
			''
		]);
	});

	it('doubts the spotlight button: Karl’s pages disagree on it', () => {
		const button = p.fields.get('sections.report-a-housing-health-issue.button');
		expect(button?.status).toBe('unconfirmed');
		expect(button?.reasons).toEqual([
			'Karl’s own pages disagree on whether a Topic page’s spotlight can have a button.'
		]);
		expect(p.sections.get('report-a-housing-health-issue')?.status).toBe('placed');
	});

	it('needs a fix when a second spotlight appears', () => {
		const page = pagesByKey.healthyHousingTopic as unknown as {
			sections: { component?: string }[];
		};
		const twice = {
			...page,
			sections: page.sections.map((s, i) => (i === 1 ? { ...s, component: 'spotlight' } : s))
		};
		const q = placementsFor(twice as never, null, pagesByKey);
		expect(q.sections.get('report-a-housing-health-issue')?.status).toBe('needs-fix');
		expect(q.sections.get('report-a-housing-health-issue')?.reasons).toContain(
			'This page has 2 spotlight blocks; Karl allows 1 on a Topic page.'
		);
	});

	it('keeps Related unplaced (U5) and the URL unconfirmed', () => {
		expect(p.sections.get('related')?.status).toBe('unplaced');
		expect(p.url?.status).toBe('unconfirmed');
	});

	it('says, before anything else, that only Digital Services can create it', () => {
		expect(p.pageCaveats).toEqual([
			'Only SF.gov Digital Services can create a new Topic page. HHVC can draft this one, but not publish it.'
		]);
		expect(of('rodentsReport').pageCaveats).toEqual([]);
	});

	it('shows both stream caveats on the Blueprint slot', () => {
		expect(p.panels.find((x) => x.rawName === 'content_fields')?.caveats).toHaveLength(2);
	});
});

describe('Campaign', () => {
	it('says a callout needs a fix: Karl has no callout on a Campaign page', () => {
		const f = of('mosquitoWorkshop').fields.get(
			'sections.bring-mosquito-science-to-your-students.callout.text'
		);
		expect(f?.status).toBe('needs-fix');
		expect(f?.reasons).toEqual([
			'Karl has no callout on a Campaign page. Put this text in the section’s body copy instead.'
		]);
	});

	it('keeps callouts placed where Karl offers them', () => {
		expect(of('rodentsReport').fields.get('sections.what-to-do.steps.0.callout.text')?.status).toBe(
			'placed'
		);
	});

	it('fails a spotlight button over 25 characters', () => {
		const p = of('ratFreeBlocks');
		expect(p.fields.get('sections.for-owners-and-managers.button')?.reasons).toEqual([
			'Button text is 26 characters; Karl wants 25 or fewer.'
		]);
		expect(p.fields.get('sections.take-away-what-rats-live-on.button')?.status).toBe('placed');
	});

	it('places the About section and partner agencies, and flags the About placeholder', () => {
		const p = of('ratFreeBlocks');
		expect(p.sections.get('about-this-campaign')).toMatchObject({
			rawName: 'about_campaign',
			status: 'placed'
		});
		expect(p.sections.get('related-pages')).toMatchObject({
			rawName: 'related_links',
			status: 'placed'
		});
		expect(p.fields.get('partnerAgencies.0.title')?.rawName).toBe('partner_agencies');
		expect(p.fields.get('sections.about-this-campaign.paragraphs.0')?.reasons).toEqual([
			'Still holds PLACEHOLDER text.'
		]);
	});

	it('keeps “Start with your own block” unplaced, listed once', () => {
		const p = of('ratFreeBlocks');
		expect(p.sections.get('start-with-your-own-block')?.status).toBe('unplaced');
		expect(p.unplaced.map((u) => u.subject)).toEqual([
			'The summary under the title',
			'The “Who this is for” list',
			'“Start with your own block”'
		]);
	});

	it('marks Contact us unconfirmed with one chip', () => {
		const p = of('ipmEducation');
		const contact = [...p.fields.values()].filter((f) => f.fieldId.startsWith('contact.'));
		expect(contact.length).toBeGreaterThan(0);
		expect(contact.every((f) => f.status === 'unconfirmed')).toBe(true);
		expect(contact.filter((f) => f.chip)).toHaveLength(1);
	});

	it('counts findings inside placed sections in the summary', () => {
		expect(outlineSummary(of('mosquitoWorkshop'))).toBe(
			'7 sections: 7 go into Karl. 2 details need a fix. 2 things won’t carry over to Karl.'
		);
		expect(outlineSummary(of('ipmEducation'))).toBe(
			'7 sections: 7 go into Karl. 2 details need a fix, 1 detail is unconfirmed. 2 things won’t carry over to Karl.'
		);
		expect(outlineSummary(of('ratFreeBlocks'))).toBe(
			'5 sections: 5 go into Karl. 2 details need a fix. 3 things won’t carry over to Karl.'
		);
	});
});

describe('Report', () => {
	const guide = of('article11Guide');
	const annual = of('inspectionsAnnual');

	it('names Report’s Content blocks: Body and Table', () => {
		expect(guide.fields.get('sections.article-11-sections-at-a-glance.table.1.0')?.label).toBe(
			'Content 2 · Table'
		);
		expect(annual.fields.get('sections.about-these-figures.heading')?.label).toBe(
			'Content 1 · Body · Heading'
		);
	});

	it('tells a manager that table text is not machine translated, as a confirmed note', () => {
		const content = guide.panels.find((x) => x.rawName === 'content');
		expect(content?.notes).toEqual([
			'Text in tables is not machine translated into SF.gov’s other languages.'
		]);
		expect(content?.caveats).toEqual([]);
	});

	it('advises when a table is wider than 3 columns, without calling it a fix', () => {
		const page = pagesByKey.inspectionsAnnual as unknown as { sections: { table?: string[][] }[] };
		const wide = {
			...page,
			sections: page.sections.map((s) =>
				s.table ? { ...s, table: s.table.map((row) => [...row, 'x']) } : s
			)
		};
		const q = placementsFor(wide as never, null, pagesByKey);
		const s = q.sections.get('inspections-by-outcome');
		expect(s?.status).toBe('placed');
		expect(s?.reasons).toEqual([
			'This table has 4 columns; Karl says tables work best with 3 or fewer.'
		]);
	});

	it('keeps the callout, the absorbed Related list and the PLACEHOLDER cells as fixes', () => {
		expect(guide.fields.get('sections.how-to-use-this-guide.callout.text')?.reasons[0]).toMatch(
			/^Karl has no callout on a Report page/
		);
		expect(annual.sections.get('related-pages')?.status).toBe('needs-fix');
		expect(outlineSummary(annual)).toBe(
			'6 sections: 5 go into Karl, 1 needs a fix. 18 details need a fix. 2 things won’t carry over to Karl.'
		);
	});

	it('has no Related panel and an unconfirmed URL', () => {
		expect(guide.url?.status).toBe('unconfirmed');
		expect(guide.panels.map((x) => x.rawName)).not.toContain('related');
	});
});

describe('Agency', () => {
	const p = of('pestsTopic');

	it('tells the two Subsection panels apart by the section they sit under', () => {
		expect(p.sections.get('get-help-with-pests-mold-or-trash')?.label).toBe(
			'Services · Subsection'
		);
		expect(p.sections.get('if-you-rent')?.label).toBe('Resources · Subsection 1');
		expect(p.fields.get('sections.look-up-records-and-rules.heading')?.label).toBe(
			'Resources · Subsection 3 · Title'
		);
		expect(p.panels.filter((x) => x.label.endsWith('Subsection')).map((x) => x.label)).toEqual([
			'Services · Subsection',
			'Resources · Subsection'
		]);
	});

	it('reports the Subsection intro paragraphs as unplaced (U20), not placed', () => {
		const f = p.fields.get('sections.if-you-rent.paragraphs.0');
		expect(f?.status).toBe('unplaced');
		expect(f?.reasons[0]).toMatch(/Title and a links list/);
		expect(p.sections.get('if-you-rent')?.status).toBe('placed');
		expect(p.unplaced.map((u) => u.subject)).toEqual([
			'The “Who this is for” list',
			'“Get help with pests, mold, or trash”',
			'“If you rent”',
			'“If you own or manage a building”',
			'“Other City housing services”'
		]);
	});

	it('keeps Section title 1 and 2 at their pre-filled values', () => {
		const titles = p.panels.filter((x) => /^Section title [12]$/.test(x.label));
		expect(titles.map((x) => x.values.map((v) => v.value))).toEqual([['Services'], ['Resources']]);
	});

	it('flags the required, empty Public records panel', () => {
		expect(p.panels.find((x) => x.rawName === 'public_records')).toMatchObject({
			required: true,
			filled: false
		});
	});

	it('doubts resource tiles on Agency, and the URL', () => {
		expect(p.panels.find((x) => x.rawName === 'resources')?.caveats).toHaveLength(1);
		expect(p.url?.status).toBe('unconfirmed');
	});
});

describe('Location', () => {
	const p = of('ehOffice');

	it('labels fields with the groups Karl’s guide puts them in', () => {
		expect(p.sections.get('who-this-information-is-for')?.label).toBe('Getting here · Intro');
		expect(p.sections.get('before-you-come-in')?.label).toBe('Essential information · Body 1');
		expect(p.panels.map((x) => x.label)).toContain('Essential information · Image');
	});

	it('questions an audience section in Getting here, which Karl describes as transport text', () => {
		const s = p.sections.get('who-this-information-is-for');
		expect(s?.status).toBe('unconfirmed');
		expect(s?.reasons).toContain(
			'Karl puts Intro under “Getting here”, which is for transportation and getting to the location; check this text belongs there.'
		);
	});

	it('says why the Related list lands in Body: Related locations takes Location pages only', () => {
		const s = p.sections.get('related-pages');
		expect(s?.status).toBe('needs-fix');
		expect(s?.reasons.join(' ')).toMatch(/only related field takes Location pages/);
	});

	it('flags the placeholder address and hours', () => {
		expect(p.fields.get('sections.address-and-hours.bullets.0')?.reasons).toEqual([
			'Still holds PLACEHOLDER text.'
		]);
	});

	it('says, before anything else, where address and hours really come from, and what was never captured', () => {
		expect(p.pageCaveats).toHaveLength(2);
		expect(p.pageCaveats[0]).toMatch(
			/^A Location’s address and opening hours come from its Address snippet/
		);
		expect(p.pageCaveats[1]).toMatch(
			/Parking, Accessibility, Public transportation, Accordions and Additional location info/
		);
	});

	it('keeps Contact us placed (Karl lists it for Location) and the URL unconfirmed', () => {
		const contact = [...p.fields.values()].filter((f) => f.fieldId.startsWith('contact.'));
		expect(contact.length).toBeGreaterThan(0);
		expect(contact.every((f) => f.status === 'placed')).toBe(true);
		expect(p.url?.status).toBe('unconfirmed');
	});
});

describe('About us', () => {
	const p = of('aboutHhvcTeam');

	it('places the Information and Resources sections', () => {
		expect([...p.sections.values()].map((s) => [s.label, s.status])).toEqual([
			['Information 1', 'placed'],
			['Information 2', 'placed'],
			['Information 3', 'placed'],
			['Resources', 'placed']
		]);
	});

	it('says how readers reach it: Karl links it from the Agency page', () => {
		expect(p.pageCaveats).toEqual([
			'Karl adds a button to this department’s Agency page that links here automatically, once this page is tagged with that Agency.'
		]);
	});

	it('notes that About pages take no images, as Good to know', () => {
		const info = p.panels.find((x) => x.rawName === 'about_info');
		expect(info?.notes).toEqual([
			'About pages don’t take images. Put an organization chart on a separate Information page and link to it.'
		]);
		expect(info?.caveats).toEqual([]);
	});

	it('keeps the summary unplaced (no Description, U21) and the URL unconfirmed', () => {
		expect(p.unplaced.map((u) => u.subject)).toContain('The summary under the title');
		expect(p.url?.status).toBe('unconfirmed');
		expect(outlineSummary(p)).toBe(
			'4 sections: 4 go into Karl. 2 things won’t carry over to Karl.'
		);
	});
});
