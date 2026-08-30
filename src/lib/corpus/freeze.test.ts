import { describe, expect, it } from 'vitest';
import { freezeFieldIds, freezeFieldHashes } from './freeze.js';
import { hashText } from './hash.js';
import { extractFields } from './fields.js';
import { allPages } from '../data/index.js';

/** A ledger in the shape the lock stores: frozen id -> sha256(text). */
const ledger = (fields: Record<string, string>): Record<string, string> =>
	Object.fromEntries(Object.entries(fields).map(([id, text]) => [id, hashText(text)]));

const P = 'sections.how-to-apply.paragraphs';

describe('freezeFieldIds', () => {
	it('keeps every id when nothing changed', () => {
		const fields = { [`${P}.0`]: 'First', [`${P}.1`]: 'Second' };

		expect(freezeFieldIds(ledger(fields), fields)).toEqual({
			[`${P}.0`]: `${P}.0`,
			[`${P}.1`]: `${P}.1`
		});
	});

	it('treats a first import, with no ledger, as all-new', () => {
		const fields = { [`${P}.0`]: 'First' };

		expect(freezeFieldIds({}, fields)).toEqual({ [`${P}.0`]: `${P}.0` });
	});

	// The case the whole module exists for. Inserting at the top renumbers
	// every later paragraph; without content matching, the edit saved against
	// "First" would reattach to "Inserted".
	it('carries ids through an insertion rather than shifting them', () => {
		const before = { [`${P}.0`]: 'First', [`${P}.1`]: 'Second' };
		const after = { [`${P}.0`]: 'Inserted', [`${P}.1`]: 'First', [`${P}.2`]: 'Second' };

		const frozen = freezeFieldIds(ledger(before), after);

		expect(frozen[`${P}.1`]).toBe(`${P}.0`); // 'First' kept its id
		expect(frozen[`${P}.2`]).toBe(`${P}.1`); // 'Second' kept its id
		expect(frozen[`${P}.0`]).toBe(`${P}.0~2`); // 'Inserted' is new
	});

	it('keeps the id of copy edited in place, which no content match can find', () => {
		const before = { [`${P}.0`]: 'First', [`${P}.1`]: 'Second' };
		const after = { [`${P}.0`]: 'First, rewritten', [`${P}.1`]: 'Second' };

		expect(freezeFieldIds(ledger(before), after)[`${P}.0`]).toBe(`${P}.0`);
	});

	it('survives a reorder', () => {
		const before = { [`${P}.0`]: 'Alpha', [`${P}.1`]: 'Beta' };
		const after = { [`${P}.0`]: 'Beta', [`${P}.1`]: 'Alpha' };

		const frozen = freezeFieldIds(ledger(before), after);

		expect(frozen[`${P}.0`]).toBe(`${P}.1`);
		expect(frozen[`${P}.1`]).toBe(`${P}.0`);
	});

	// Two candidates hold the same text, so there is no evidence which is
	// which. Minting loses the association; guessing would file an edit
	// against the wrong paragraph.
	it('mints rather than guessing when duplicate text makes the match ambiguous', () => {
		const before = { [`${P}.0`]: 'Call 311', [`${P}.1`]: 'Call 311' };
		const after = { [`${P}.0`]: 'New', [`${P}.1`]: 'Call 311', [`${P}.2`]: 'Call 311' };

		const frozen = freezeFieldIds(ledger(before), after);

		expect(frozen[`${P}.0`]).not.toBe(`${P}.0`);
		expect(new Set(Object.values(frozen)).size).toBe(3);
	});

	it('never issues the same frozen id to two fields', () => {
		const before = { a: 'one', b: 'two', c: 'three' };
		const after = { a: 'three', b: 'one', c: 'brand new', d: 'two' };

		const frozen = freezeFieldIds(ledger(before), after);

		expect(new Set(Object.values(frozen)).size).toBe(Object.keys(after).length);
	});

	it('does not depend on key order', () => {
		const before = { [`${P}.0`]: 'First', [`${P}.1`]: 'Second' };
		const after = { [`${P}.1`]: 'First', [`${P}.0`]: 'Inserted', [`${P}.2`]: 'Second' };
		const reversed = Object.fromEntries(Object.entries(after).reverse());

		expect(freezeFieldIds(ledger(before), after)).toEqual(freezeFieldIds(ledger(before), reversed));
	});
});

describe('freezeFieldHashes', () => {
	it('re-keys the hashes by frozen id, so the next import reads what this one wrote', () => {
		const before = { [`${P}.0`]: 'First' };
		const after = { [`${P}.0`]: 'Inserted', [`${P}.1`]: 'First' };

		const next = freezeFieldHashes(after, freezeFieldIds(ledger(before), after));

		expect(next[`${P}.0`]).toBe(hashText('First'));
		expect(next[`${P}.0~2`]).toBe(hashText('Inserted'));
	});

	it('round-trips: freezing twice over an unchanged page is a fixed point', () => {
		const fields = { [`${P}.0`]: 'First', [`${P}.1`]: 'Second' };
		const first = freezeFieldHashes(fields, freezeFieldIds({}, fields));

		expect(freezeFieldIds(first, fields)).toEqual({
			[`${P}.0`]: `${P}.0`,
			[`${P}.1`]: `${P}.1`
		});
	});
});

describe('over the real corpus', () => {
	it('is identity for every page when the corpus has not moved', () => {
		let checked = 0;
		for (const page of allPages) {
			const fields = extractFields(page);
			const frozen = freezeFieldIds(ledger(fields), fields);
			for (const id of Object.keys(fields)) expect(frozen[id]).toBe(id);
			checked += Object.keys(fields).length;
		}

		expect(checked).toBeGreaterThan(500);
	});
});
