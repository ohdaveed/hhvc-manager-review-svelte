/**
 * Records the current corpus as a version in the hosted database.
 *
 *   bun run corpus:import
 *
 * Run this after re-porting mockups from the vanilla app. It is idempotent:
 * a pre-insert lookup on corpus_versions.corpus_hash short-circuits a re-run
 * against an unchanged corpus and reports "unchanged" rather than minting a
 * duplicate version. That lookup and the import call below are separate,
 * non-locking statements, so two concurrent runs can both pass the lookup and
 * both call the function -- the corpus_hash UNIQUE constraint then rejects the
 * loser with a 23505 (unique_violation), which is caught below and treated
 * as the same idempotent "already imported" outcome, just discovered later
 * and by a different mechanism than the pre-insert lookup.
 *
 * **Connects directly to Postgres, not through PostgREST.** `import_corpus_version`
 * lives in the `private` schema as of 20260828100000, and PostgREST serves only
 * the schemas in `[api] schemas` -- so `supabase.rpc()` cannot reach it, which
 * is the entire point of moving it there (PLAN.md G4). One consequence worth
 * knowing: this script now needs `SUPABASE_DB_URL` and no longer needs
 * `SUPABASE_SERVICE_ROLE_KEY`. Both are managed by `bun run env:local` /
 * `env:hosted`, so they move together -- see scripts/env-target.ts.
 */
import { Client } from 'pg';
import { execSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { allPages } from '../src/lib/data/index.js';
import { buildLock, derivePagePath, isValidFieldHashMap, type CorpusLock } from '../src/lib/corpus/lock.js';

const connectionString = process.env.SUPABASE_DB_URL;

if (!connectionString) {
	console.error(
		'Missing SUPABASE_DB_URL in .env.local. Run `bun run env:status` to see which target is active, ' +
			'and `bun run env:local` or `bun run env:hosted` to set all four variables together.'
	);
	process.exit(1);
}

const isLocal = /^(127\.0\.0\.1|localhost)$/.test(new URL(connectionString).hostname);
const client = new Client({
	connectionString,
	ssl: isLocal ? false : { rejectUnauthorized: true }
});

await client.connect();

/** Leaves the connection closed on every exit path, including the failures. */
async function done(code: number): Promise<never> {
	await client.end();
	process.exit(code);
}

let committed: CorpusLock;
try {
	const parsed: unknown = JSON.parse(await readFile(new URL('../corpus.lock', import.meta.url), 'utf8'));
	if (!parsed || typeof parsed !== 'object' || (parsed as CorpusLock).version !== 1 ||
		!(parsed as CorpusLock).pages || !Object.values((parsed as CorpusLock).pages).every((entry) =>
			entry && typeof entry.contentHash === 'string' && isValidFieldHashMap(entry.fieldHashes))) {
		throw new Error('invalid lock shape');
	}
	committed = parsed as CorpusLock;
} catch (error) {
	console.error(`Cannot read or validate committed corpus.lock: ${String(error)}`);
	await done(1);
}

const lock = buildLock(allPages, committed);
if (lock.corpusHash !== committed.corpusHash || JSON.stringify(lock.pages) !== JSON.stringify(committed.pages)) {
	console.error('Rebuilt corpus lock does not match committed corpus.lock; refusing import.');
	await done(1);
}

const existing = await client.query<{ id: string; imported_at: string }>(
	'SELECT id, imported_at FROM public.corpus_versions WHERE corpus_hash = $1',
	[lock.corpusHash]
);

if (existing.rowCount && existing.rowCount > 0) {
	const row = existing.rows[0];

	// A matching corpus_hash alone doesn't prove this version is complete. The
	// import below runs as a single transaction (import_corpus_version,
	// supabase/migrations/20260823120000_import_corpus_version_fn.sql), so a
	// *new* run can no longer leave an orphaned corpus_versions row with zero
	// (or partial) page_versions -- but a row from a run that predates that
	// function still could. Verify before declaring "unchanged", or a
	// pre-existing partial import silently and permanently loses its page
	// snapshots on the very next run.
	const counted = await client.query<{ count: string }>(
		'SELECT count(*)::text AS count FROM public.page_versions WHERE corpus_version_id = $1',
		[row.id]
	);
	const pageCount = Number(counted.rows[0].count);

	if (pageCount === allPages.length) {
		console.log(`Corpus unchanged — already imported at ${row.imported_at}. Nothing to do.`);
		await done(0);
	}

	console.error(
		`Corpus version ${row.id} (hash ${lock.corpusHash.slice(0, 12)}) already exists but is ` +
			`INCOMPLETE: expected ${allPages.length} page_versions rows, found ${pageCount}. This ` +
			`is an orphaned row from a prior partial import. Delete corpus_versions row ${row.id} ` +
			`(and any of its page_versions rows) before running corpus:import again -- this script will ` +
			`not repair or delete it automatically.`
	);
	await done(1);
}

let gitSha: string | null;
try {
	gitSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
} catch {
	gitSha = null;
}

const rows = allPages.map((page) => {
	const path = derivePagePath(page);
	const entry = lock.pages[path];
	return {
		path,
		content: page,
		content_hash: entry.contentHash,
		field_hashes: entry.fieldHashes
	};
});

// Both inserts happen inside import_corpus_version's own PL/pgSQL body
// (supabase/migrations/20260823120000_import_corpus_version_fn.sql), which
// Postgres runs as a single transaction. A failure partway through --
// including the same "row exists but is incomplete" shape the guard above
// was written for -- rolls back the corpus_versions insert along with it, so
// this failure mode is no longer possible for new imports: there is no
// window in which a corpus_versions row can exist without its page_versions.
// The completeness guard above stays, because it can still catch an orphan
// left by a run that predates this function.
try {
	const result = await client.query<{ import_corpus_version: string }>(
		'SELECT private.import_corpus_version($1, $2, $3, $4, $5::jsonb)',
		[
			gitSha,
			allPages.length,
			lock.corpusHash,
			process.env.CORPUS_NOTE ?? null,
			JSON.stringify(rows)
		]
	);

	const versionId = result.rows[0]?.import_corpus_version;
	if (!versionId) {
		console.error('Could not import corpus version: the function returned no id.');
		await done(1);
	}

	console.log(
		`Imported corpus version ${versionId} — ${rows.length} pages, hash ${lock.corpusHash.slice(0, 12)}, git ${gitSha?.slice(0, 12) ?? 'unknown'}.`
	);
	await done(0);
} catch (error) {
	// A concurrent run can win the race between the pre-insert lookup above and
	// this call: both see "no row" and both call import_corpus_version, and the
	// corpus_versions.corpus_hash UNIQUE constraint (20260823060000) rejects
	// whichever insert lands second with a 23505 (unique_violation). That is not
	// a failed import -- the version this run wanted now exists, just inserted
	// by the other run instead. Treat it as "already imported", distinctly from
	// the pre-insert-lookup "unchanged" message above so a reader can tell "I
	// lost a race" from "there was nothing to do" -- but keep it fatal for any
	// other error (e.g. the page_versions (corpus_version_id, path) UNIQUE
	// constraint, a NOT NULL failure, or a permission error), which are real
	// failures.
	//
	// No completeness re-check is needed here the way there is on the pre-insert
	// lookup path above: import_corpus_version is transactional, so the winner's
	// insert into corpus_versions is only visible -- and only able to conflict on
	// the corpus_hash unique index -- once it has committed, at which point its
	// page_versions rows are already committed alongside it. The loser's insert
	// blocks on that index until the winner commits or rolls back; a rollback
	// leaves no row for it to conflict with, so a 23505 here can only mean a
	// complete, committed import already exists.
	const err = error as { code?: string; constraint?: string; message?: string };
	const isConcurrentImportConflict =
		err.code === '23505' && /corpus_hash/i.test(`${err.constraint ?? ''} ${err.message ?? ''}`);

	if (isConcurrentImportConflict) {
		console.log(
			`Corpus version already imported by a concurrent run — hash ${lock.corpusHash.slice(0, 12)} lost the race. Nothing to do.`
		);
		await done(0);
	}

	console.error('Could not import corpus version:', err.message);
	await done(1);
}
