/**
 * @vitest-environment jsdom
 *
 * The Karl transcript is what an editor retypes into Karl, so an unresolved
 * link in it is an instruction to go looking for a page that does not exist.
 *
 * `HelpPanel` used to hand `buildTranscript` a map keyed by the DERIVED
 * ROUTABLE ID (`what-happens-after-you-report-…`). Every lookup the transcript
 * makes against that map is a TARGET lookup -- `linkRepresentation`,
 * `buttonTarget`, `card.target` -- and a target is a `pagesByKey` key
 * (`afterReport`), the vocabulary `src/lib/data/index.ts` documents. So nothing
 * resolved: measured on `article-11-compliance-for-property-owners`, all four
 * internal links read "unresolved target — neither a page key in this corpus
 * nor an http(s) URL" where they should read `Internal link -> "<title>"`.
 */
import { describe, it, expect } from 'vitest';
import {
	buildTranscript,
	renderTranscriptMarkdown
} from '../src/lib/legacy-core/karl-transcript.js';
import { pagesByKey, allPages } from '../src/lib/data/index.js';
import { routableId } from '../src/lib/corpus/pageId.js';
import { extractCopy } from '../src/lib/corpus/fields.js';
import { markdownLinksIn } from '../src/lib/corpus/markdown.js';
import { buildWalkthrough } from '../src/lib/karl/walkthrough.js';

// `buildTranscript` carries JSDoc types, so its parameters are not `any`:
// `pages` is the target map it resolves link and card destinations against.
const transcriptFor = (page: object, pages: Record<string, object>): string =>
	renderTranscriptMarkdown(buildTranscript(page, null, pages));

const pageWithInternalLinks = (allPages as Record<string, unknown>[]).find((p) =>
	String(p.slug).includes('article-11-compliance')
)!;

describe('the map buildTranscript is given', () => {
	it('resolves internal links when keyed by pagesByKey', () => {
		const markdown = transcriptFor(pageWithInternalLinks, pagesByKey as Record<string, object>);
		expect(markdown).toContain('Internal link');
		expect(markdown).not.toContain('unresolved target');
	});

	it('resolves none of them when keyed by routable id — the shape that was passed', () => {
		const byRoutableId: Record<string, object> = {};
		for (const p of allPages as Record<string, unknown>[])
			byRoutableId[routableId(p as never)] = p as object;

		const markdown = transcriptFor(pageWithInternalLinks, byRoutableId);
		expect(markdown).toContain('unresolved target');
		expect(markdown).not.toContain('Internal link');
	});

	it('resolves every internal link target across the whole corpus', () => {
		const unresolved: string[] = [];
		for (const page of allPages as Record<string, unknown>[]) {
			// Only pages that actually carry an internal link are informative.
			const hasInternal = Object.values(extractCopy(page as never)).some((text) =>
				markdownLinksIn(text).some((l) => l.url in pagesByKey)
			);
			if (!hasInternal) continue;
			if (transcriptFor(page, pagesByKey as Record<string, object>).includes('unresolved target')) {
				unresolved.push(String(page.slug));
			}
		}
		expect(unresolved, `pages with unresolved targets:\n${unresolved.join('\n')}`).toEqual([]);
	});
});

/**
 * The same defect, one layer up.
 *
 * `buildWalkthrough` consumes `buildTranscript`, so it inherits the keying
 * requirement -- and the live caller was passing `pageStore.pages`, an array,
 * which is exactly the shape the cases above prove resolves nothing. The
 * drawer dropped links entirely at the time, so nothing failed visibly; now
 * that it renders them, this is the test that keeps the map right.
 */
describe('the map buildWalkthrough is given', () => {
	it('resolves the links it now renders, when keyed by pagesByKey', () => {
		const links = (allPages as Record<string, unknown>[]).flatMap((page) =>
			buildWalkthrough(page, pagesByKey as Record<string, object>).steps.flatMap((s) => s.links)
		);
		expect(links.length).toBeGreaterThan(0);
		expect(links.every((l) => !l.representation.includes('unresolved target'))).toBe(true);
	});

	it('resolves none of them when keyed by routable id — the shape that was passed', () => {
		const byRoutableId: Record<string, object> = {};
		for (const p of allPages as Record<string, unknown>[])
			byRoutableId[routableId(p as never)] = p as object;

		const links = (allPages as Record<string, unknown>[]).flatMap((page) =>
			buildWalkthrough(page, byRoutableId).steps.flatMap((s) => s.links)
		);
		expect(links.some((l) => l.representation.includes('unresolved target'))).toBe(true);
	});

	it('resolves every chooser label to a title rather than a bare page key', () => {
		for (const page of allPages as Record<string, unknown>[]) {
			for (const choice of buildWalkthrough(
				page,
				pagesByKey as Record<string, object>
			).steps.flatMap((s) => s.choices)) {
				// A label still equal to its key means the target did not resolve,
				// which is how 130 of them read when handed the corpus array.
				if (choice.pageKey) {
					expect(choice.label, `${String(page.slug)} → ${choice.pageKey}`).not.toBe(choice.pageKey);
				}
			}
		}
	});
});
