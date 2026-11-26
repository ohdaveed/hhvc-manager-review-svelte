/**
 * Corpus pages with the Karl gaps they carried before the 2026-11-26
 * unmapped-content audit, for tests of how gaps are reported.
 *
 * That audit gave every piece of mockup copy a Karl destination or removed it,
 * so the real corpus no longer exercises the "unplaced" path: no audience list,
 * no section-level button on a Transaction, no steps on an Information page, no
 * Related section on a Step by step or Topic page. The path still matters,
 * since a drafted page or a new module can bring any of those back, so the tests
 * that pinned it run against these overlays instead.
 *
 * Each overlay is the CURRENT page with only the removed gap added back, so
 * everything else the tests read stays in step with the corpus. The copy is the
 * pre-audit wording, taken from the page modules at c0427d2.
 */
import { pagesByKey } from '$lib/data/index';

type Section = Record<string, unknown> & { heading?: string };
type Page = Record<string, unknown> & { sections: Section[] };

const base = (key: keyof typeof pagesByKey) => pagesByKey[key] as unknown as Page;

const without = (s: Section, ...keys: string[]): Section =>
	Object.fromEntries(Object.entries(s).filter(([k]) => !keys.includes(k)));

const withSection = (page: Page, heading: string, edit: (s: Section) => Section): Page => {
	let hit = false;
	const sections = page.sections.map((s) => {
		if (s.heading !== heading) return s;
		hit = true;
		return edit(s);
	});
	if (!hit) throw new Error(`gapFixtures: no section headed "${heading}" on ${String(page.slug)}`);
	return { ...page, sections };
};

const VIEW_ARTICLE_11 =
	'https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_health/0-0-0-1890';

/** U1 (section button outside a step) and the audience list. */
const rodentsReport: Page = withSection(
	{
		...base('rodentsReport'),
		audience: [
			'A tenant affected by rats or mice',
			'A friend, family member, advocate, or helper reporting for a tenant',
			'A person reporting a problem in a shared area',
			'An employee reporting a rodent problem at work'
		]
	},
	'What the Health Code requires',
	(s) => ({
		...s,
		bullets: (s.bullets as unknown[]).slice(0, 1),
		button: 'View Article 11',
		buttonUrl: VIEW_ARTICLE_11,
		buttonStyle: 'secondary'
	})
);

/** U3: steps on an Information page. */
const afterReport: Page = withSection(
	base('afterReport'),
	'How a report moves through the City',
	(s) => ({
		...without(s, 'bullets'),
		steps: [
			{
				title: 'You report through 311',
				text: ['311 receives the report and sends it to the right City department when possible.']
			},
			{
				title: 'An inspector may contact you',
				text: [
					'If you gave contact information, an inspector may contact you to ask questions or schedule a visit.'
				]
			}
		]
	})
);

const related = (cards: { title: string; target: string }[]): Section => ({
	heading: 'Related pages',
	karl: 'Maps to Related. Each card publishes the destination page’s own title.',
	kind: 'body',
	cards
});

/** Step by step has no Related panel. */
const stepPages = Object.fromEntries(
	(['stepPestReport', 'stepCorrectViolation', 'stepPrepUnit'] as const).map((key) => [
		key,
		{
			...base(key),
			sections: [
				...base(key).sections,
				related([
					{ title: 'Tenant rights when reporting housing conditions', target: 'tenantRights' }
				])
			]
		}
	])
) as Record<'stepPestReport' | 'stepCorrectViolation' | 'stepPrepUnit', Page>;

/** U5: Topic has no Related panel. */
const healthyHousingTopic: Page = {
	...base('healthyHousingTopic'),
	audience: [
		'This page is for tenants, property owners and managers, and anyone researching healthy-housing services in San Francisco.'
	],
	sections: [
		...base('healthyHousingTopic').sections,
		{
			heading: 'Related',
			karl: 'BLOCKED on U5. Topic has NO `related` field.',
			kind: 'placement',
			component: 'related',
			cards: [
				{ title: 'Free mosquito education workshop', target: 'mosquitoWorkshop' },
				{ title: 'Free IPM education workshop', target: 'ipmEducation' }
			]
		}
	]
};

/** U20: Agency subsections hold a title and links only, no intro text. */
const SUBSECTION_INTROS: Record<string, string> = {
	'Get help with pests, mold, or trash':
		'Report a pest, mold, trash, or housing health issue through 311. If you know the type of condition, choose a focused reporting path below.',
	'If you rent':
		'You can ask the City for help with housing health problems. Learn how to report, what may happen next, and where to get tenant support.',
	'If you own or manage a building':
		'Use these resources to prevent pest problems, meet Article 11 responsibilities, and respond to a notice or fee.',
	'Other City housing services':
		'Lead safety, water service, noise, asbestos, and structural construction concerns may be handled by another City program.'
};
const pestsTopic: Page = Object.entries(SUBSECTION_INTROS).reduce(
	(page, [heading, text]) => withSection(page, heading, (s) => ({ ...s, paragraphs: [text] })),
	{
		...base('pestsTopic'),
		audience: [
			'This page is for tenants, property owners and managers, and anyone reporting a pest or housing health problem.'
		]
	} as Page
);

/** U21: About us, Campaign and Report have no Description panel. */
const aboutHhvcTeam: Page = {
	...base('aboutHhvcTeam'),
	summary: 'Meet the Environmental Health team that inspects homes and responds to pest reports.',
	audience: [
		'Anyone who wants to know more about the Healthy Housing and Vector Control program and the people who run it.'
	]
};
const mosquitoWorkshop: Page = {
	...base('mosquitoWorkshop'),
	summary: 'Request a no-cost science session for schools, camps, museums, and science fairs.',
	audience: [
		'This page is for teachers, youth program leaders, and families who want to host a free mosquito science workshop.'
	]
};
const ipmEducation: Page = {
	...base('ipmEducation'),
	summary:
		'Request a no-cost integrated pest management session for tenant groups and community organizations.',
	audience: [
		'This page is for tenants, resident groups, and community organizations that want to host a free pest-prevention workshop.'
	]
};
const inspectionsAnnual: Page = {
	...base('inspectionsAnnual'),
	summary: 'Inspection counts, violation types, and re-inspection outcomes for the past year.',
	audience: [
		'A journalist or researcher looking for program figures',
		'A neighborhood or tenant organization tracking conditions',
		'City staff answering a question about volume'
	]
};

/** A Campaign body section with no component reaches no Campaign panel. */
const ratFreeBlocks: Page = withSection(
	{
		...base('ratFreeBlocks'),
		summary: 'A neighborhood push to cut rat sightings through coordinated cleanup and prevention.',
		audience: [
			'A resident who wants their block to act together',
			'A neighborhood or merchant association organizing a cleanup',
			'A property owner or manager on a block with a rodent problem'
		]
	},
	'Start with your own block',
	(s) => without(s, 'component', 'open')
);

/** Transaction pages: the audience list with a full Things to know budget. */
const garbageReport: Page = {
	...base('garbageReport'),
	audience: [
		'A tenant or resident affected by garbage, clutter, or overgrown plants',
		'A neighbor reporting conditions on a nearby property',
		'A friend, family member, advocate, or helper reporting for someone else'
	]
};

export const gapPages = {
	rodentsReport,
	afterReport,
	...stepPages,
	healthyHousingTopic,
	pestsTopic,
	aboutHhvcTeam,
	mosquitoWorkshop,
	ipmEducation,
	inspectionsAnnual,
	ratFreeBlocks,
	garbageReport
};

/** The corpus with the gap pages swapped in, for anything that resolves links by key. */
export const pagesByKeyWithGaps = { ...pagesByKey, ...gapPages } as unknown as typeof pagesByKey;
