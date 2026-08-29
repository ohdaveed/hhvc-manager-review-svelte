import { describe, it, expect } from 'vitest';
import { KARL_HELP, karlHelp, type KarlHelpKey } from './karlHelp';
import { analyzePage } from './index';
import { allPages } from '$lib/data/index';

const HELP_CENTER = 'https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/';

describe('the Karl help citation registry', () => {
	it('points every entry at the Karl Editor Help Center over https', () => {
		for (const [key, link] of Object.entries(KARL_HELP)) {
			expect(link.url.startsWith(HELP_CENTER), `${key} -> ${link.url}`).toBe(true);
		}
	});

	it('gives every entry a title and a reason it is being cited', () => {
		for (const [key, link] of Object.entries(KARL_HELP)) {
			expect(link.title.length, `${key} has no title`).toBeGreaterThan(0);
			expect(link.why.length, `${key} has no reason`).toBeGreaterThan(0);
		}
	});

	it('has no duplicate URLs, so two checks never cite the same page as if it said different things', () => {
		const urls = Object.values(KARL_HELP).map((l) => l.url);
		expect(new Set(urls).size).toBe(urls.length);
	});

	it('throws on an unknown key rather than rendering a dead link', () => {
		expect(() => karlHelp('nope' as KarlHelpKey)).toThrow();
	});
});

describe('every claim the panel makes carries a citation', () => {
	// This is the point of the port: Karl Jr. states findings bare. If a check
	// is ever added without choosing a help page, this goes red rather than
	// shipping an unsourced assertion to a reviewer.
	it('resolves the help key of every finding on every corpus page', () => {
		for (const page of allPages as Record<string, unknown>[]) {
			const analysis = analyzePage({ page: page as never });
			expect(analysis.findings.length, `${String(page.slug)} produced no findings`).toBeGreaterThan(
				0
			);
			for (const finding of analysis.findings) {
				expect(
					KARL_HELP[finding.help],
					`${String(page.slug)} / ${finding.id} cites unknown help key ${finding.help}`
				).toBeTruthy();
			}
		}
	});

	it('cites a help page for the readability score too', () => {
		const analysis = analyzePage({ page: (allPages as Record<string, unknown>[])[0] as never });
		expect(KARL_HELP[analysis.readabilityHelp]).toBeTruthy();
	});
});
