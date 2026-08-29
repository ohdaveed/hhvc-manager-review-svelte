import { describe, it, expect } from 'vitest';
import { normalizeForReadability, parseReadingTarget, scoreReadability } from './readability';

describe('normalizeForReadability', () => {
	it('strips URLs, so a long link does not read as one long word', () => {
		const withUrl = normalizeForReadability(
			'Report it at https://sf.gov/report-rats-mice-four-legged-problems today.'
		);
		expect(withUrl).not.toContain('https');
		expect(withUrl).toContain('Report it at');
	});

	it('strips email addresses and bare numbers', () => {
		const cleaned = normalizeForReadability('Email ds.support@sfgov.org within 72 hours.');
		expect(cleaned).not.toContain('@');
		expect(cleaned).not.toMatch(/\d/);
	});

	it('folds smart quotes and dashes to ASCII so letter counts do not depend on the editor', () => {
		expect(normalizeForReadability('“wait” — then act')).toBe('"wait" - then act');
	});
});

describe('scoreReadability', () => {
	it('reports no content for empty text rather than a zero score', () => {
		const result = scoreReadability('');
		expect(result.hasContent).toBe(false);
		expect(result.gradeLevel).toBe('N/A');
	});

	it('reports no content when every sentence is below the length floor', () => {
		// Three two-word fragments: nothing reaches the 5-word minimum, and a
		// score computed off them would be meaningless rather than merely low.
		const result = scoreReadability('Free today. Yes now. No cost.');
		expect(result.hasContent).toBe(false);
	});

	it('scores plain short sentences well below college level', () => {
		const result = scoreReadability(
			'You can report a problem. Tell us where it is. We will send an inspector. ' +
				'The visit is free. You do not need to give your name.'
		);
		expect(result.hasContent).toBe(true);
		expect(result.score).toBeLessThanOrEqual(6);
	});

	it('scores dense administrative prose far higher than plain copy', () => {
		const plain = scoreReadability(
			'You can report a problem. Tell us where it is. We will send an inspector. The visit is free.'
		);
		const dense = scoreReadability(
			'Notwithstanding the aforementioned administrative determination, responsible parties ' +
				'shall undertake remediation activities consistent with applicable environmental ' +
				'health regulations promulgated thereunder by the department.'
		);
		expect(dense.score).toBeGreaterThan(plain.score);
	});

	it('takes the instructional path for step-and-bullet copy and says so', () => {
		const result = scoreReadability(
			'What to do\n\n' +
				'- Notify your landlord: Tell the property owner about the problem.\n' +
				'- Give them 72 hours: If they do not start fixing it, report to the City.\n' +
				'- Urgent problems: If there is danger to health, report it right away.\n' +
				'You must give the address. You can report anonymously.'
		);
		expect(result.instructional).toBe(true);
	});

	it('leaves ordinary prose off the instructional path', () => {
		const result = scoreReadability(
			'The department inspects housing across the city. Inspectors look for conditions ' +
				'that affect health. They write a report after each visit. The report goes to the owner.'
		);
		expect(result.instructional).toBe(false);
	});

	it('carries the counts that produced the score, so a number can be argued with', () => {
		const result = scoreReadability(
			'You can report a problem today. Tell us where the problem is.'
		);
		expect(result.wordCount).toBeGreaterThan(0);
		expect(result.sentenceCount).toBeGreaterThan(0);
		expect(result.charactersPerWord).toBeGreaterThan(0);
		expect(result.wordsPerSentence).toBeGreaterThan(0);
	});

	it('always offers a sentence-length and a word-length factor', () => {
		const result = scoreReadability(
			'You can report a problem today. Tell us where the problem is.'
		);
		expect(result.factors.length).toBeGreaterThanOrEqual(2);
	});
});

describe('parseReadingTarget', () => {
	it('reads the corpus "Grade 6" form', () => {
		expect(parseReadingTarget('Grade 6')).toBe(6);
	});

	it('reads kindergarten as grade 0', () => {
		expect(parseReadingTarget('Kindergarten')).toBe(0);
	});

	it('returns null for a value it cannot parse, rather than defaulting', () => {
		expect(parseReadingTarget('plain language')).toBeNull();
		expect(parseReadingTarget(undefined)).toBeNull();
		expect(parseReadingTarget(6)).toBeNull();
	});

	it('rejects an out-of-range grade', () => {
		expect(parseReadingTarget('Grade 99')).toBeNull();
	});
});

describe('the instructional cue flag versus the re-split', () => {
	// The extension gates the lower sentence floor and the grade adjustment on
	// the CUE flag (`const H=Z?3:5`), not on whether the guarded re-split was
	// accepted. That is preserved here so both tools report one number -- which
	// means the two facts have to be reported separately, or the panel claims a
	// re-split that did not happen. On this corpus that is not hypothetical:
	// 14 pages fire the cues and only 9 accept the re-split.
	const instructional = (text: string) => scoreReadability(text);

	it('reports a re-split when the finer split is accepted', () => {
		const result = instructional(
			'How to report a problem\n\n' +
				'- Call 311 and give the address of the building where the problem is.\n' +
				'- Describe what you saw and how long it has been going on for.\n' +
				'- Ask 311 for a service request number so you can follow up later on.\n' +
				'- Wait for an inspector to contact you about scheduling a visit.'
		);
		expect(result.instructional).toBe(true);
		expect(result.resplitApplied).toBe(true);
	});

	it('fires the cues but rejects a re-split that would shred the copy', () => {
		// Short bullets: the split clears the count guard but not the >= 8 words
		// per segment guard, so `sentences` stands as written. `instructional`
		// is still true, and still lowers the floor -- faithfully.
		const result = instructional(
			'What to do\n\n- Call 311.\n- Give the address.\n- Wait for a visit.\nYou must give the address.'
		);
		expect(result.instructional).toBe(true);
		expect(result.resplitApplied).toBe(false);
	});

	it('never reports a re-split on copy that took the prose path', () => {
		const result = scoreReadability(
			'The department inspects housing across the city. Inspectors look for conditions ' +
				'that affect health. They write a report after each visit. The report goes to the owner.'
		);
		expect(result.instructional).toBe(false);
		expect(result.resplitApplied).toBe(false);
	});

	it('reports no re-split for empty text', () => {
		expect(scoreReadability('').resplitApplied).toBe(false);
	});
});
