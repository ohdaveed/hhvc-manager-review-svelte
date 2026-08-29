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
