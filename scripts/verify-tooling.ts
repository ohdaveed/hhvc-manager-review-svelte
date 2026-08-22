/**
 * Verifies the developer tooling actually WORKS -- not that it is installed.
 *
 * The previous version ran `--version` on five binaries. That is why it
 * reported `ast:scan` as healthy while `.ast-grep/rules/` was empty and the
 * scan matched nothing: a tool that does nothing still prints its version.
 *
 * Every check below asserts an observable outcome, so emptying a rule
 * directory or breaking a config makes this script fail rather than pass.
 */
import { execSync } from 'child_process';
import { existsSync, readFileSync, rmSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

type Check = { name: string; run: () => string };

/** Runs a command, returning stdout+stderr. Throws on non-zero exit. */
function sh(cmd: string): string {
	return execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** Runs a command that is expected to fail, returning its combined output. */
function shExpectFailure(cmd: string): { failed: boolean; output: string } {
	try {
		const output = execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
		return { failed: false, output };
	} catch (err) {
		const e = /** @type {{ stdout?: string; stderr?: string }} */ err as {
			stdout?: string;
			stderr?: string;
		};
		return { failed: true, output: `${e.stdout ?? ''}${e.stderr ?? ''}` };
	}
}

function assert(condition: boolean, detail: string): void {
	if (!condition) throw new Error(detail);
}

const checks: Check[] = [
	{
		// Deliberately ONE check, not two. `ast-grep test` passes fixtures whose
		// rule id no longer exists, so on an empty rule directory it happily
		// reports "3 rule tests pass" -- a separate green line stating that would
		// be exactly the lie this script exists to remove. Rules must be present
		// AND discovered AND matching before anything here reports success.
		name: 'ast-grep rules load and match',
		run: () => {
			const ruleCount = sh('ls .ast-grep/rules').trim().split('\n').filter(Boolean).length;
			assert(ruleCount > 0, '.ast-grep/rules is empty -- `bun run ast:scan` would be a no-op');

			const out = sh('bunx ast-grep test');
			const testCount = Number(/Running (\d+) tests?/.exec(out)?.[1] ?? '0');
			assert(
				testCount > 0,
				'ast-grep discovered 0 rule tests -- testConfigs[].testDir is missing or misnamed'
			);
			assert(
				testCount >= ruleCount,
				`${ruleCount} rules but only ${testCount} tests -- a rule has no fixture proving it matches`
			);
			assert(!out.includes('FAIL'), `ast-grep rule tests failed:\n${out}`);

			sh('bunx ast-grep scan');
			return `${ruleCount} rules, ${testCount} tests, tree clean`;
		}
	},
	{
		name: 'knip detects dead code',
		run: () => {
			// Assert knip resolves this project rather than merely running: it must
			// find the unused export we know is there. A knip that resolved nothing
			// would report a clean tree and exit 0.
			const out = sh('bunx knip --no-exit-code --reporter json');
			const report = JSON.parse(out);
			assert(Array.isArray(report.issues), 'knip did not emit a parseable JSON report');
			assert(report.issues.length > 0, 'knip resolved nothing -- config is probably broken');
			return `${report.issues.length} files with findings`;
		}
	},
	{
		name: 'repomix emits a pack',
		run: () => {
			const dir = mkdtempSync(join(tmpdir(), 'verify-repomix-'));
			const out = join(dir, 'pack.xml');
			try {
				sh(`bunx repomix -o ${out}`);
				assert(existsSync(out), 'repomix reported success but wrote no file');
				const size = readFileSync(out, 'utf-8').length;
				assert(size > 1000, `repomix wrote only ${size} chars -- include globs are wrong`);
				return `${Math.round(size / 1024)}KB packed`;
			} finally {
				rmSync(dir, { recursive: true, force: true });
			}
		}
	},
	{
		name: 'lefthook hook is installed',
		run: () => {
			// `lefthook version` passes on a clone with no hooks installed, which is
			// the state that let commits skip every gate.
			const hook = '.git/hooks/pre-commit';
			assert(existsSync(hook), `${hook} missing -- run \`bun run prepare\``);
			assert(
				readFileSync(hook, 'utf-8').includes('lefthook'),
				`${hook} exists but is not lefthook's`
			);
			return 'pre-commit present';
		}
	},
	{
		name: 'danger rules behave',
		run: () => {
			// Guards the bug that let PR #17 be told it shipped no tests.
			// Single line on purpose: newlines inside `bun -e` arrive as literal
			// backslash-n through the shell and fail to parse.
			const probe = [
				"import { hasSourceChanges, hasTestChanges, touchedFiles } from './scripts/danger-rules.js';",
				"const t = touchedFiles({ modified_files: ['src/a.ts'], created_files: ['tests/a.test.ts'] });",
				"if (!hasSourceChanges(t)) throw new Error('source change not detected');",
				"if (!hasTestChanges(t)) throw new Error('created test file not detected');",
				"console.log('ok');"
			].join(' ');
			const out = sh(`bun -e ${JSON.stringify(probe)}`);
			assert(out.includes('ok'), 'danger rule predicates did not behave as expected');
			return 'created-file detection works';
		}
	}
];

console.log('🔍 Verifying developer tooling behavior...\n');

let failed = 0;

for (const check of checks) {
	try {
		const detail = check.run();
		console.log(`✅ ${check.name.padEnd(28)} : ${detail}`);
	} catch (err) {
		const reason = err instanceof Error ? err.message : String(err);
		console.error(`❌ ${check.name.padEnd(28)} : ${reason}`);
		failed++;
	}
}

if (failed > 0) {
	console.error(`\n❌ ${failed} of ${checks.length} tooling checks failed.`);
	process.exit(1);
}

console.log(`\n🎉 All ${checks.length} tooling checks pass on behavior, not version strings.`);
