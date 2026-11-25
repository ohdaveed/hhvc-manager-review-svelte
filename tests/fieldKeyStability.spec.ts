/**
 * Field ids are identity: `edits.field_id` and `comments.field_id` store them,
 * `latest_edits` is keyed on `(page_id, field_id)`, and `edits` has no UPDATE or
 * DELETE policy -- so a row filed under a key nothing reads cannot be repaired
 * through the app.
 *
 * `deriveFieldKey` slugifies the section HEADING, which means an editorial fix
 * to heading copy silently re-keys that section. The plain-language audit hit
 * exactly this: rewording three headings moved 27 field ids across three pages.
 * Those sections now pin `fieldKey`, and this file is the guard.
 *
 * Lives in `tests/` as a `.spec.ts` so the node project runs it -- it needs no
 * DOM, and `vite.config.ts` routes `tests/**\/*.spec.ts` to the server project.
 */
import { describe, it, expect } from 'vitest';
import { allPages } from '../src/lib/data/index.js';
import { deriveFieldKey } from '../src/lib/corpus/fieldKey.js';

type Section = { heading?: unknown; fieldKey?: unknown };
const sectionsOf = (page: unknown): Section[] => {
	const s = (page as { sections?: unknown }).sections;
	return Array.isArray(s) ? (s as Section[]) : [];
};

describe('deriveFieldKey precedence', () => {
	it('prefers an explicit fieldKey over the heading slug', () => {
		expect(deriveFieldKey({ heading: 'What you must do', fieldKey: 'legacy-key' }, 0)).toBe(
			'legacy-key'
		);
	});

	it('still slugifies the heading when no fieldKey is pinned', () => {
		expect(deriveFieldKey({ heading: 'Other City housing services' }, 0)).toBe(
			'other-city-housing-services'
		);
	});

	it('ignores a blank or non-string fieldKey rather than keying on it', () => {
		expect(deriveFieldKey({ heading: 'A heading', fieldKey: '   ' }, 0)).toBe('a-heading');
		expect(deriveFieldKey({ heading: 'A heading', fieldKey: false }, 0)).toBe('a-heading');
		expect(deriveFieldKey({ fieldKey: '' }, 4)).toBe('section-4');
	});
});

describe('corpus field keys', () => {
	// The three the audit reworded. The key is the ORIGINAL heading slug, so the
	// ids saved against them survive the rewrite; if one of these ever changes,
	// the edits filed under it are orphaned rather than moved.
	it.each([
		['sf.gov/departments--healthy-housing-and-vector-control', 'need-another-city-housing-service'],
		['sf.gov/information--article-11-compliance-for-property-owners', 'what-you-re-required-to-do'],
		['sf.gov/integrated-pest-management-education', 'what-you-ll-learn'],
		// Meta headings rewritten as tasks, per Karl's heading guidance.
		['sf.gov/look-up-building-records', 'about-this-collection'],
		['sf.gov/property-owner-responsibilities-hhvc', 'about-this-collection'],
		['sf.gov/report/health-code-article-11-plain-language', 'how-to-use-this-guide'],
		[
			'sf.gov/information/what-happens-after-you-report-housing-pest-problem',
			'what-this-page-does-not-promise'
		],
		[
			'sf.gov/information/integrated-pest-management-for-property-owners-and-managers',
			'why-it-matters'
		],
		[
			'sf.gov/information/integrated-pest-management-for-property-owners-and-managers',
			'primary-source-uc-ipm-guide-for-property-managers'
		],
		['sf.gov/information/learn-what-hhvc-can-inspect', 'use-this-page-before-you-report'],
		['sf.gov/information/learn-what-hhvc-can-inspect', 'how-to-choose-the-right-page'],
		['sf.gov/resource/guides-in-other-languages', 'about-these-guides'],
		['sf.gov/report/healthy-housing-inspections-annual-summary', 'about-these-figures']
	])('%s still carries the pinned key %s', (slug, key) => {
		const page = (allPages as unknown[]).find((p) => (p as { slug?: unknown }).slug === slug);
		expect(page, `no page with slug ${slug}`).toBeDefined();
		const keys = sectionsOf(page).map((s, i) => deriveFieldKey(s, i));
		expect(keys).toContain(key);
	});

	it('gives every section on a page a distinct key', () => {
		// A pinned key could collide with another section's derived slug on the
		// same page, which would silently fold two sections' fields together --
		// a worse failure than the orphaning the pin exists to prevent.
		const collisions: string[] = [];
		for (const page of allPages as unknown[]) {
			const slug = String((page as { slug?: unknown }).slug);
			const seen = new Set<string>();
			sectionsOf(page).forEach((section, i) => {
				const key = deriveFieldKey(section, i);
				if (seen.has(key)) collisions.push(`${slug} -> ${key}`);
				seen.add(key);
			});
		}
		expect(collisions).toEqual([]);
	});
});
