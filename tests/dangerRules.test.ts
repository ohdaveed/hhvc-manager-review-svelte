import { describe, it, expect } from 'vitest';
import {
	isTestFile,
	hasSourceChanges,
	hasTestChanges,
	touchedFiles
} from '../scripts/danger-rules.js';

describe('danger rules', () => {
	describe('touchedFiles', () => {
		it('includes created files, not just modified ones', () => {
			// The original rule read modified_files alone, so PR #17 -- which added
			// tests/inlineEditFieldId.test.ts -- was told it had shipped no tests.
			const git = {
				modified_files: ['src/routes/review/+layout.svelte'],
				created_files: ['tests/inlineEditFieldId.test.ts']
			};

			expect(touchedFiles(git)).toContain('tests/inlineEditFieldId.test.ts');
			expect(hasTestChanges(touchedFiles(git))).toBe(true);
		});
	});

	describe('isTestFile', () => {
		it.each([
			['tests/layout.test.ts', true],
			['src/lib/ai/generate.test.ts', true],
			['src/routes/api/ai/generate/server.test.ts', true],
			['src/lib/thing.spec.js', true],
			['src/lib/components/Page.svelte', false],
			['src/lib/latest.ts', false],
			['scripts/danger-rules.ts', false]
		])('%s -> %s', (path, expected) => {
			expect(isTestFile(path)).toBe(expected);
		});
	});

	describe('hasSourceChanges', () => {
		it('counts application code under src/', () => {
			expect(hasSourceChanges(['src/lib/components/Page.svelte'])).toBe(true);
		});

		it('does not count a test that lives in src/ as application code', () => {
			// vite.config.ts routes src/**/*.test.ts to the server project, so tests
			// sit in both trees. Counting one as a source change would demand a
			// second test for every test.
			expect(hasSourceChanges(['src/lib/ai/generate.test.ts'])).toBe(false);
		});

		it('ignores changes outside src/', () => {
			expect(hasSourceChanges(['dangerfile.ts', 'README.md', 'tests/layout.test.ts'])).toBe(false);
		});
	});

	describe('the warning it gates', () => {
		const warns = (files: string[]) => hasSourceChanges(files) && !hasTestChanges(files);

		it('fires when source changes alone', () => {
			expect(warns(['src/lib/components/Page.svelte'])).toBe(true);
		});

		it('stays quiet when a new test accompanies the change', () => {
			expect(warns(['src/lib/components/Page.svelte', 'tests/page.test.ts'])).toBe(false);
		});

		it('stays quiet when the test sits beside the source in src/', () => {
			expect(warns(['src/lib/ai/generate.ts', 'src/lib/ai/generate.test.ts'])).toBe(false);
		});

		it('stays quiet for a docs-only PR', () => {
			expect(warns(['PLAN.md', 'CLAUDE.md'])).toBe(false);
		});
	});
});
