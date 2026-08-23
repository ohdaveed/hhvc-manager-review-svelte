/**
 * Fails when `corpus.lock` does not match the corpus in the tree.
 *
 *   bun run corpus:check
 *
 * Runs in CI with no database access. A mismatch means someone changed
 * src/lib/data without running `bun run corpus:lock` -- that is: the
 * committed lockfile no longer matches the corpus in the tree. This check
 * enforces only that; it does not itself do anything to a hosted version
 * history (no import script consumes this lockfile yet, and running
 * `bun run corpus:lock` silences this check without importing anything).
 */
import { readFileSync } from 'node:fs';
import { allPages } from '../src/lib/data/index.js';
import {
	buildLock,
	hashLockPages,
	isValidFieldHashMap,
	type CorpusLock
} from '../src/lib/corpus/lock.js';

const CONTENT_HASH_PATTERN = /^[0-9a-f]{64}$/;

const expected = buildLock(allPages);

let actual: CorpusLock;
try {
	actual = JSON.parse(readFileSync(new URL('../corpus.lock', import.meta.url), 'utf8'));
} catch {
	console.error('corpus.lock is missing or unreadable. Run: bun run corpus:lock');
	process.exit(1);
}

// Check the file's format version before anything about its shape: a future
// v2 lockfile is free to change what "pages" looks like, so validating shape
// first would report a v2 file as malformed under v1 rules instead of naming
// the real problem.
if (actual.version !== 1) {
	console.error(`corpus.lock has version ${JSON.stringify(actual.version)}, expected 1.`);
	console.error('This checker only understands v1 lockfile semantics — investigate the file.');
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
	Array.isArray(actual.pages) ||
	Object.values(actual.pages).some(
		(entry) =>
			entry === null ||
			typeof entry !== 'object' ||
			typeof entry.contentHash !== 'string' ||
			!CONTENT_HASH_PATTERN.test(entry.contentHash) ||
			!isValidFieldHashMap(entry.fieldHashes)
	)
) {
	console.error(
		'corpus.lock is malformed: "pages" is missing entries, content hashes, or has field hash values that are not 64-character hex.'
	);
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
