/**
 * svelte-check error ratchet. Fails in BOTH directions: up, because new type
 * errors are not accepted; down, because a baseline nobody tightens only rots.
 *
 * It exists because the documented figure and the measured one had already
 * diverged. CLAUDE.md said 24 and the tree measured 27 — three of them in app
 * code, against a sentence in that same file reading "loose fixture typing in
 * test files, not app code". Nothing failed, because `check` runs in `pr.yml`'s
 * non-blocking `review` job and the number lived only in prose: here and in a
 * workflow comment. eslint has had `lint:ratchet` as a blocking step inside
 * `test & build` since 2026-08-28; this is the same gate for the other baseline.
 *
 * Three things this must not do, two of them learned from the eslint ratchet:
 *
 * 1. **It must pass `--tsconfig`.** svelte-check's own help: with `--tsconfig`,
 *    "only files matched by the files/include/exclude pattern of the config file
 *    are diagnosed." Without it, svelte-check walks every subdirectory of the
 *    workspace except `node_modules`, which would include `supabase/.temp` —
 *    the Supabase CLI's scratch tree, holding `start-secrets/.../docker.env`.
 *    That is exactly how eslint came to count 213 errors on a machine that had
 *    run `supabase start` and 5 on one that had not. `--ignore` is NOT the
 *    answer here: it "only has an effect when using `--no-tsconfig`".
 *    Verified on 2026-11-22 with `start-secrets/` present on disk — zero
 *    diagnostics from that path, because `.svelte-kit/tsconfig.json`'s
 *    `include` is an explicit allowlist (`src/`, `test/`, `tests/`,
 *    `vite.config.ts`, generated `$types`) rather than a walk with exclusions.
 *
 * 2. **It must run `svelte-kit sync` first.** `.svelte-kit/tsconfig.json` is
 *    generated, and `tsconfig.json` extends it. On a fresh clone it does not
 *    exist yet, so the ratchet would measure a different project than CI does.
 *    `package.json`'s `check` script does this for the same reason.
 *
 * 3. **It must read the count from the report, not from the exit code.**
 *    svelte-check exits non-zero whenever there is at least one error, which is
 *    the normal path here. Only an absent or unparsable report is a failure of
 *    the ratchet itself, and that exits 2 so it cannot be mistaken for drift.
 */
import { spawnSync } from 'node:child_process';

/**
 * Zero as of 2026-11-22. It was 23 when this script landed earlier the same
 * day, and the whole set was cleared in the commit that set this to 0 — so the
 * ratchet's job now is to keep it there, and any failure is a real regression
 * rather than a number to renegotiate.
 *
 * Raising this is a decision, not a fix. The error that pushes it off zero is
 * almost certainly cheaper to fix than the reasoning needed to justify
 * accepting it.
 */
const BASELINE = 0;

const sync = spawnSync('bunx', ['svelte-kit', 'sync'], { encoding: 'utf-8' });
if (sync.error) {
	console.error(`FAIL  could not run svelte-kit sync: ${sync.error.message}`);
	process.exit(2);
}

const run = spawnSync(
	'bunx',
	['svelte-check', '--tsconfig', './tsconfig.json', '--output', 'machine'],
	{ encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 }
);

if (run.error) {
	console.error(`FAIL  could not run svelte-check: ${run.error.message}`);
	process.exit(2);
}

const report = `${run.stdout}\n${run.stderr}`;

// Machine format closes with a single summary line:
//   <timestamp> COMPLETED <n> FILES <n> ERRORS <n> WARNINGS <n> FILES_WITH_PROBLEMS
// Read the count from there rather than counting ERROR lines, so a message
// containing a newline cannot inflate the total.
const completed = report.match(/COMPLETED\s+\d+\s+FILES\s+(\d+)\s+ERRORS/);
if (!completed) {
	console.error('FAIL  svelte-check produced no parseable COMPLETED line.');
	console.error(report.slice(-2000));
	process.exit(2);
}

const total = Number(completed[1]);

/** `<timestamp> ERROR "<file>" <line>:<col> "<message>"` — file is group 1. */
function errorsByFile(): Map<string, number> {
	const counts = new Map<string, number>();
	for (const line of report.split('\n')) {
		const hit = line.match(/^\d+\s+ERROR\s+"([^"]+)"/);
		if (hit) counts.set(hit[1], (counts.get(hit[1]) ?? 0) + 1);
	}
	return counts;
}

function printByFile() {
	const counts = [...errorsByFile()].sort((a, b) => b[1] - a[1]);
	for (const [file, n] of counts) console.error(`      ${n}  ${file}`);
}

if (total > BASELINE) {
	console.error(`FAIL  svelte-check errors ${total}, baseline ${BASELINE} (+${total - BASELINE}).`);
	console.error('      New errors are not accepted. Fix them, or justify raising the baseline.');
	printByFile();
	process.exit(1);
}

if (total < BASELINE) {
	console.error(`FAIL  svelte-check errors ${total}, baseline ${BASELINE} (-${BASELINE - total}).`);
	console.error(`      Good news: lower BASELINE to ${total} in scripts/check-ratchet.ts.`);
	console.error('      A ratchet that is never tightened is a baseline that only rots.');
	printByFile();
	process.exit(1);
}

console.log(`PASS  svelte-check errors ${total}, at baseline.`);
