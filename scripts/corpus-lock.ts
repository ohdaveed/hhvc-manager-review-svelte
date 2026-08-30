/**
 * Writes `corpus.lock` from the static corpus.
 *
 *   bun run corpus:lock
 *
 * The lockfile exists because CI has no Supabase credentials -- `pr.yml` sets
 * placeholder values so fork PRs keep building. A check that asked the database
 * "is this corpus imported?" could not run there. Comparing the built corpus to
 * a committed manifest needs no network at all, and it makes a corpus change
 * visible in the diff.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { allPages } from '../src/lib/data/index.js';
import { buildLock, type CorpusLock } from '../src/lib/corpus/lock.js';

const lockPath = new URL('../corpus.lock', import.meta.url);

/**
 * The lock we are about to overwrite is also the id ledger for the one we
 * write: a field whose copy has not changed keeps the id it was frozen under.
 * A missing or unreadable file is a first import, not an error -- every field
 * is then new, which is exactly what an absent ledger means.
 */
let previous: CorpusLock | undefined;
try {
	previous = JSON.parse(readFileSync(lockPath, 'utf8')) as CorpusLock;
} catch {
	previous = undefined;
}

const lock = buildLock(allPages, previous);
writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
console.log(
	`Wrote corpus.lock — ${Object.keys(lock.pages).length} pages, ${lock.corpusHash.slice(0, 12)}.`
);
