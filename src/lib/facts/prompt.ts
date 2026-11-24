/**
 * The registry, rendered for a system prompt.
 *
 * Appended in `$lib/server/ai/generate.ts` rather than in `vendor/prompts.js`,
 * which is kept diffable against the upstream tool package. Byte-stable for a
 * given registry (no timestamps), so it does not defeat prompt caching.
 */
import { OPEN_QUESTIONS, VERIFIED_FACTS, type OpenQuestion, type VerifiedFact } from './registry';

export const FACTS_DOCUMENT_NAME = 'hhvc-verified-facts';

export function factsPromptBlock(
	facts: readonly VerifiedFact[] = VERIFIED_FACTS,
	open: readonly OpenQuestion[] = OPEN_QUESTIONS
): string {
	if (facts.length === 0 && open.length === 0) return '';
	const lines = [`<document name="${FACTS_DOCUMENT_NAME}">`];

	if (facts.length > 0) {
		lines.push(
			'<verified_facts>',
			'HHVC has confirmed these against an official source. You may state them as written.',
			...facts.map((f) => `- ${f.claim} (Source: ${f.source.title}, checked ${f.checkedOn}.)`),
			'</verified_facts>'
		);
	}

	if (open.length > 0) {
		lines.push(
			'<unconfirmed>',
			'HHVC has NOT confirmed the following. Do not state an answer to any of them as fact, and do not repeat the mockup wording that raised them. If your draft needs one, leave it out and name it in editorNote.',
			...open.map((q) => `- ${q.question}`),
			'</unconfirmed>'
		);
	}

	lines.push('</document>');
	return lines.join('\n');
}
