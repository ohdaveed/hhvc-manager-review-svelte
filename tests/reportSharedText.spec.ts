/**
 * The Decisions tab (docs/reviews/2026-11-24-karl-review-all-tabs.md): text
 * shared by every report page lives on What happens after you report, which
 * each report page links from Related pages. Report pages keep only what is
 * specific to their condition.
 */
import { describe, expect, it } from 'vitest';
import { pagesByKey } from '$lib/data/index';
import { extractCopy, type CorpusPage } from '$lib/corpus/fields';

const pages = pagesByKey as unknown as Record<
	string,
	CorpusPage & { sections: { cards?: { target: string }[] }[] }
>;
// The nine condition pages (report regroup, Decided, completed 2026-11-25).
const CONDITION_PAGES = [
	'rodentsReport',
	'bedBugReport',
	'insectsReport',
	'mosquitoReport',
	'pigeonReport',
	'sewageReport',
	'animalWasteReport',
	'moldReport',
	'garbageReport'
];
const REPORT_PAGES = CONDITION_PAGES;
const CONFIDENTIALITY = 'We never share your name or contact information.';
const SHARED = [
	/\*\*Review time:\*\*/,
	/\*\*If you gave contact information:\*\*/,
	/\*\*If you reported anonymously:\*\*/,
	/\*\*If we find a problem:\*\*/,
	/cannot retaliate/,
	/do not have to give your name/
];

describe('shared report text', () => {
	it.each(REPORT_PAGES)('%s carries none of it', (key) => {
		const copy = Object.values(extractCopy(pages[key])).join('\n');
		for (const pattern of SHARED) expect(copy, String(pattern)).not.toMatch(pattern);
	});

	it.each(REPORT_PAGES)('%s links What happens after you report', (key) => {
		const targets = pages[key].sections.flatMap((s) => s.cards ?? []).map((c) => c.target);
		expect(targets).toContain('afterReport');
	});

	// Decided: one confidentiality sentence, the same on every page, said once.
	it.each(CONDITION_PAGES)('%s states the confidentiality sentence exactly once', (key) => {
		const copy = Object.values(extractCopy(pages[key])).join('\n');
		expect(copy.split(CONFIDENTIALITY).length - 1).toBe(1);
		expect(copy).not.toMatch(/City Attorney/);
	});

	// Decided: no separate SRO page; each report page carries a one-line note.
	it.each(CONDITION_PAGES)('%s carries the SRO note', (key) => {
		const copy = Object.values(extractCopy(pages[key])).join('\n');
		expect(copy).toMatch(/Live in an SRO or residential hotel\?/);
	});
});
