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
import { writeFileSync } from 'node:fs';
import { allPages } from '../src/lib/data/index.js';
import { buildLock } from '../src/lib/corpus/lock.js';

const lock = buildLock(allPages);
writeFileSync(new URL('../corpus.lock', import.meta.url), JSON.stringify(lock, null, 2) + '\n');
console.log(
	`Wrote corpus.lock — ${Object.keys(lock.pages).length} pages, ${lock.corpusHash.slice(0, 12)}.`
);
