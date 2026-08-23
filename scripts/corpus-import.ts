/**
 * Records the current corpus as a version in the hosted database.
 *
 *   bun run corpus:import
 *
 * Run this after re-porting mockups from the vanilla app. It is idempotent:
 * a pre-insert lookup on corpus_versions.corpus_hash short-circuits a re-run
 * against an unchanged corpus and reports "unchanged" rather than minting a
 * duplicate version. The corpus_hash UNIQUE constraint is a backstop, not
 * the mechanism -- the lookup finds the existing row before the constraint
 * would ever be reached.
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
	// A matching corpus_hash alone doesn't prove this version is complete -- a
	// prior run can leave an orphaned corpus_versions row with zero (or partial)
	// page_versions if the second insert below failed. Verify before declaring
	// "unchanged", or a partial import silently and permanently loses its page
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

const { data: version, error: versionError } = await supabase
	.from('corpus_versions')
	.insert({
		git_sha: gitSha,
		page_count: allPages.length,
		corpus_hash: lock.corpusHash,
		note: process.env.CORPUS_NOTE ?? null
	})
	.select('id')
	.single();

if (versionError || !version) {
	console.error('Could not insert corpus_versions:', versionError?.message);
	process.exit(1);
}

const rows = allPages.map((page) => {
	const path = derivePagePath(page);
	const entry = lock.pages[path];
	return {
		corpus_version_id: version.id,
		path,
		content: page,
		content_hash: entry.contentHash,
		field_hashes: entry.fieldHashes
	};
});

const { error: pagesError } = await supabase.from('page_versions').insert(rows);

if (pagesError) {
	console.error('Could not insert page_versions:', pagesError.message);
	console.error(
		`ORPHAN ROW WARNING: corpus_versions row ${version.id} was created but its page_versions ` +
			`did not write. This needs manual cleanup: delete that row before running corpus:import ` +
			`again. A re-run WILL be caught by the completeness check above -- it will find this ` +
			`same-hash row, see its page_versions count doesn't match, and exit non-zero instead of ` +
			`silently reporting "Corpus unchanged". Delete row ${version.id} from corpus_versions ` +
			`first so a clean re-import can proceed.`
	);
	process.exit(1);
}

console.log(
	`Imported corpus version ${version.id} — ${rows.length} pages, hash ${lock.corpusHash.slice(0, 12)}, git ${gitSha?.slice(0, 12) ?? 'unknown'}.`
);
