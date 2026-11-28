/**
 * bun audit, diffed against the PR's base.
 *
 * `actions/dependency-review-action` diffs GitHub's dependency graph, and the
 * graph does not parse `bun.lock` -- it is absent from the supported-ecosystems
 * table (npm is `package-lock.json`, pnpm `pnpm-lock.yaml`, Yarn `yarn.lock`).
 * So that check sees `package.json` and nothing beneath it: a PR that pulls a
 * vulnerable TRANSITIVE dependency in through the lockfile passes it. This reads
 * the lockfile itself.
 *
 * It fails only on high/critical advisories the PR ADDS, never on ones already
 * on the base, for the same reason dependency review does: measured 2026-11-28,
 * `bun audit --audit-level=high` on `main` reported 23 high advisories. A plain
 * `bun audit` step would turn every PR red over drift no PR introduced, and a
 * count ratchet like the eslint/prettier ones would go red whenever an upstream
 * advisory was PUBLISHED, which is not something a PR can fix. Diffing two
 * audits taken in the same job, against the same advisory database, is immune
 * to both. Existing advisories are Dependabot's job.
 *
 * Usage: `bun run scripts/audit-diff.ts <base-dir>`, where <base-dir> holds the
 * base commit's `package.json` and `bun.lock`. `bun audit` reads the lockfile
 * and needs no `node_modules`.
 *
 * Fails CLOSED: an audit whose output is not an advisory report (registry down,
 * proxy error page) exits 2 rather than reading as clean.
 */
import { spawnSync } from 'node:child_process';

const FAILING = new Set(['high', 'critical']);

type Advisory = { url?: string; id?: number; title?: string; severity?: string };
type Report = Record<string, Advisory[]>;

function audit(cwd: string): Report {
	const run = spawnSync('bun', ['audit', '--json'], {
		cwd,
		encoding: 'utf-8',
		maxBuffer: 64 * 1024 * 1024
	});
	if (run.error) {
		console.error(`FAIL  could not run bun audit in ${cwd}: ${run.error.message}`);
		process.exit(2);
	}
	// bun audit exits 1 whenever it finds anything, so the status says nothing
	// here; only a parseable report does.
	try {
		const report: unknown = JSON.parse(run.stdout);
		if (report && typeof report === 'object' && !Array.isArray(report)) {
			return report as Report;
		}
	} catch {
		// fall through
	}
	console.error(`FAIL  bun audit in ${cwd} did not return an advisory report.`);
	console.error(run.stderr.slice(0, 2000));
	process.exit(2);
}

function failing(report: Report): Map<string, string> {
	const found = new Map<string, string>();
	for (const [pkg, advisories] of Object.entries(report)) {
		if (!Array.isArray(advisories)) continue;
		for (const a of advisories) {
			if (!a.severity || !FAILING.has(a.severity)) continue;
			const id = a.url ?? String(a.id);
			found.set(`${pkg} ${id}`, `${pkg}: ${a.severity}: ${a.title ?? ''} - ${id}`);
		}
	}
	return found;
}

const baseDir = process.argv[2];
if (!baseDir) {
	console.error('usage: bun run scripts/audit-diff.ts <base-dir>');
	process.exit(2);
}

const base = failing(audit(baseDir));
const head = failing(audit('.'));
const added = [...head].filter(([key]) => !base.has(key)).map(([, line]) => line);

if (added.length > 0) {
	console.error(
		`FAIL  this PR adds ${added.length} high/critical advisor${added.length === 1 ? 'y' : 'ies'}:`
	);
	for (const line of added) console.error(`      ${line}`);
	console.error(
		'      Bump or override the package, or run `bun audit` locally for the dependency path.'
	);
	process.exit(1);
}

console.log(`PASS  no new high/critical advisories (base ${base.size}, head ${head.size}).`);
