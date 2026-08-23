import { describe, it, expect } from 'vitest';
import { extractFields } from './fields.js';
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

/**
 * Guards against `extractFields` silently falling behind the real corpus.
 *
 * `extractFields` deliberately reads only `title`, `summary`, `audience[]`,
 * and per-section `heading`/`paragraphs`/`bullets`/`callout.title`/
 * `callout.text` (see the doc comment on `extractFields` in `fields.ts`).
 * Real data modules under `src/lib/data/` carry other keys it never reads.
 * Some of those are genuinely copy -- if a re-port rewrites only, say,
 * `cards`, `corpusHash` does not move, the future import script hits its
 * `UNIQUE` constraint on an unchanged hash, and no version row gets written.
 * The change becomes invisible to version history with no error anywhere.
 *
 * Expanding `extractFields` to cover those keys is a deliberate non-fix: it
 * would mint `field_id`s for content the UI never advertises as
 * `data-rewrite-field`, which breaks a constraint this whole slice is built
 * on. Resolving that properly means separating "what counts as a version
 * change" from "what is an addressable edit target" -- a spec decision, not
 * one this test makes.
 *
 * So instead of hashing them, this test keeps the gap loud: every key that
 * appears anywhere in `allPages` must be named in one of the allowlists
 * below, split by which level of the page shape it appears at. A key that is
 * neither handled nor a documented, known gap fails the suite -- which is
 * exactly what should happen when a new data module (or an edit to an
 * existing one) introduces a fresh copy-bearing key nobody has decided how
 * to treat yet.
 */
describe('extractFields coverage of the real corpus', () => {
	// Keys `extractFields` actually reads, per level of the page shape.
	const HANDLED_TOP = ['title', 'summary', 'audience', 'sections'];
	const HANDLED_SECTION = ['heading', 'paragraphs', 'bullets', 'callout'];
	const HANDLED_CALLOUT = ['title', 'text'];

	// Copy-bearing keys NOT hashed, pending the spec decision described above.
	// A re-port that touches only one of these produces no version row.
	const UNHANDLED_COPY_TOP = [
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
	const UNHANDLED_COPY_SECTION = ['button', 'buttonUrl', 'cards', 'facts', 'steps', 'table'];
	const UNHANDLED_COPY_CALLOUT: string[] = [];

	// Metadata, annotations, and structural/config keys. These are correctly
	// excluded on purpose (see `extractFields`'s own doc comment for `karl`,
	// `editorNote`, `editorStatus`) or carry no reader-visible copy at all
	// (discriminators, style/target ids, booleans) -- there is no version-gap
	// risk here, they just also are not read.
	const NON_COPY_TOP = ['editorNote', 'editorStatus', 'reading', 'slug', 'type'];
	const NON_COPY_SECTION = ['buttonStyle', 'buttonTarget', 'component', 'karl', 'kind', 'open'];
	const NON_COPY_CALLOUT = ['karl', 'variant'];

	const KNOWN_UNHANDLED_TOP = [...UNHANDLED_COPY_TOP, ...NON_COPY_TOP];
	const KNOWN_UNHANDLED_SECTION = [...UNHANDLED_COPY_SECTION, ...NON_COPY_SECTION];
	const KNOWN_UNHANDLED_CALLOUT = [...UNHANDLED_COPY_CALLOUT, ...NON_COPY_CALLOUT];

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
				`if it should be hashed, or to KNOWN_UNHANDLED in fields.test.ts if it is a documented gap.`
		).toEqual([]);
	}

	const topKeys = new Set<string>();
	const sectionKeys = new Set<string>();
	const calloutKeys = new Set<string>();

	for (const page of allPages as Array<Record<string, unknown>>) {
		for (const key of Object.keys(page)) topKeys.add(key);

		const sections = Array.isArray(page.sections) ? page.sections : [];
		for (const raw of sections) {
			const section = (raw ?? {}) as Record<string, unknown>;
			for (const key of Object.keys(section)) sectionKeys.add(key);

			if (section.callout && typeof section.callout === 'object') {
				for (const key of Object.keys(section.callout as Record<string, unknown>)) {
					calloutKeys.add(key);
				}
			}
		}
	}

	it('every top-level page key is handled or a documented gap', () => {
		assertNoUnknownKeys('top-level', topKeys, HANDLED_TOP, KNOWN_UNHANDLED_TOP);
	});

	it('every section-level key is handled or a documented gap', () => {
		assertNoUnknownKeys('section-level', sectionKeys, HANDLED_SECTION, KNOWN_UNHANDLED_SECTION);
	});

	it('every callout-level key is handled or a documented gap', () => {
		assertNoUnknownKeys('callout-level', calloutKeys, HANDLED_CALLOUT, KNOWN_UNHANDLED_CALLOUT);
	});

	it('sanity: the corpus actually exercises the documented gaps', () => {
		// If this ever goes empty, the KNOWN_UNHANDLED lists above have drifted
		// ahead of the corpus rather than behind it -- prune them back down.
		for (const key of KNOWN_UNHANDLED_TOP) expect(topKeys.has(key), key).toBe(true);
		for (const key of KNOWN_UNHANDLED_SECTION) expect(sectionKeys.has(key), key).toBe(true);
		for (const key of KNOWN_UNHANDLED_CALLOUT) expect(calloutKeys.has(key), key).toBe(true);
	});
});
