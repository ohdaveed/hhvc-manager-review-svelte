/**
 * Fails when `corpus.lock` does not match the corpus in the tree.
 *
 *   bun run corpus:check
 *
 * Runs in CI with no database access. A mismatch means someone changed
 * src/lib/data without running `bun run corpus:lock`, which would leave the
 * hosted version history missing the change.
 */
import { readFileSync } from 'node:fs';
import { allPages } from '../src/lib/data/index.js';
import { buildLock, hashLockPages, type CorpusLock } from '../src/lib/corpus/lock.js';

const expected = buildLock(allPages);

let actual: CorpusLock;
try {
	actual = JSON.parse(readFileSync(new URL('../corpus.lock', import.meta.url), 'utf8'));
} catch {
	console.error('corpus.lock is missing or unreadable. Run: bun run corpus:lock');
	process.exit(1);
}

// The manifest below is used to diagnose a corpusHash mismatch, and (once a
// later slice adds it) to decide which accepted edits expire. Both uses trust
// `actual.pages` — so before trusting `corpusHash` at all, confirm the file's
// own manifest actually hashes to it. A hand-edited or merge-mangled
// corpus.lock could have a stale pages map paired with a corpusHash that
// still (coincidentally, or because only corpusHash was touched) matches the
// tree; that is a corrupt file, not a stale one, and needs a different fix.
if (
	actual.pages === null ||
	typeof actual.pages !== 'object' ||
	Object.values(actual.pages).some(
		(entry) => entry === null || typeof entry !== 'object' || typeof entry.contentHash !== 'string'
	)
) {
	console.error('corpus.lock is malformed: "pages" is missing entries or content hashes.');
	console.error('Investigate the file — this is not ordinary drift. Run: bun run corpus:lock');
	process.exit(1);
}

const recomputedHash = hashLockPages(actual.pages);
if (recomputedHash !== actual.corpusHash) {
	console.error('corpus.lock is internally inconsistent: its own "pages" manifest');
	console.error(`does not hash to its "corpusHash" (recomputed ${recomputedHash}).`);
	console.error('This is file corruption, not ordinary drift — investigate the file');
	console.error('(e.g. a hand-resolved merge conflict) rather than just re-running');
	console.error('bun run corpus:lock.');
	process.exit(1);
}

if (actual.corpusHash === expected.corpusHash) {
	console.log(`corpus.lock matches — ${Object.keys(expected.pages).length} pages.`);
	process.exit(0);
}

const expectedPaths = new Set(Object.keys(expected.pages));
const actualPaths = new Set(Object.keys(actual.pages ?? {}));

const added = [...expectedPaths].filter((p) => !actualPaths.has(p));
const removed = [...actualPaths].filter((p) => !expectedPaths.has(p));
const changed = [...expectedPaths].filter(
	(p) => actualPaths.has(p) && actual.pages[p].contentHash !== expected.pages[p].contentHash
);

console.error('corpus.lock is out of date. Run: bun run corpus:lock');
if (added.length) console.error(`  added:   ${added.join(', ')}`);
if (removed.length) console.error(`  removed: ${removed.join(', ')}`);
if (changed.length) console.error(`  changed: ${changed.join(', ')}`);
process.exit(1);
