import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every e2e spec must take `test` from tests/fixtures, not @playwright/test.
 *
 * `tests/fixtures.ts` carries the auto-fixture that fails a test when the page
 * raised an uncaught exception, logged a console error, or navigated to a
 * document response >= 400. Playwright has no config-level auto-fixture --
 * fixtures reach a test only through the `test` object it imports -- so that
 * gate is OPT-IN, and a spec importing from '@playwright/test' runs completely
 * ungated.
 *
 * That bypass is silent in the worst way. A NEW spec file produces no merge
 * conflict against the specs that were converted by hand, so nothing signals
 * that it sits outside the gate; it simply passes, for the same reason an
 * ungated spec always passed. It has already happened once: a throwaway probe
 * written while building the fixture logged three console errors per page and
 * still reported "6 passed".
 *
 * Hence this assertion rather than a convention. It is the same shape as the
 * empty-allowlist test guarding scripts/audit-privileges.ts: the point is that
 * widening it should require a deliberate edit with a reason attached.
 *
 * Type-only imports stay legal. `import type { Page } from '@playwright/test'`
 * pulls in no runtime binding and cannot bypass anything, and specs genuinely
 * need those types.
 */

/** Directories with nothing of ours in them, or not shipped from this repo. */
const SKIP = new Set([
	'node_modules',
	'.git',
	'.svelte-kit',
	'build',
	'dist',
	'design',
	'coverage'
]);

function e2eSpecs(root: string, dir = root, found: string[] = []): string[] {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.name.startsWith('.') || SKIP.has(entry.name)) continue;
		const full = join(dir, entry.name);
		if (entry.isDirectory()) e2eSpecs(root, full, found);
		else if (/\.e2e\.(ts|js)$/.test(entry.name)) found.push(full);
	}
	return found;
}

/** Every `... from '@playwright/test'` clause in a source file. */
function playwrightImportClauses(source: string): string[] {
	const clauses: string[] = [];
	const pattern = /import\s+([\s\S]*?)\s+from\s+['"]@playwright\/test['"]/g;
	let match: RegExpExecArray | null;
	while ((match = pattern.exec(source)) !== null) clauses.push(match[1]);
	return clauses;
}

/**
 * Does this clause bind `test` as a VALUE?
 *
 * `import type { test }` and `import { type test }` are both type-only and
 * therefore harmless. An alias (`test as base`) still binds the runtime object,
 * so it counts.
 */
function bindsTestAsValue(clause: string): boolean {
	if (/^type\s/.test(clause.trim())) return false;
	const braces = clause.match(/\{([\s\S]*)\}/);
	if (!braces) return false;
	return braces[1]
		.split(',')
		.map((specifier) => specifier.trim())
		.filter((specifier) => specifier && !/^type\s/.test(specifier))
		.some((specifier) => specifier.split(/\s+as\s+/)[0].trim() === 'test');
}

describe('e2e specs are covered by the page-error fixture', () => {
	const root = process.cwd();
	const specs = e2eSpecs(root);

	it('finds the e2e specs at all', () => {
		// A guard that silently matched nothing would pass forever. If the suite
		// is ever restructured this fails first, and says so.
		expect(specs.length, 'no *.e2e.{ts,js} files found -- has the layout moved?').toBeGreaterThan(
			0
		);
	});

	it('imports `test` from the fixtures, never from @playwright/test', () => {
		const offenders = specs
			.filter((file) => playwrightImportClauses(readFileSync(file, 'utf8')).some(bindsTestAsValue))
			.map((file) => relative(root, file));

		expect(
			offenders,
			[
				`${offenders.length} e2e spec(s) import \`test\` from '@playwright/test' and so run`,
				'outside the page-error gate in tests/fixtures.ts. Import from the fixtures',
				"instead -- `import { expect, test } from './fixtures'`. Type-only imports",
				"(`import type { Page } from '@playwright/test'`) are fine and stay.",
				'',
				...offenders.map((file) => `  ${file}`)
			].join('\n')
		).toEqual([]);
	});
});
