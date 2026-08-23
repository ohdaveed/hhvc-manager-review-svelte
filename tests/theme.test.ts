import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Global Theme Configuration', () => {
	it('should import the theme fonts', () => {
		const cssContent = fs.readFileSync(path.resolve('./src/app.css'), 'utf-8');

		// Matched quote-agnostically on purpose. These assertions were written
		// against double quotes while app.css has always used single ones, so
		// the test was red long before anyone noticed — a formatter changing
		// quote style is not a change in behaviour and should not fail a build.
		expect(cssContent).toMatch(/@import\s+['"]@fontsource-variable\/roboto-flex['"]/);
		expect(cssContent).toMatch(/@import\s+['"]@fontsource\/roboto-slab\/700\.css['"]/);
	});

	it('should define the theme font tokens', () => {
		const cssContent = fs.readFileSync(path.resolve('./src/app.css'), 'utf-8');

		// The SFDS v3 bundle import this file used to assert was removed
		// deliberately in #6, which replaced it with scoped v4 tokens. The
		// fonts it supplied are now declared here, so that is what we check.
		expect(cssContent).toMatch(/--font-body:/);
		expect(cssContent).toMatch(/--font-heading:/);
	});

	// These three exist because the SFDS token layer was dead for months in a
	// way nothing caught: `src/css/theme.css` was real, 952 lines, and imported
	// by NOTHING. Its only importer was `src/routes/layout.css`, itself
	// imported by nothing. The design handoff names theme.css as the token
	// layer to build on, which is only true while it is actually loaded.
	//
	// The old version of this file would have passed with theme.css deleted —
	// it asserts against app.css and never mentions the token files. That is
	// this repo's signature failure mode, so the revival gets a real guard.
	describe('SFDS token layer', () => {
		const appCss = () => fs.readFileSync(path.resolve('./src/app.css'), 'utf-8');

		it('is imported by app.css, primitives before semantics', () => {
			const css = appCss();
			const sfds = css.indexOf('./css/sfds.css');
			const theme = css.indexOf('./css/theme.css');

			expect(sfds, 'app.css must import ./css/sfds.css').toBeGreaterThan(-1);
			expect(theme, 'app.css must import ./css/theme.css').toBeGreaterThan(-1);

			// theme.css composes the --sfds-* primitives sfds.css declares, so
			// the order is load-bearing, not stylistic.
			expect(sfds).toBeLessThan(theme);
		});

		it('actually defines the tokens the design handoff specifies', () => {
			const sfds = fs.readFileSync(path.resolve('./src/css/sfds.css'), 'utf-8');
			const theme = fs.readFileSync(path.resolve('./src/css/theme.css'), 'utf-8');

			// One primitive and one semantic token, so a file that is present
			// but gutted fails here rather than passing on its filename alone.
			expect(sfds).toMatch(/--sfds-color-action:/);
			expect(theme).toMatch(/--brand-40:\s*#495ed4/i);
		});

		it('keys dark mode to the .dark class, not the system preference', () => {
			const theme = fs.readFileSync(path.resolve('./src/css/theme.css'), 'utf-8');

			// Comments stripped first: theme.css documents the old media query
			// in prose right above the replacement, and an assertion that reads
			// documentation instead of CSS is not measuring anything. The first
			// version of this test failed on exactly that.
			const rules = theme.replace(/\/\*[\s\S]*?\*\//g, '');

			// app.css drives dark mode from a class (`@custom-variant dark
			// (&:is(.dark *))` plus its own `.dark` block). theme.css used the
			// system preference, so an OS-dark reviewer would have had these
			// primitives inverted while every shadcn token stayed light — a
			// mixed palette, on some machines only. Both must flip together.
			expect(rules).not.toMatch(/@media\s*\(\s*prefers-color-scheme\s*:\s*dark/);
			expect(rules).toMatch(/:root\.dark\s*\{/);
			expect(appCss().replace(/\/\*[\s\S]*?\*\//g, '')).toMatch(/@custom-variant\s+dark/);
		});
	});
});
