/**
 * Records the current corpus as a version in the hosted database.
 *
 *   bun run corpus:import
 *
 * Run this after re-porting mockups from the vanilla app. It is idempotent:
 * a pre-insert lookup on corpus_versions.corpus_hash short-circuits a re-run
 * against an unchanged corpus and reports "unchanged" rather than minting a
 * duplicate version. That lookup and the RPC call below are separate,
 * non-locking requests, so two concurrent runs can both pass the lookup and
 * both call the RPC -- the corpus_hash UNIQUE constraint then rejects the
 * loser with a 23505 (unique_violation), which is caught below and treated
 * as the same idempotent "already imported" outcome, just discovered later
 * and by a different mechanism than the pre-insert lookup.
 *
 * Uses the service-role key, which bypasses RLS -- the same pattern as
 * scripts/sync-checks.ts. Bun loads .env.local automatically.
 */
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'node:child_process';
import { allPages } from '../src/lib/data/index.js';
import { buildLock, derivePagePath } from '../src/lib/corpus/lock.js';

const supabaseUrl = process.env.SVELTE_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
	console.error('Missing SVELTE_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

const lock = buildLock(allPages);

const { data: existing, error: lookupError } = await supabase
	.from('corpus_versions')
	.select('id, imported_at')
	.eq('corpus_hash', lock.corpusHash)
	.maybeSingle();

if (lookupError) {
	console.error('Could not query corpus_versions:', lookupError.message);
	process.exit(1);
}

if (existing) {
	// A matching corpus_hash alone doesn't prove this version is complete. The
	// import below now runs as a single transaction (import_corpus_version,
	// supabase/migrations/20260823120000_import_corpus_version_fn.sql), so a
	// *new* run can no longer leave an orphaned corpus_versions row with zero
	// (or partial) page_versions -- but a row from a run that predates that
	// function still could. Verify before declaring "unchanged", or a
	// pre-existing partial import silently and permanently loses its page
	// snapshots on the very next run.
	const { count: pageCount, error: countError } = await supabase
		.from('page_versions')
		.select('id', { count: 'exact', head: true })
		.eq('corpus_version_id', existing.id);

	if (countError) {
		console.error(
			`Could not verify page_versions for existing corpus_versions row ${existing.id}:`,
			countError.message
		);
		process.exit(1);
	}

	if (pageCount === allPages.length) {
		console.log(`Corpus unchanged — already imported at ${existing.imported_at}. Nothing to do.`);
		process.exit(0);
	}

	console.error(
		`Corpus version ${existing.id} (hash ${lock.corpusHash.slice(0, 12)}) already exists but is ` +
			`INCOMPLETE: expected ${allPages.length} page_versions rows, found ${pageCount ?? 0}. This ` +
			`is an orphaned row from a prior partial import. Delete corpus_versions row ${existing.id} ` +
			`(and any of its page_versions rows) before running corpus:import again -- this script will ` +
			`not repair or delete it automatically.`
	);
	process.exit(1);
}

let gitSha: string | null = null;
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
const { data: versionId, error: rpcError } = await supabase.rpc('import_corpus_version', {
	p_git_sha: gitSha,
	p_page_count: allPages.length,
	p_corpus_hash: lock.corpusHash,
	p_note: process.env.CORPUS_NOTE ?? null,
	p_pages: rows
});

// A concurrent run can win the race between the pre-insert lookup above and
// this RPC call: both see "no row" and both call import_corpus_version, and
// the corpus_versions.corpus_hash UNIQUE constraint (20260823060000) rejects
// whichever insert lands second with a 23505 (unique_violation). That is not
// a failed import -- the version this run wanted now exists, just inserted
// by the other run instead. Treat it as "already imported", distinctly from
// the pre-insert-lookup "unchanged" message above so a reader can tell "I
// lost a race" from "there was nothing to do" -- but keep it fatal for any
// other RPC error (e.g. the page_versions (corpus_version_id, path) UNIQUE
// constraint, a NOT NULL failure, or an RLS/permission error), which are
// real failures.
//
// No completeness re-check is needed here the way there is on the pre-insert
// lookup path above: import_corpus_version is transactional, so the winner's
// insert into corpus_versions is only visible -- and only able to conflict on
// the corpus_hash unique index -- once it has committed, at which point its
// page_versions rows are already committed alongside it. The loser's insert
// blocks on that index until the winner commits or rolls back; a rollback
// leaves no row for it to conflict with, so a 23505 here can only mean a
// complete, committed import already exists.
const isConcurrentImportConflict =
	rpcError?.code === '23505' && /corpus_hash/i.test(rpcError.message ?? '');

if (isConcurrentImportConflict) {
	console.log(
		`Corpus version already imported by a concurrent run — hash ${lock.corpusHash.slice(0, 12)} lost the race. Nothing to do.`
	);
	process.exit(0);
}

if (rpcError || !versionId) {
	console.error('Could not import corpus version:', rpcError?.message);
	process.exit(1);
}

console.log(
	`Imported corpus version ${versionId} — ${rows.length} pages, hash ${lock.corpusHash.slice(0, 12)}, git ${gitSha?.slice(0, 12) ?? 'unknown'}.`
);
