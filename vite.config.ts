import { execFileSync } from 'node:child_process';
import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-netlify';
import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';

/**
 * The commit this bundle was built from, stamped into SvelteKit's
 * `version.name` and therefore served at `/_app/version.json`.
 *
 * Netlify's control plane can report a deploy `ready` at the right commit while
 * the site still serves an older *published* one -- a locked deploy does
 * exactly that, and it hid three merges in a row without a single status code
 * changing. `verify:live` reads this value back out of the deployed artifact,
 * which is the only place the answer cannot be stale.
 *
 * `COMMIT_REF` is Netlify's; `GITHUB_SHA` is Actions'. The git fallback covers
 * a local build. `unknown` is deliberately a value the check will reject rather
 * than something that looks like a pass.
 */
function buildCommit(): string {
	const fromCI = process.env.COMMIT_REF || process.env.GITHUB_SHA;
	if (fromCI) return fromCI;
	try {
		return execFileSync('git', ['rev-parse', 'HEAD'], {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore']
		}).trim();
	} catch {
		return 'unknown';
	}
}

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			env: {
				publicPrefix: 'SVELTE_PUBLIC_'
			},
			version: {
				name: buildCommit()
			},
			adapter: adapter()
		}),
		svelteTesting()
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}', 'tests/**/*.test.ts']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					environment: 'jsdom',
					include: ['tests/**/*.test.ts'],
					resolve: {
						conditions: ['browser']
					}
				}
			}
		]
	}
});
