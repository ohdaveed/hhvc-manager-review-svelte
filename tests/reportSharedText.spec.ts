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
const REPORT_PAGES = ['filthReport', 'rodentsReport', 'insectsReport'];
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
});
