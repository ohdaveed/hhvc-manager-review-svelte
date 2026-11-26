/**
 * Fails when `corpus.lock` does not match the corpus in the tree.
 *
 *   bun run corpus:check
 *
 * Runs in CI with no database access. A mismatch means someone changed
 * src/lib/data without running `bun run corpus:lock` -- that is: the
 * committed lockfile no longer matches the corpus in the tree. This check
 * enforces only that; it writes nothing to the hosted version history, and
 * running `bun run corpus:lock` silences it without importing anything.
 *
 * The decision itself is `verifyCorpusLock` in src/lib/corpus/lock.ts, which
 * `scripts/corpus-import.ts` calls too -- so a lock this check passes is
 * exactly the lock the import records, hash for hash.
 */
import { readFileSync } from 'node:fs';
import { allPages } from '../src/lib/data/index.js';
import { verifyCorpusLock } from '../src/lib/corpus/lock.js';

let parsed: unknown;
try {
	parsed = JSON.parse(readFileSync(new URL('../corpus.lock', import.meta.url), 'utf8'));
} catch {
	console.error('corpus.lock is missing or unreadable. Run: bun run corpus:lock');
	process.exit(1);
}

const verdict = verifyCorpusLock(parsed, allPages);

if (verdict.ok) {
	console.log(`corpus.lock matches — ${Object.keys(verdict.lock.pages).length} pages.`);
	process.exit(0);
}

switch (verdict.kind) {
	case 'version':
		console.error(`corpus.lock has version ${JSON.stringify(verdict.version)}, expected 1.`);
		console.error('This checker only understands v1 lockfile semantics — investigate the file.');
		break;
	case 'malformed':
		console.error(
			'corpus.lock is malformed: "pages" is missing entries, content hashes, or has field hash values that are not 64-character hex.'
		);
		console.error('Investigate the file — this is not ordinary drift. Run: bun run corpus:lock');
		break;
	case 'inconsistent':
		console.error('corpus.lock is internally inconsistent: its own "pages" manifest');
		console.error(`does not hash to its "corpusHash" (recomputed ${verdict.recomputedHash}).`);
		console.error('This is file corruption, not ordinary drift — investigate the file');
		console.error('(e.g. a hand-resolved merge conflict) rather than just re-running');
		console.error('bun run corpus:lock.');
		break;
	case 'stale':
		console.error('corpus.lock is out of date. Run: bun run corpus:lock');
		if (verdict.added.length) console.error(`  added:   ${verdict.added.join(', ')}`);
		if (verdict.removed.length) console.error(`  removed: ${verdict.removed.join(', ')}`);
		if (verdict.changed.length) console.error(`  changed: ${verdict.changed.join(', ')}`);
		break;
}
process.exit(1);
