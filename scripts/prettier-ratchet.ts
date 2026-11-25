/**
 * prettier ratchet.
 *
 * `bun run lint` is `prettier --check . && eslint .`, and its prettier half has
 * been red tree-wide for the life of this repo. That is deliberate -- the
 * formatting drift is pre-existing and reformatting the tree as a side effect
 * of unrelated work is exactly what CLAUDE.md tells you not to do. What was
 * never acceptable is the consequence: nothing stopped the count GROWING, so a
 * PR could add newly unformatted files and no gate would say so. The eslint and
 * svelte-check baselines are both ratcheted; this closes the third.
 *
 * It does not make formatting blocking. It asserts the number of unformatted
 * files can only go down.
 *
 * Three things this must not do, all measured rather than assumed:
 *
 * 1. **It must enumerate `git ls-files`, never `.`.** Measured 2026-11-24:
 *    `prettier --list-different .` reported 78 files, of which 28 were in
 *    `.superpowers/` and `.impeccable/` -- local scratch written by agent
 *    tooling. Those directories are untracked but NOT gitignored, so
 *    `.prettierignore` does not exclude them and prettier walks straight in.
 *    The count would then depend on whether you had run a skill locally, which
 *    is the same defect that had the eslint count reading 213 on one machine
 *    and 5 on another. Tracked files are what CI sees and what a fresh clone
 *    has.
 * 2. **It must pass `--ignore-unknown`.** `git ls-files` includes `.png`,
 *    `.webp`, `.sql` and `.toml`; without the flag prettier fails on the first
 *    extension it has no parser for, and the ratchet reports a tooling error
 *    rather than a count.
 * 3. **It must count FILES, not diff lines.** `--list-different` is one path
 *    per line and is stable; a line count would move whenever anyone edited an
 *    already-unformatted file, making the baseline noise rather than a gate.
 *
 * Note `.prettierignore` is still honoured, and carries entries that matter
 * here: `PLAN.md`, on which prettier is non-idempotent, and `supabase/.temp/`,
 * which is the same machine-dependence trap as (1) by a different route.
 */
import { spawnSync } from 'node:child_process';

/**
 * Measured on 2026-11-24 over `git ls-files`, at the commit that added this.
 *
 * Lowered 50 -> 46 in the findings-audit branch: the per-file format hook
 * reformatted four already-unformatted data modules as a side effect of
 * editing their copy. Banked rather than left as slack, per the rule below.
 *
 * Lowered 46 -> 43 when completed plans and specs under `docs/` were deleted;
 * three of them were unformatted.
 */
const BASELINE = 43;

const tracked = spawnSync('git', ['ls-files'], {
	encoding: 'utf-8',
	maxBuffer: 64 * 1024 * 1024
});

if (tracked.error || tracked.status !== 0) {
	console.error(`FAIL  could not list tracked files: ${tracked.error?.message ?? tracked.stderr}`);
	process.exit(2);
}

const files = tracked.stdout.split('\n').filter(Boolean);

if (files.length === 0) {
	console.error('FAIL  git ls-files returned nothing — is this a repository?');
	process.exit(2);
}

const run = spawnSync('bunx', ['prettier', '--list-different', '--ignore-unknown', ...files], {
	encoding: 'utf-8',
	maxBuffer: 64 * 1024 * 1024
});

// prettier exits 1 when files differ, which is the normal path here. Only a
// crash or an unreadable result is a failure of the ratchet itself; exit 2 is
// prettier's own "something went wrong".
if (run.error) {
	console.error(`FAIL  could not run prettier: ${run.error.message}`);
	process.exit(2);
}

if (run.status !== 0 && run.status !== 1) {
	console.error(`FAIL  prettier exited ${run.status}.`);
	console.error(run.stderr.slice(0, 2000));
	process.exit(2);
}

const different = run.stdout.split('\n').filter(Boolean);
const total = different.length;

if (total > BASELINE) {
	console.error(`FAIL  unformatted files ${total}, baseline ${BASELINE} (+${total - BASELINE}).`);
	console.error('      Run `bunx prettier --write <file>` on what you touched.');
	console.error('      Do NOT reformat the tree — see CLAUDE.md on `bun run lint`.');
	for (const file of different) {
		console.error(`      ${file}`);
	}
	process.exit(1);
}

if (total < BASELINE) {
	console.error(`FAIL  unformatted files ${total}, baseline ${BASELINE} (-${BASELINE - total}).`);
	console.error(`      Good news: lower BASELINE to ${total} in scripts/prettier-ratchet.ts.`);
	console.error('      A ratchet that is never tightened is a baseline that only rots.');
	process.exit(1);
}

console.log(`PASS  unformatted files ${total} of ${files.length} tracked, at baseline.`);
