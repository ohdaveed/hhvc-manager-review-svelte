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
import { buildLock, type CorpusLock } from '../src/lib/corpus/lock.js';

const expected = buildLock(allPages);

let actual: CorpusLock;
try {
	actual = JSON.parse(readFileSync(new URL('../corpus.lock', import.meta.url), 'utf8'));
} catch {
	console.error('corpus.lock is missing or unreadable. Run: bun run corpus:lock');
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
