import { describe, it, expect } from 'vitest';
import { extractCopy, extractFields } from './fields.js';
import { allPages } from '../data/index.js';

const page = {
	slug: 'sf.gov/topic-x--about',
	type: 'About us',
	title: 'About vector control',
	summary: 'What the program does.',
	audience: ['Residents', 'Property owners'],
	reading: 'Grade 6',
	editorStatus: 'placeholder',
	editorNote: 'An annotation that must not be hashed.',
	sections: [
		{
			heading: 'How to report',
			karl: 'Maps to an Information block.',
			paragraphs: ['First paragraph.', 'Second paragraph.'],
			bullets: ['First bullet.']
		},
		{
			heading: 'What happens next',
			paragraphs: ['Only paragraph.'],
			callout: { title: 'Note', text: 'Callout body.' }
		}
	]
};

describe('extractFields', () => {
	it('produces the exact id shapes the UI advertises', () => {
		expect(Object.keys(extractFields(page)).sort()).toEqual(
			[
				'audience.0',
				'audience.1',
				'sections.how-to-report.bullets.0',
				'sections.how-to-report.heading',
				'sections.how-to-report.paragraphs.0',
				'sections.how-to-report.paragraphs.1',
				'sections.what-happens-next.callout.text',
				'sections.what-happens-next.callout.title',
				'sections.what-happens-next.heading',
				'sections.what-happens-next.paragraphs.0',
				'summary',
				'title'
			].sort()
		);
	});

	it('maps ids to their text', () => {
		const fields = extractFields(page);
		expect(fields['title']).toBe('About vector control');
		expect(fields['audience.1']).toBe('Property owners');
		expect(fields['sections.how-to-report.paragraphs.1']).toBe('Second paragraph.');
		expect(fields['sections.what-happens-next.callout.text']).toBe('Callout body.');
	});

	it('excludes annotations and metadata', () => {
		const keys = Object.keys(extractFields(page));
		expect(keys).not.toContain('editorNote');
		expect(keys).not.toContain('karl');
		expect(keys).not.toContain('type');
		expect(keys).not.toContain('reading');
		expect(keys).not.toContain('slug');
	});

	it('omits absent optional collections rather than emitting empty ids', () => {
		const bare = { title: 'T', sections: [{ heading: 'H' }] };
		expect(Object.keys(extractFields(bare)).sort()).toEqual(['sections.h.heading', 'title']);
	});
});

// A fixture exercising every UNHANDLED_COPY_* key from the coverage-guard
// suite below, plus the object-wrapped paragraph/bullet entries extractFields
// silently drops (see the "fills the gap" test below).
const richPage = {
	slug: 'sf.gov/topic-y--resources',
	type: 'Resource hub',
	title: 'Resources',
	summary: 'Where to find help.',
	audience: ['Residents'],
	editorNote: 'An annotation that must not be hashed.',
	editorStatus: 'placeholder',
	topicTag: 'Agency: Healthy Housing and Vector Control',
	seoTitle: 'Resources | SF.gov',
	metaDescription: 'A page describing available resources.',
	reportDate: 'August 7, 2026',
	contact: {
		phone: ['311 (call or text)'],
		email: ['ehb@sfdph.org'],
		other: ['Environmental Health']
	},
	spotlight: {
		title: 'Read the full code',
		paragraphs: ['This is a summary, not the legal code.'],
		button: 'View the code',
		buttonUrl: 'https://example.com/code',
		karl: 'Report Spotlight -> external Button link.'
	},
	whatToKnow: {
		cost: 'Free',
		thingsToKnow: [
			'A bare string fact.',
			{ label: 'Reporting anonymously', text: 'You can report anonymously.' }
		]
	},
	partnerAgencies: [{ title: 'Department of Public Health', url: 'https://example.com/dph' }],
	sections: [
		{
			heading: 'How to report',
			karl: 'Maps to an Information block.',
			paragraphs: [
				'First paragraph.',
				{
					text: 'A sourced paragraph.',
					unverified: true,
					unverifiedReason: 'No tier-1 source yet. Confirm with HHVC before publication.'
				}
			],
			bullets: [
				'First bullet.',
				{
					text: 'A sourced bullet.',
					unverified: true,
					unverifiedReason: 'No tier-1 source yet. Confirm with HHVC before publication.'
				}
			],
			button: 'Learn more',
			buttonUrl: 'https://example.com/learn-more',
			cards: [
				{
					title: 'UC IPM Pest Notes: Rats',
					text: 'University of California guidance on rats.',
					url: 'https://ipm.ucanr.edu/rats/',
					karl: 'External link inside the supporting_information accordion.'
				},
				{ title: 'Report a housing problem', target: 'filthReport' }
			],
			facts: [
				{
					label: 'Contact',
					text: 'Contact HHVC by calling 311.',
					unverified: true,
					unverifiedReason: 'SME placeholder -- confirm with HHVC before publication.'
				}
			],
			steps: [
				{
					title: 'Start your report',
					karl: 'what_to_do -> Section.',
					text: [
						'A step paragraph.',
						{
							text: 'A sourced step paragraph.',
							unverified: true,
							unverifiedReason: 'No tier-1 source yet. Confirm with HHVC before publication.'
						}
					],
					bullets: [
						'A step bullet.',
						{
							text: 'A sourced step bullet.',
							unverified: true,
							unverifiedReason: 'No tier-1 source yet. Confirm with HHVC before publication.'
						}
					],
					button: 'Report through 311',
					buttonUrl: 'https://example.com/311',
					callout: {
						title: 'Your report is confidential',
						text: 'The City will never share your contact information.',
						karl: 'Callout block inside the "Start your report" Section specifics.'
					}
				}
			],
			table: [
				['Section', 'In plain language'],
				['Sec. 581(a)', 'Do not allow a public health nuisance.']
			]
		}
	]
};

describe('extractCopy', () => {
	it('includes everything extractFields returns', () => {
		const copy = extractCopy(richPage);
		for (const [id, text] of Object.entries(extractFields(richPage))) {
			expect(copy[id]).toBe(text);
		}
	});

	it('includes copy from every UNHANDLED_COPY_* category: cards, steps, whatToKnow, button, table, facts, partnerAgencies', () => {
		const copy = extractCopy(richPage);
		expect(copy['sections.how-to-report.cards.0.title']).toBe('UC IPM Pest Notes: Rats');
		expect(copy['sections.how-to-report.cards.0.text']).toBe(
			'University of California guidance on rats.'
		);
		expect(copy['sections.how-to-report.cards.0.url']).toBe('https://ipm.ucanr.edu/rats/');
		expect(copy['sections.how-to-report.cards.1.title']).toBe('Report a housing problem');
		expect(copy['sections.how-to-report.steps.0.title']).toBe('Start your report');
		expect(copy['sections.how-to-report.steps.0.text.0']).toBe('A step paragraph.');
		expect(copy['sections.how-to-report.steps.0.button']).toBe('Report through 311');
		expect(copy['sections.how-to-report.steps.0.buttonUrl']).toBe('https://example.com/311');
		expect(copy['sections.how-to-report.steps.0.callout.title']).toBe(
			'Your report is confidential'
		);
		expect(copy['sections.how-to-report.button']).toBe('Learn more');
		expect(copy['sections.how-to-report.buttonUrl']).toBe('https://example.com/learn-more');
		expect(copy['sections.how-to-report.table.0.0']).toBe('Section');
		expect(copy['sections.how-to-report.table.1.1']).toBe('Do not allow a public health nuisance.');
		expect(copy['sections.how-to-report.facts.0.label']).toBe('Contact');
		expect(copy['sections.how-to-report.facts.0.text']).toBe('Contact HHVC by calling 311.');
		expect(copy['partnerAgencies.0.title']).toBe('Department of Public Health');
		expect(copy['partnerAgencies.0.url']).toBe('https://example.com/dph');
	});

	it('includes copy from contact, spotlight, and page-level SEO/meta fields', () => {
		const copy = extractCopy(richPage);
		expect(copy['contact.phone.0']).toBe('311 (call or text)');
		expect(copy['contact.email.0']).toBe('ehb@sfdph.org');
		expect(copy['contact.other.0']).toBe('Environmental Health');
		expect(copy['spotlight.title']).toBe('Read the full code');
		expect(copy['spotlight.paragraphs.0']).toBe('This is a summary, not the legal code.');
		expect(copy['spotlight.button']).toBe('View the code');
		expect(copy['spotlight.buttonUrl']).toBe('https://example.com/code');
		expect(copy['metaDescription']).toBe('A page describing available resources.');
		expect(copy['reportDate']).toBe('August 7, 2026');
		expect(copy['seoTitle']).toBe('Resources | SF.gov');
		expect(copy['topicTag']).toBe('Agency: Healthy Housing and Vector Control');
		expect(copy['whatToKnow.cost']).toBe('Free');
		expect(copy['whatToKnow.thingsToKnow.0']).toBe('A bare string fact.');
		expect(copy['whatToKnow.thingsToKnow.1.label']).toBe('Reporting anonymously');
		expect(copy['whatToKnow.thingsToKnow.1.text']).toBe('You can report anonymously.');
	});

	it('extracts reader-visible text from wrapped paragraph/bullet entries', () => {
		expect(extractFields(richPage)['sections.how-to-report.paragraphs.1']).toBe(
			'A sourced paragraph.'
		);
		expect(extractFields(richPage)['sections.how-to-report.bullets.1']).toBe('A sourced bullet.');

		const copy = extractCopy(richPage);
		expect(copy['sections.how-to-report.paragraphs.1']).toBe('A sourced paragraph.');
		expect(copy['sections.how-to-report.bullets.1']).toBe('A sourced bullet.');
	});

	it('excludes annotations and structural/enum keys, including nested ones', () => {
		const copy = extractCopy(richPage);
		const values = Object.values(copy);

		// Page-level annotations, still excluded.
		expect(values).not.toContain('An annotation that must not be hashed.');

		// karl at every depth it appears: section, card, step, step callout,
		// spotlight.
		expect(values).not.toContain('Maps to an Information block.');
		expect(values).not.toContain('External link inside the supporting_information accordion.');
		expect(values).not.toContain('what_to_do -> Section.');
		expect(values).not.toContain('Callout block inside the "Start your report" Section specifics.');
		expect(values).not.toContain('Report Spotlight -> external Button link.');

		// A routing id (cards[].target), the cards-level equivalent of
		// buttonTarget.
		expect(values).not.toContain('filthReport');

		// unverifiedReason at every depth it appears: section paragraphs/bullets,
		// facts, step text/bullets -- an internal verification note, not
		// reader-visible copy.
		for (const value of values) {
			expect(value).not.toMatch(/Confirm with HHVC before publication/);
			expect(value).not.toMatch(/SME placeholder/);
		}

		// No key was set from a boolean.
		expect(copy['sections.how-to-report.facts.0.unverified']).toBeUndefined();
	});

	it('produces an order-stable, JSON-serializable key -> string map', () => {
		const a = extractCopy(richPage);
		const b = extractCopy(structuredClone(richPage));
		expect(Object.keys(a).sort()).toEqual(Object.keys(b).sort());
		for (const key of Object.keys(a)) expect(typeof a[key]).toBe('string');
	});
});

/**
 * Guards against `extractFields`/`extractCopy` silently falling behind the
 * real corpus.
 *
 * `extractFields` deliberately reads only `title`, `summary`, `audience[]`,
 * and per-section `heading`/`paragraphs`/`bullets`/`callout.title`/
 * `callout.text` (see the doc comment on `extractFields` in `fields.ts`) --
 * those are the only keys that mint `field_id`s. Everything else copy-bearing
 * that real data modules under `src/lib/data/` carry is read by `extractCopy`
 * instead (decision 17), at whatever depth it appears.
 *
 * This test keeps that split loud: every key that appears anywhere in
 * `allPages`, at every level this test census covers, must be named in one of
 * three lists per level -- HANDLED (an edit target, read by `extractFields`),
 * COPY_ONLY (read by `extractCopy` but not an edit target -- fine, e.g. every
 * key inside `cards`), or NON_COPY (an annotation or structural/enum value,
 * read by neither, on purpose). A key in none of the three fails the suite --
 * that is "in no map at all", the real gap this test exists to catch, exactly
 * as it caught the original one that motivated decision 17.
 */
describe('extractFields/extractCopy coverage of the real corpus', () => {
	// Keys `extractFields` actually reads, per level of the page shape.
	const HANDLED_TOP = ['title', 'summary', 'audience', 'sections'];
	const HANDLED_SECTION = ['heading', 'paragraphs', 'bullets', 'callout'];
	const HANDLED_CALLOUT = ['title', 'text'];

	// Copy-bearing keys that are not an edit target, but are read by
	// `extractCopy` -- see the `extractCopy` tests above for direct proof per
	// key. A re-port that touches only one of these still moves `content_hash`.
	const COPY_ONLY_TOP = [
		'contact',
		'metaDescription',
		'partnerAgencies',
		// Present on exactly one page (health-code-article-11.ts) and not
		// currently rendered anywhere, but it is copy-shaped text, not
		// structural -- treat it the same as the others rather than assume
		// "unused" means "safe to ignore".
		'reportDate',
		'seoTitle',
		'spotlight',
		'topicTag',
		'whatToKnow'
	];
	const COPY_ONLY_SECTION = ['button', 'buttonUrl', 'cards', 'facts', 'steps', 'table'];
	const COPY_ONLY_CALLOUT: string[] = [];

	// Metadata, annotations, and structural/config keys. These are correctly
	// excluded from both extractors on purpose (see `extractFields`'s own doc
	// comment for `karl`, `editorNote`, `editorStatus`) or carry no
	// reader-visible copy at all (discriminators, style/target ids, booleans).
	const NON_COPY_TOP = ['editorNote', 'editorStatus', 'reading', 'slug', 'type'];
	const NON_COPY_SECTION = ['buttonStyle', 'buttonTarget', 'component', 'karl', 'kind', 'open'];
	const NON_COPY_CALLOUT = ['karl', 'variant'];

	// Deeper levels `extractCopy` walks into that `extractFields` never
	// visits at all -- so there is no HANDLED bucket for these, only
	// COPY_ONLY (read) and NON_COPY (deliberately unread).
	const COPY_ONLY_CARD = ['title', 'text', 'url'];
	const NON_COPY_CARD = ['karl', 'target']; // target is cards' buttonTarget

	const COPY_ONLY_FACT = ['label', 'text'];
	const NON_COPY_FACT = ['unverified', 'unverifiedReason'];

	const COPY_ONLY_STEP = ['title', 'text', 'button', 'buttonUrl', 'callout', 'bullets'];
	const NON_COPY_STEP = ['karl'];

	const COPY_ONLY_STEP_CALLOUT = ['title', 'text'];
	const NON_COPY_STEP_CALLOUT = ['karl'];

	// The `{ text, unverified, unverifiedReason }` wrapper an entry in
	// `paragraphs`/`bullets`/`steps[].text`/`steps[].bullets` can take instead
	// of a bare string, anywhere any of those four appear.
	const COPY_ONLY_WRAPPED_ENTRY = ['text'];
	const NON_COPY_WRAPPED_ENTRY = ['unverified', 'unverifiedReason'];

	const COPY_ONLY_WHAT_TO_KNOW = ['cost', 'thingsToKnow'];
	const COPY_ONLY_THINGS_TO_KNOW_ENTRY = ['label', 'text'];

	const COPY_ONLY_CONTACT = ['phone', 'email', 'other'];

	const COPY_ONLY_SPOTLIGHT = ['title', 'paragraphs', 'button', 'buttonUrl'];
	const NON_COPY_SPOTLIGHT = ['karl'];

	const COPY_ONLY_PARTNER_AGENCY = ['title', 'url'];

	function assertNoUnknownKeys(
		level: string,
		found: Set<string>,
		handled: string[],
		known: string[]
	) {
		const allowed = new Set([...handled, ...known]);
		const unknown = [...found].filter((key) => !allowed.has(key));
		expect(
			unknown,
			`${level}: unrecognized key(s) ${JSON.stringify(unknown)} — add to HANDLED (and extractFields) ` +
				`if it is an edit target, to COPY_ONLY (and extractCopy) if it is copy but not an edit ` +
				`target, or to NON_COPY in fields.test.ts if it is deliberately excluded from both.`
		).toEqual([]);
	}

	const topKeys = new Set<string>();
	const sectionKeys = new Set<string>();
	const calloutKeys = new Set<string>();
	const cardKeys = new Set<string>();
	const factKeys = new Set<string>();
	const stepKeys = new Set<string>();
	const stepCalloutKeys = new Set<string>();
	const wrappedEntryKeys = new Set<string>();
	const whatToKnowKeys = new Set<string>();
	const thingsToKnowEntryKeys = new Set<string>();
	const contactKeys = new Set<string>();
	const spotlightKeys = new Set<string>();
	const partnerAgencyKeys = new Set<string>();

	const keysOf = (value: unknown): string[] =>
		value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value) : [];
	const collectWrappedEntry = (entry: unknown) => {
		if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
			keysOf(entry).forEach((k) => wrappedEntryKeys.add(k));
		}
	};

	for (const page of allPages as Array<Record<string, unknown>>) {
		for (const key of Object.keys(page)) topKeys.add(key);

		keysOf(page.contact).forEach((k) => contactKeys.add(k));
		keysOf(page.spotlight).forEach((k) => spotlightKeys.add(k));
		const spotlight = page.spotlight as Record<string, unknown> | undefined;
		for (const p of Array.isArray(spotlight?.paragraphs) ? spotlight!.paragraphs : []) {
			// spotlight.paragraphs is always a bare string in the corpus today;
			// still censused for symmetry with section paragraphs.
			collectWrappedEntry(p);
		}
		const whatToKnow = page.whatToKnow as Record<string, unknown> | undefined;
		keysOf(whatToKnow).forEach((k) => whatToKnowKeys.add(k));
		for (const t of Array.isArray(whatToKnow?.thingsToKnow) ? whatToKnow!.thingsToKnow : []) {
			if (t && typeof t === 'object') keysOf(t).forEach((k) => thingsToKnowEntryKeys.add(k));
		}
		for (const pa of Array.isArray(page.partnerAgencies) ? page.partnerAgencies : []) {
			keysOf(pa).forEach((k) => partnerAgencyKeys.add(k));
		}

		const sections = Array.isArray(page.sections) ? page.sections : [];
		for (const raw of sections) {
			const section = (raw ?? {}) as Record<string, unknown>;
			for (const key of Object.keys(section)) sectionKeys.add(key);

			if (section.callout && typeof section.callout === 'object') {
				keysOf(section.callout).forEach((k) => calloutKeys.add(k));
			}
			for (const p of Array.isArray(section.paragraphs) ? section.paragraphs : []) {
				collectWrappedEntry(p);
			}
			for (const b of Array.isArray(section.bullets) ? section.bullets : []) {
				collectWrappedEntry(b);
			}
			for (const c of Array.isArray(section.cards) ? section.cards : []) {
				keysOf(c).forEach((k) => cardKeys.add(k));
			}
			for (const f of Array.isArray(section.facts) ? section.facts : []) {
				keysOf(f).forEach((k) => factKeys.add(k));
			}
			for (const s of Array.isArray(section.steps) ? section.steps : []) {
				const step = s as Record<string, unknown>;
				keysOf(step).forEach((k) => stepKeys.add(k));
				keysOf(step.callout).forEach((k) => stepCalloutKeys.add(k));
				for (const t of Array.isArray(step.text) ? step.text : []) collectWrappedEntry(t);
				for (const b of Array.isArray(step.bullets) ? step.bullets : []) collectWrappedEntry(b);
			}
		}
	}

	it('every top-level page key is handled, copy-only, or non-copy', () => {
		assertNoUnknownKeys('top-level', topKeys, HANDLED_TOP, [...COPY_ONLY_TOP, ...NON_COPY_TOP]);
	});

	it('every section-level key is handled, copy-only, or non-copy', () => {
		assertNoUnknownKeys('section-level', sectionKeys, HANDLED_SECTION, [
			...COPY_ONLY_SECTION,
			...NON_COPY_SECTION
		]);
	});

	it('every callout-level key is handled, copy-only, or non-copy', () => {
		assertNoUnknownKeys('callout-level', calloutKeys, HANDLED_CALLOUT, [
			...COPY_ONLY_CALLOUT,
			...NON_COPY_CALLOUT
		]);
	});

	it('every card-level key is copy-only or non-copy', () => {
		assertNoUnknownKeys('card-level', cardKeys, [], [...COPY_ONLY_CARD, ...NON_COPY_CARD]);
	});

	it('every fact-level key is copy-only or non-copy', () => {
		assertNoUnknownKeys('fact-level', factKeys, [], [...COPY_ONLY_FACT, ...NON_COPY_FACT]);
	});

	it('every step-level key is copy-only or non-copy', () => {
		assertNoUnknownKeys('step-level', stepKeys, [], [...COPY_ONLY_STEP, ...NON_COPY_STEP]);
	});

	it('every step-callout-level key is copy-only or non-copy', () => {
		assertNoUnknownKeys(
			'step-callout-level',
			stepCalloutKeys,
			[],
			[...COPY_ONLY_STEP_CALLOUT, ...NON_COPY_STEP_CALLOUT]
		);
	});

	it('every wrapped-entry key (paragraphs/bullets/step text/step bullets) is copy-only or non-copy', () => {
		assertNoUnknownKeys(
			'wrapped-entry',
			wrappedEntryKeys,
			[],
			[...COPY_ONLY_WRAPPED_ENTRY, ...NON_COPY_WRAPPED_ENTRY]
		);
	});

	it('every whatToKnow-level key is copy-only', () => {
		assertNoUnknownKeys('whatToKnow-level', whatToKnowKeys, [], COPY_ONLY_WHAT_TO_KNOW);
	});

	it('every thingsToKnow-entry-level key is copy-only', () => {
		assertNoUnknownKeys(
			'thingsToKnow-entry-level',
			thingsToKnowEntryKeys,
			[],
			COPY_ONLY_THINGS_TO_KNOW_ENTRY
		);
	});

	it('every contact-level key is copy-only', () => {
		assertNoUnknownKeys('contact-level', contactKeys, [], COPY_ONLY_CONTACT);
	});

	it('every spotlight-level key is copy-only or non-copy', () => {
		assertNoUnknownKeys(
			'spotlight-level',
			spotlightKeys,
			[],
			[...COPY_ONLY_SPOTLIGHT, ...NON_COPY_SPOTLIGHT]
		);
	});

	it('every partnerAgency-level key is copy-only', () => {
		assertNoUnknownKeys('partnerAgency-level', partnerAgencyKeys, [], COPY_ONLY_PARTNER_AGENCY);
	});

	it('sanity: the corpus actually exercises every documented copy-only/non-copy key', () => {
		// If this ever goes empty for a given list, that list has drifted ahead
		// of the corpus rather than behind it -- prune it back down.
		const allChecks: Array<[Set<string>, string[]]> = [
			[topKeys, [...COPY_ONLY_TOP, ...NON_COPY_TOP]],
			[sectionKeys, [...COPY_ONLY_SECTION, ...NON_COPY_SECTION]],
			[calloutKeys, [...COPY_ONLY_CALLOUT, ...NON_COPY_CALLOUT]],
			[cardKeys, [...COPY_ONLY_CARD, ...NON_COPY_CARD]],
			[factKeys, [...COPY_ONLY_FACT, ...NON_COPY_FACT]],
			[stepKeys, [...COPY_ONLY_STEP, ...NON_COPY_STEP]],
			[stepCalloutKeys, [...COPY_ONLY_STEP_CALLOUT, ...NON_COPY_STEP_CALLOUT]],
			[wrappedEntryKeys, [...COPY_ONLY_WRAPPED_ENTRY, ...NON_COPY_WRAPPED_ENTRY]],
			[whatToKnowKeys, COPY_ONLY_WHAT_TO_KNOW],
			[thingsToKnowEntryKeys, COPY_ONLY_THINGS_TO_KNOW_ENTRY],
			[contactKeys, COPY_ONLY_CONTACT],
			[spotlightKeys, [...COPY_ONLY_SPOTLIGHT, ...NON_COPY_SPOTLIGHT]],
			[partnerAgencyKeys, COPY_ONLY_PARTNER_AGENCY]
		];
		for (const [found, documented] of allChecks) {
			for (const key of documented) expect(found.has(key), key).toBe(true);
		}
	});

	it('extractCopy actually emits a key for every documented copy-only category, against the real corpus', () => {
		// A stronger check than corpus key-name membership above: prove
		// `extractCopy` itself, not just the categorization lists, produces
		// output for each family the motivating bug (decision 17) named.
		const allCopyKeys = new Set<string>();
		for (const page of allPages) {
			for (const key of Object.keys(extractCopy(page))) allCopyKeys.add(key);
		}
		const families = [
			'.cards.',
			'.steps.',
			'whatToKnow.',
			'.button',
			'.table.',
			'.facts.',
			'partnerAgencies.'
		];
		for (const family of families) {
			expect(
				[...allCopyKeys].some((key) => key.includes(family)),
				`no extractCopy key contains ${JSON.stringify(family)}`
			).toBe(true);
		}
	});
});
