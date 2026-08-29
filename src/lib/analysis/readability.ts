/**
 * Karl Jr.'s readability score, ported.
 *
 * The help center is explicit about what this number is, and it is not what
 * most people assume: "Scores in Karl Junior are calculated using the Automated
 * Readability Index, with some adjustment for sentence complexity. They do not
 * come from Hemingway App." So this is ARI — `4.71 * (letters/words) + 0.5 *
 * (words/sentence) - 21.43` — plus the instructional-content adjustment below,
 * transcribed from the shipped extension (v0.6.0) rather than re-derived, so a
 * reviewer running both tools sees one number instead of two that disagree.
 *
 * The adjustment exists because SF.gov Transaction pages are mostly imperative
 * steps and bullets. Left alone, ARI reads "Give them 72 hours: If they do not
 * start fixing the problem within 3 days, report it to the City." as one long
 * sentence and inflates the grade. When the text looks instructional (a "what
 * to / how to / you must / step N" cue AND bullet markers AND already-shortish
 * sentences), the scorer re-splits on bullet markers and imperative openers,
 * lowers the minimum sentence length from 5 words to 3, and shaves up to half a
 * grade off. `INSTRUCTIONAL` on the result says whether that path was taken —
 * without it a score is not comparable to one that took the other path.
 *
 * Deliberately pure: text in, numbers out, no DOM. `extract.ts` owns the DOM
 * walk, which is where the app diverges from the extension and where the
 * interesting failure modes are.
 */

/** Cues that the copy is instructional rather than prose. */
const INSTRUCTIONAL_CUE = /(?:what to|how to|you must|you need|you can|step \d|before you)/i;

/** A bullet or numbered-list marker. */
const LIST_MARKER = /(?:[-•*]\s|\d+\.\s)/;

/** Where a bullet-ish "sentence" is re-split when the instructional path is taken. */
const INSTRUCTIONAL_SPLIT =
	/(?:\s*[-•*]\s*|\s*\d+\.\s*|\s*(?:You must|You need|You can|You will)\s*)/i;

export type Readability = {
	/** Rounded ARI grade. 0 = kindergarten. */
	score: number;
	gradeLevel: string;
	interpretation: string;
	recommendation: string;
	/** Per-dimension coaching: sentence length, word length, page length. */
	factors: string[];
	characterCount: number;
	wordCount: number;
	sentenceCount: number;
	/** Whether the instructional cues fired. Scores across the two paths are not comparable. */
	instructional: boolean;
	/**
	 * Whether the re-split was actually ACCEPTED, which is a narrower thing.
	 *
	 * `instructional` alone gates the lower sentence floor and the adjustment
	 * even when the guarded re-split is rejected -- that is the extension's own
	 * design (`const H=Z?3:5` runs off the cue flag, not off the split), and it
	 * is preserved so both tools report one number. But it means "instructional"
	 * must not be reported to a reviewer as "steps and bullets were re-split",
	 * because sometimes they were not.
	 */
	resplitApplied: boolean;
	/** Mean words per counted sentence — the input to half of the ARI term. */
	wordsPerSentence: number;
	/** Mean letters per word — the other half. */
	charactersPerWord: number;
	/** False when there was too little text to score; every number above is then 0/N-A. */
	hasContent: boolean;
};

/**
 * The extension's text cleanup, applied before any counting.
 *
 * Only `http(s)://` addresses are stripped, NOT bare `www.` ones -- an asymmetry
 * with the raw-URL check in `textChecks.ts`, which recognises both. It is the
 * extension's asymmetry, transcribed rather than corrected, because the whole
 * point of this module is that both tools report one number and a bare `www.`
 * address would otherwise score differently in each. There are none in the
 * corpus today. Worth revisiting if that changes, as a deliberate divergence.
 *
 * Three of these materially move the score and are easy to drop by accident:
 * URLs, email addresses and bare integers are all REMOVED. An ARI that counts
 * `https://sf.gov/report-rats-mice-four-legged-problems` as one 52-letter word
 * reports college level for a page written at 6th grade, and "72" as a word
 * shortens the mean word length in the other direction. Smart quotes and en/em
 * dashes are folded to ASCII so the letter count does not depend on which
 * editor typed the copy.
 */
export function normalizeForReadability(raw: string): string {
	return raw
		.replace(/[ \t]+/g, ' ')
		.replace(/\n[ \t]+/g, '\n')
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.replace(/["“”‘’]/g, '"')
		.replace(/[–—]/g, '-')
		.replace(/https?:\/\/[^\s]+/g, '')
		.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '')
		.replace(/\b\d+\b/g, '')
		.replace(/[ \t]+/g, ' ')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

const EMPTY: Readability = {
	score: 0,
	gradeLevel: 'N/A',
	interpretation: 'Not enough text to analyze',
	recommendation: '',
	factors: [],
	characterCount: 0,
	wordCount: 0,
	sentenceCount: 0,
	instructional: false,
	resplitApplied: false,
	wordsPerSentence: 0,
	charactersPerWord: 0,
	hasContent: false
};

function gradeLabel(score: number): { gradeLevel: string; interpretation: string } {
	if (score < 1)
		return { gradeLevel: 'Kindergarten', interpretation: 'Very easy to read for all ages' };
	if (score < 2)
		return { gradeLevel: '1st Grade', interpretation: 'Very easy to read for ages 6-7' };
	if (score < 3)
		return { gradeLevel: '2nd Grade', interpretation: 'Very easy to read for ages 7-8' };
	if (score < 4) return { gradeLevel: '3rd Grade', interpretation: 'Easy to read for ages 8-9' };
	if (score < 5) return { gradeLevel: '4th Grade', interpretation: 'Easy to read for ages 9-10' };
	if (score < 6)
		return { gradeLevel: '5th Grade', interpretation: 'Fairly easy to read for ages 10-11' };
	if (score < 7)
		return { gradeLevel: '6th Grade', interpretation: 'Fairly easy to read for ages 11-12' };
	if (score < 8)
		return { gradeLevel: '7th Grade', interpretation: 'Fairly easy to read for ages 12-13' };
	if (score < 9)
		return {
			gradeLevel: '8th Grade',
			interpretation: 'Plain English, easily understood by 13-14 year olds'
		};
	if (score < 10)
		return { gradeLevel: '9th Grade', interpretation: 'Fairly difficult to read for ages 14-15' };
	if (score < 11)
		return { gradeLevel: '10th Grade', interpretation: 'Fairly difficult to read for ages 15-16' };
	if (score < 12)
		return { gradeLevel: '11th Grade', interpretation: 'Difficult to read for ages 16-17' };
	if (score < 13)
		return { gradeLevel: '12th Grade', interpretation: 'Difficult to read for ages 17-18' };
	if (score < 14)
		return { gradeLevel: 'College', interpretation: 'Very difficult to read, college level' };
	return {
		gradeLevel: 'Post-graduate',
		interpretation: 'Very difficult to read, professional level'
	};
}

function recommendationFor(score: number): string {
	if (score <= 6) return 'Excellent! Very readable for a general audience.';
	if (score <= 9) return 'Good readability. Most adults can read this easily.';
	if (score <= 13) return 'Fairly difficult. Consider simplifying sentences and word choices.';
	return 'Very difficult to read. Significant simplification needed for broader accessibility.';
}

function factorsFor(wordsPerSentence: number, charsPerWord: number, sentences: number): string[] {
	const factors: string[] = [];

	if (wordsPerSentence <= 12)
		factors.push('Keep using short sentences - they make your content easy to read');
	else if (wordsPerSentence <= 18)
		factors.push('Try breaking up some longer sentences to improve readability');
	else if (wordsPerSentence <= 25)
		factors.push('Break up long sentences - aim for 15 words or fewer per sentence');
	else factors.push('Your sentences are too long - split them into shorter, clearer sentences');

	if (charsPerWord <= 4.5)
		factors.push('Good use of simple, everyday words that everyone can understand');
	else if (charsPerWord <= 5.2)
		factors.push('Replace complex words with simpler alternatives when possible');
	else if (charsPerWord <= 6)
		factors.push('Use shorter, more common words instead of complex vocabulary');
	else factors.push('Simplify your vocabulary - choose everyday words over technical terms');

	if (sentences < 10) factors.push('Your brief, focused content is easy for readers to follow');
	else if (sentences > 50)
		factors.push('Consider breaking long content into sections with clear headings');

	return factors;
}

/**
 * Score already-extracted page text.
 *
 * `text` is expected to have been through `normalizeForReadability`; passing raw
 * text is not an error but will score differently, because the URL and number
 * stripping above is part of the measurement rather than cosmetic.
 */
export function scoreReadability(text: string): Readability {
	if (!text.trim()) return EMPTY;

	const characterCount = text.replace(/[^a-zA-Z]/g, '').length;
	const wordCount = text
		.split(/\s+/)
		.map((w) => w.replace(/[^\w]/g, ''))
		.filter((w) => w.length > 0 && /^[a-zA-Z]+$/.test(w)).length;

	let sentences = text
		.split(/[.!?]+|\n{2,}/)
		.map((s) => s.trim())
		.filter((s) => s.length > 0);

	if (sentences.length === 0 || wordCount === 0) return EMPTY;

	// The instructional test runs against the RAW sentence split, before any
	// re-splitting, so the decision cannot be influenced by its own effect.
	const meanWordsPerRawSentence = wordCount / sentences.length;
	const instructional =
		INSTRUCTIONAL_CUE.test(text) && LIST_MARKER.test(text) && meanWordsPerRawSentence < 12;

	let resplitApplied = false;
	if (instructional) {
		const resplit: string[] = [];
		for (const sentence of sentences) {
			resplit.push(
				...sentence
					.split(INSTRUCTIONAL_SPLIT)
					.map((s) => s.trim())
					.filter((s) => s.length > 0)
			);
		}
		// Guarded twice on purpose: the re-split is only accepted if it actually
		// found more units AND they are still substantial (>= 8 words each). A
		// split that shreds prose into fragments would report a flatteringly low
		// grade for copy that has not changed.
		if (resplit.length > sentences.length && wordCount / resplit.length >= 8) {
			sentences = resplit;
			resplitApplied = true;
		}
	}

	// Fragments below the floor are dropped rather than counted as sentences —
	// a bare "Free" or "Yes" would otherwise pull words-per-sentence down hard.
	const minWords = instructional ? 3 : 5;
	const counted = sentences.filter(
		(s) => s.split(/\s+/).filter((w) => /[a-zA-Z]/.test(w)).length >= minWords
	);
	const sentenceCount = counted.length;
	if (sentenceCount === 0) return EMPTY;

	const charactersPerWord = characterCount / wordCount;
	const wordsPerSentence = wordCount / sentenceCount;

	const ari = 4.71 * charactersPerWord + 0.5 * wordsPerSentence - 21.43;

	// The "adjustment for sentence complexity" the help center mentions. Only
	// instructional copy gets it, and only when its sentences are genuinely short.
	let adjustment = 0;
	if (instructional && wordsPerSentence < 8) adjustment = 0.5;
	else if (instructional && wordsPerSentence < 10) adjustment = 0.2;

	const score = Math.round(Math.max(0, ari - adjustment));
	const { gradeLevel, interpretation } = gradeLabel(score);

	return {
		score,
		gradeLevel,
		interpretation,
		recommendation: recommendationFor(score),
		factors: factorsFor(wordsPerSentence, charactersPerWord, sentenceCount),
		characterCount,
		wordCount,
		sentenceCount,
		instructional,
		resplitApplied,
		wordsPerSentence,
		charactersPerWord,
		hasContent: true
	};
}

/**
 * The grade a page's own corpus module declares as its target, as a number.
 *
 * Every `src/lib/data/*.ts` module carries a `reading` field — `'Grade 6'` on
 * most of them — and until now nothing verified it; it was an assertion in a
 * data file that no code read. Karl Jr. cannot check this at all, because a
 * live SF.gov page carries no target to check against. This is the one piece of
 * the readability surface that is better here than in the extension.
 *
 * Returns null for a value this cannot parse, which the panel renders as "no
 * target declared" rather than silently comparing against a default.
 */
export function parseReadingTarget(reading: unknown): number | null {
	if (typeof reading !== 'string') return null;
	const match = reading.match(/(\d{1,2})/);
	if (match) {
		const grade = Number(match[1]);
		return Number.isFinite(grade) && grade >= 0 && grade <= 20 ? grade : null;
	}
	if (/kindergarten/i.test(reading)) return 0;
	return null;
}
