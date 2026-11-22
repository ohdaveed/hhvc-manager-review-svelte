import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Asserts the two error-count ratchets run in a BLOCKING job.
 *
 * The failure mode this guards is the one CLAUDE.md records for the ruleset:
 * a gate stops gating without anything failing. Three ways that happens here,
 * none of which breaks a test or a build —
 *
 * 1. the step is moved into `review`, which carries `continue-on-error: true`
 *    on every step, so the ratchet reports instead of blocking;
 * 2. the `package.json` script is renamed and the workflow still names the old
 *    one, so the step fails open or is dropped;
 * 3. the step is deleted outright.
 *
 * `check` spent months in exactly state (1): its documented baseline said 24,
 * the tree measured 27, and nothing noticed. This is a node-environment spec
 * (`.spec.ts` under `tests/`, per the vitest project split) because it reads
 * files off disk.
 */

const workflow = readFileSync('.github/workflows/pr.yml', 'utf-8');
const pkg = JSON.parse(readFileSync('package.json', 'utf-8')) as {
	scripts: Record<string, string>;
};

/**
 * The `test & build` job's body: from its `test:` key to the next top-level
 * job key. Sliced rather than YAML-parsed so the assertion stays readable and
 * adds no dependency; the job names are matched against the ruleset's required
 * contexts, so they are stable by definition.
 */
function testAndBuildJob(): string {
	const start = workflow.indexOf('\n  test:\n');
	expect(start, 'pr.yml no longer has a `test:` job').toBeGreaterThan(-1);
	const rest = workflow.slice(start + 1);
	const next = rest.search(/\n {2}[a-z][a-z0-9_-]*:\n/);
	return next === -1 ? rest : rest.slice(0, next);
}

describe('error-count ratchets block the merge', () => {
	const job = testAndBuildJob();

	it('the `test & build` job is the one the ruleset requires', () => {
		expect(job).toContain('name: test & build');
	});

	it.each([
		['lint:ratchet', 'scripts/eslint-ratchet.ts'],
		['check:ratchet', 'scripts/check-ratchet.ts']
	])('%s runs in `test & build` and is a real script', (script, implementation) => {
		expect(job, `${script} is not run by the blocking job`).toContain(`bun run ${script}`);
		expect(pkg.scripts, `package.json has no ${script} script`).toHaveProperty(script);
		expect(pkg.scripts[script]).toContain(implementation);
	});

	it('neither ratchet is softened with continue-on-error', () => {
		// `review` sets it per step; `test & build` must not, or the ratchet
		// reports rather than gates.
		expect(job).not.toContain('continue-on-error');
	});
});
