/**
 * The Decisions tab (docs/reviews/2026-11-24-karl-review-all-tabs.md): HHVC
 * never shares a reporter's identity, so every page uses one sentence, once.
 */
import { describe, expect, it } from 'vitest';
import { allPages } from '$lib/data/index';
import { extractCopy, type CorpusPage } from '$lib/corpus/fields';

const SENTENCE = 'We never share your name or contact information.';
/** The same claim, for a page whose reader is not the reporter (the records lookup). */
const THIRD_PERSON = 'We never share the name or contact information of the person who reported.';
/** Copy that makes a claim about sharing who reported. */
const IDENTITY_CLAIM =
	/\b(share|shared)\b[^.]*\b(name|identit\w*)\b|\bidentit\w*\b[^.]*\bshared\b/i;

const pages = allPages as unknown as (CorpusPage & { slug: string })[];

describe('confidentiality wording', () => {
	it('drops the City Attorney line', () => {
		for (const page of pages)
			for (const text of Object.values(extractCopy(page)))
				expect(text, page.slug).not.toMatch(/Reporter identities are only shared/);
	});

	it('says the decided sentence once on every page that makes the claim, and nothing else', () => {
		for (const page of pages) {
			const claims = Object.values(extractCopy(page)).flatMap((text) =>
				text.split(/(?<=\.)\s+/).filter((s) => IDENTITY_CLAIM.test(s))
			);
			if (claims.length === 0) continue;
			expect(claims.length, page.slug).toBe(1);
			expect([SENTENCE, THIRD_PERSON], page.slug).toContain(claims[0]);
		}
	});
});
