import { describe, expect, it } from 'vitest';
import { allPages } from '$lib/data/index';
import { OPEN_QUESTIONS, VERIFIED_FACTS } from './registry';
import { factsPromptBlock } from './prompt';
import { findUnverified } from './unverified';

const key = (f: { slug: string; path: string }) => `${f.slug} :: ${f.path}`;

describe('open questions match the corpus', () => {
	const flagged = findUnverified(allPages as unknown[])
		.map(key)
		.sort();
	const covered = OPEN_QUESTIONS.flatMap((q) => q.fields)
		.map(key)
		.sort();

	// Fails when a flag is added without a question, or cleared without the
	// question being answered and removed. That is the point: the registry and
	// the corpus are two halves of one record.
	it('every unverified corpus field has exactly one open question', () => {
		expect(covered).toEqual(flagged);
	});

	it('no field is claimed by two questions', () => {
		expect(new Set(covered).size).toBe(covered.length);
	});
});

describe('registry integrity', () => {
	const ids = [...VERIFIED_FACTS, ...OPEN_QUESTIONS].map((x) => x.id);

	it('ids are unique kebab-case', () => {
		expect(new Set(ids).size).toBe(ids.length);
		for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
	});

	it('every fact names its source and a real check date', () => {
		for (const f of VERIFIED_FACTS) {
			expect(f.claim.trim(), f.id).not.toBe('');
			expect(f.source.title.trim(), f.id).not.toBe('');
			expect(f.source.location.trim(), f.id).not.toBe('');
			expect(f.checkedBy.trim(), f.id).not.toBe('');
			expect(f.checkedOn, f.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			expect(Number.isNaN(Date.parse(f.checkedOn)), f.id).toBe(false);
		}
	});
});

describe('prompt block', () => {
	const block = factsPromptBlock();

	it('carries every fact and every question', () => {
		for (const f of VERIFIED_FACTS) expect(block).toContain(f.claim);
		for (const q of OPEN_QUESTIONS) expect(block).toContain(q.question);
	});

	// Notes quote the unconfirmed values (a mistyped phone number, placeholder
	// capacities). Sending them would hand the model the text it must not repeat.
	it('never sends a note, or the mockup text of a flagged field', () => {
		for (const q of OPEN_QUESTIONS) if (q.note) expect(block).not.toContain(q.note);
		for (const u of findUnverified(allPages as unknown[])) expect(block).not.toContain(u.text);
		expect(block).not.toContain('415-252-3806');
	});

	it('is empty when there is nothing to say', () => {
		expect(factsPromptBlock([], [])).toBe('');
	});

	it('is byte-stable', () => {
		expect(factsPromptBlock()).toBe(block);
	});
});
