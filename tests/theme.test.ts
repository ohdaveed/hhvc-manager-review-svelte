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
});
