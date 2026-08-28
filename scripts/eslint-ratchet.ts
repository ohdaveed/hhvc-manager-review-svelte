/**
 * eslint ratchet.
 *
 * PLAN.md D1 decided against making eslint blocking: the errors below are
 * pre-existing and unrelated to any scheduled work, so gating every PR on
 * cleaning up code it does not touch is a toll rather than a standard. What
 * D1 did NOT accept is the status quo, where eslint reports without blocking
 * and the count can therefore grow without anyone noticing. This asserts it
 * can only go down.
 *
 * Two things this must not do, both learned rather than assumed:
 *
 * 1. **It must invoke eslint directly, never `bun run lint`.** That script is
 *    `prettier --check . && eslint .`, and the prettier half is red tree-wide,
 *    so eslint never runs at all under it.
 * 2. **It must compare a machine-independent number.** Before
 *    `supabase/.temp/**` was added to eslint's ignores, a machine that had run
 *    `supabase start` counted 213 errors and one that had not counted 5 —
 *    eslint was walking into the running stack's edge-runtime scratch code,
 *    which `includeIgnoreFile` never excluded because that path is ignored by
 *    the CLI's nested `supabase/.gitignore`, not the root one.
 */
import { spawnSync } from 'node:child_process';

/** Measured on 2026-08-28 at the commit that added this script. */
const BASELINE = 5;

type EslintFileResult = { filePath: string; errorCount: number };

const run = spawnSync('bunx', ['eslint', '.', '-f', 'json'], {
	encoding: 'utf-8',
	maxBuffer: 64 * 1024 * 1024
});

// eslint exits 1 when it finds errors, which is the normal path here. Only an
// absent or unparsable report is a failure of the ratchet itself.
if (run.error) {
	console.error(`FAIL  could not run eslint: ${run.error.message}`);
	process.exit(2);
}

let results: EslintFileResult[];
try {
	results = JSON.parse(run.stdout);
} catch {
	console.error('FAIL  eslint produced no parseable JSON report.');
	console.error(run.stderr.slice(0, 2000));
	process.exit(2);
}

const total = results.reduce((n, file) => n + file.errorCount, 0);

if (total > BASELINE) {
	console.error(`FAIL  eslint errors ${total}, baseline ${BASELINE} (+${total - BASELINE}).`);
	console.error('      New errors are not accepted. Fix them, or justify raising the baseline.');
	for (const file of results.filter((f) => f.errorCount > 0)) {
		console.error(`      ${file.errorCount}  ${file.filePath}`);
	}
	process.exit(1);
}

if (total < BASELINE) {
	console.error(`FAIL  eslint errors ${total}, baseline ${BASELINE} (-${BASELINE - total}).`);
	console.error(`      Good news: lower BASELINE to ${total} in scripts/eslint-ratchet.ts.`);
	console.error('      A ratchet that is never tightened is a baseline that only rots.');
	process.exit(1);
}

console.log(`PASS  eslint errors ${total}, at baseline.`);
