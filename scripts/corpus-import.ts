/**
 * Records the current corpus as a version in the hosted database.
 *
 *   bun run corpus:import
 *
 * Run this after re-porting mockups from the vanilla app. It is idempotent:
 * corpus_versions.corpus_hash is UNIQUE, so re-running against an unchanged
 * corpus reports "unchanged" rather than minting a duplicate version.
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
	console.log(`Corpus unchanged — already imported at ${existing.imported_at}. Nothing to do.`);
	process.exit(0);
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
			`again. A re-run will NOT fail on the corpus_hash UNIQUE constraint -- it will find this ` +
			`same-hash row via the lookup above, print "Corpus unchanged", and exit 0, silently ` +
			`leaving this zero-page version in place. Delete row ${version.id} from corpus_versions ` +
			`first.`
	);
	process.exit(1);
}

console.log(
	`Imported corpus version ${version.id} — ${rows.length} pages, hash ${lock.corpusHash.slice(0, 12)}, git ${gitSha?.slice(0, 12) ?? 'unknown'}.`
);
