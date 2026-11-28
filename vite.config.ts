import { sentrySvelteKit } from '@sentry/sveltekit';
import { execFileSync } from 'node:child_process';
import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import adapterNetlify from '@sveltejs/adapter-netlify';
import adapterNode from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';

/**
 * Netlify builds production and every deploy preview, so it is the default.
 * The Dockerfile sets `ADAPTER=node` for the container, whose `CMD` runs
 * `build/index.js` -- an entrypoint only adapter-node produces.
 *
 * The polarity matters: netlify has to be the default so CI's `bun run build`
 * exercises the adapter production actually ships on. Keying off Netlify's own
 * `NETLIFY` variable would invert that and leave the production adapter
 * untested by the merge gate.
 */
const adapter = process.env.ADAPTER === 'node' ? adapterNode : adapterNetlify;

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

/**
 * Which deploy this bundle is for, stamped in at build time and read by
 * Sentry's `environment`.
 *
 * Netlify sets `CONTEXT` to `production`, `deploy-preview` or `branch-deploy`,
 * which is the only thing that distinguishes them -- the DSN is one project and
 * the bundles are otherwise identical. Without this every preview's errors land
 * in the same stream as production's, indistinguishable at the moment you most
 * need to tell them apart.
 *
 * `development` is the fallback rather than `production`, so an unstamped build
 * under-claims instead of quietly polluting the production environment.
 */
function deployContext(): string {
	return process.env.CONTEXT || (process.env.CI ? 'ci' : 'development');
}

export default defineConfig({
	define: {
		__SENTRY_ENVIRONMENT__: JSON.stringify(deployContext())
	},
	plugins: [
		sentrySvelteKit({
			org: 'glycolysis',
			project: 'javascript-sveltekit',
			/**
			 * The plugin turns sourcemaps on so it can upload them. It never did:
			 * every build logs `No auth token provided. Will not upload source
			 * maps.` -- so the maps were emitted into `build/`, which netlify.toml
			 * publishes wholesale, and served to browsers while reaching Sentry
			 * not at all. `app.<hash>.js.map` returns 200 in production.
			 *
			 * That is not free. Code behind `import.meta.env.DEV` is tree-shaken
			 * out of the `.js` and survives verbatim in `sourcesContent`: the
			 * local seed credentials (`demo@hhvc.local`, `dev-local-only`) ship in
			 * a map today while appearing in no chunk. `verify`'s published-bundle
			 * scan now reads maps and catches exactly this.
			 *
			 * Set this back to `true` ONLY together with a `SENTRY_AUTH_TOKEN` in
			 * the Netlify build environment and
			 * `sourceMapsUploadOptions.sourcemaps.filesToDeleteAfterUpload`, so
			 * Sentry gets the maps and visitors do not.
			 */
			autoUploadSourceMaps: false
		}),
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
			experimental: {
				instrumentation: {
					server: true
				}
			},
			adapter: adapter()
		}),
		svelteTesting()
	],
	test: {
		expect: {
			requireAssertions: true
		},
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
				// `resolve` is a Vite-level key, a SIBLING of `test`, not a member of
				// it: Vitest types a project as `UserWorkspaceConfig & { extends }`.
				// Nested inside `test` it type-errors ('resolve' does not exist in type
				// 'ProjectConfig') and is silently ignored, which is where it sat until
				// 2026-11-21. The client specs that mount Svelte passed either way --
				// browser resolution comes from the plugin chain -- so nothing failed to
				// announce it.
				resolve: {
					conditions: ['browser']
				},
				test: {
					name: 'client',
					environment: 'jsdom',
					include: ['tests/**/*.test.ts'],
					// Node 25+'s own `localStorage` hides jsdom's; this puts it back.
					setupFiles: ['tests/setup/jsdomStorage.ts']
				}
			}
		]
	}
});
