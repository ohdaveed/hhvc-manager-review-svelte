/**
 * `corpus:import` must record the committed `corpus.lock`, hash for hash.
 *
 * It used not to: the import called `buildLock(allPages)` with no previous
 * lock, so it minted fresh field ids and a different `corpusHash` for the
 * identical corpus (lock `a91786fcd1b4…`, import `bc89dbc708bf…`, measured
 * 2026-11-26 at a7d93f0). `corpus_versions.corpus_hash` could never equal the
 * lock, and the import's idempotency lookup keyed on a hash nothing else
 * computed.
 *
 * The import script cannot be loaded here -- it opens a Postgres connection at
 * module scope -- so this pins it in two halves: the function it now calls
 * returns the committed lock for the real corpus, and the script calls that
 * function rather than a ledger-less `buildLock`. A `.spec.ts` under `tests/`
 * runs in the node project, which `readFileSync` needs.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { allPages } from '../src/lib/data/index.js';
import { buildLock, verifyCorpusLock, type CorpusLock } from '../src/lib/corpus/lock.js';

const committed = JSON.parse(
	readFileSync(new URL('../corpus.lock', import.meta.url), 'utf8')
) as CorpusLock;
/** Code lines only: the script's own comments explain the old `buildLock(allPages)` call. */
const codeOf = (source: string) =>
	source
		.split('\n')
		.filter((line) => !/^\s*(\/\*\*?|\*|\/\/)/.test(line))
		.join('\n');
const importSource = codeOf(
	readFileSync(new URL('../scripts/corpus-import.ts', import.meta.url), 'utf8')
);
const lockSource = readFileSync(new URL('../scripts/corpus-lock.ts', import.meta.url), 'utf8');

describe('corpus:import and corpus.lock', () => {
	it("records exactly corpus.lock's corpusHash for the corpus in the tree", () => {
		const verdict = verifyCorpusLock(committed, allPages);
		expect(verdict.ok).toBe(true);
		if (!verdict.ok) return;
		expect(verdict.lock.corpusHash).toBe(committed.corpusHash);
		expect(verdict.lock.pages).toEqual(committed.pages);
	});

	it('writes field hashes for every corpus page from the lock', () => {
		const verdict = verifyCorpusLock(committed, allPages);
		if (!verdict.ok) throw new Error(`corpus.lock is ${verdict.kind}`);
		expect(Object.keys(verdict.lock.pages)).toHaveLength(allPages.length);
	});

	it('agrees with what corpus:lock would write, so the two scripts cannot diverge', () => {
		// corpus:lock is `buildLock(allPages, previous)`; on a current lock it is
		// a fixed point, and that is the lock the import records.
		expect(lockSource).toMatch(/buildLock\(allPages, previous\)/);
		expect(buildLock(allPages, committed)).toEqual(committed);
	});

	it('takes its lock from verifyCorpusLock, never from a ledger-less buildLock', () => {
		expect(importSource).toMatch(/verifyCorpusLock\(parsedLock, allPages\)/);
		expect(importSource).not.toMatch(/\bbuildLock\s*\(/);
	});
});
