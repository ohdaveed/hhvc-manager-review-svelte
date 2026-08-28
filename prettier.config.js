/** @type {import("prettier").Config} */
const config = {
	useTabs: true,
	singleQuote: true,
	trailingComma: 'none',
	printWidth: 100,
	plugins: ['prettier-plugin-svelte', 'prettier-plugin-tailwindcss'],
	overrides: [{ files: '*.svelte', options: { parser: 'svelte' } }],
	// The app's real Tailwind entry point. This pointed at
	// `./src/routes/layout.css` until 2026-08-28 — the dead legacy entry that
	// nothing imported, so class sorting was resolving against a theme the app
	// never loaded. Deleting that file (PLAN.md B5) is what surfaced it.
	tailwindStylesheet: './src/app.css'
};

export default config;
