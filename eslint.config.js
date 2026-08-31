import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
	includeIgnoreFile(gitignorePath),

	// `includeIgnoreFile` reads ONLY the file it is handed — the root
	// `.gitignore`. Nested ignore files are invisible to it, and
	// `supabase/.temp/` is ignored by the CLI's own `supabase/.gitignore`
	// template rather than by the root one. So eslint walked into the running
	// stack's edge-runtime scratch code and reported 208 errors from it: the
	// count was 213 on a machine that had run `supabase start` and 5 on one
	// that had not, which makes any ratchet on it meaningless. That tree also
	// holds `start-secrets/`, which is not somewhere a linter should be
	// reading at all.
	{ ignores: ['supabase/.temp/**'] },
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser
			}
		}
	},
	// The three guards that used to live in `.ast-grep/rules/`. They encode
	// RUNTIME failures nothing else catches -- a 401 from an unauthenticated
	// fetch, a silently-undefined env var, a server secret in a client bundle --
	// so they are errors, and `lefthook.yml` runs eslint at pre-commit to keep
	// them firing before a commit exists rather than after it is pushed.
	{
		files: ['src/**/*.ts', 'src/**/*.js', 'src/**/*.svelte'],
		ignores: ['src/routes/api/**'],
		rules: {
			// Private env is server-only. This app has no `hooks.server.ts` doing
			// auth and no `event.locals`; the only server surface is
			// `src/routes/api/**`, which is ignored above. `RAILWAY_API_TOKEN` is
			// read there via `$env/dynamic/private` and must never reach a client
			// bundle.
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: '$env/dynamic/private',
							message:
								'Private env is server-only; outside src/routes/api this ships a secret to the browser.'
						},
						{
							name: '$env/static/private',
							message:
								'Private env is server-only; outside src/routes/api this ships a secret to the browser.'
						}
					]
				}
			]
		}
	},
	{
		files: ['src/**/*.ts', 'src/**/*.js', 'src/**/*.svelte'],
		rules: {
			// Two checks that need syntax selectors rather than a rule option.
			//
			// The PUBLIC_ one cannot be `no-restricted-imports`: eslint 10's schema
			// has no `importNamePattern`, and the offence is the imported NAME, not
			// the module -- `$env/static/public` is legitimate, `PUBLIC_FOO` from it
			// is not.
			'no-restricted-syntax': [
				'error',
				{
					selector:
						"ImportDeclaration[source.value='$env/static/public'] > ImportSpecifier[imported.name=/^PUBLIC_/]",
					message:
						"This project's public env prefix is SVELTE_PUBLIC_, not PUBLIC_ (vite.config.ts sets env.publicPrefix). A PUBLIC_ name is treated as PRIVATE and resolves to nothing, so the value is silently undefined in the browser."
				},
				{
					selector: "CallExpression[callee.name='fetch'] > Literal[value='/api/ai/generate']",
					message:
						'Call requestGeneration() instead of fetching /api/ai/generate directly. The endpoint verifies a Supabase bearer token that requestGeneration() attaches; a bare fetch sends no Authorization header and 401s at runtime.'
				}
			]
		}
	},
	{
		// Override or add rule settings here, such as:
		// 'svelte/button-has-type': 'error'
		rules: {}
	}
);
