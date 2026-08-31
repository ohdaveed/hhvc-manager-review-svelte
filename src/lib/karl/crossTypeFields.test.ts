/**
 * A `karl` note must not name a Karl field that its page's type does not have.
 *
 * The failure this guards is specific and has already happened twice. Fourteen
 * `Transaction` pages once carried notes reading "Transaction -> Steps -> Step.
 * Step type: number. ... Optional, Cost, Time, and Transaction link: blank" —
 * seven field names in a row, none of which exists on a Transaction. They are
 * `Step by step`'s, whose `steps` block is the only place in Karl that carries a
 * per-step `Transaction link` chooser. Transaction hosts its steps as
 * `what_to_do -> Section`, which has a `section_title` and a `section_specifics`
 * stream and nothing else. `docs/karl-export-field-map.md` records the
 * 2026-08-15 sweep that rewrote those notes.
 *
 * The sweep was incomplete rather than undone: `git log -S'Transaction link'`
 * over `src/lib/data/` returns exactly one commit — `a743fb1`, the 2026-08-21
 * corpus import — so three sites arrived already wrong and were never fixed,
 * while two more were added later by #97. A note that names the wrong field
 * sends a reviewer looking for a chooser that is not on their screen, so this
 * is a content defect, not a comment typo.
 *
 * Scope is deliberately narrow. A general "does this note name a foreign field"
 * check was built and measured first: it produced 311 hits across 39 pages,
 * because half of Karl's UI labels are ordinary English ("Title", "date",
 * "image", "Related"). Tightening it to multi-word and snake_case names cut that
 * to 9 — but 8 of those were legitimate notes explaining an ABSENT field ("Step
 * by step has no things_to_know, so the audience line lives here"), and it
 * missed all five real defects, because `Transaction link` is not a panel and so
 * appears nowhere in `KARL_PANELS`. It lives as prose inside the `steps` panel's
 * `blockTypesDoc` string. The list below is therefore explicit and short: names
 * that belong to exactly one type and never read as ordinary prose.
 */
import { describe, it, expect } from 'vitest';
import { allPages } from '$lib/data/index';

/** Karl field names owned by exactly one page type. */
const EXCLUSIVE: { name: string; owner: string }[] = [
	// `steps` block internals — Step by step only. karl-blocks.js:1984.
	{ name: 'Transaction link', owner: 'Step by step' },
	{ name: 'Steps', owner: 'Step by step' },
	{ name: 'Step description', owner: 'Step by step' },
	// Information's body panel. karl-blocks.js:729.
	{ name: 'Information section', owner: 'Information' },
	{ name: 'information_section', owner: 'Information' }
];

/** Every reviewer-facing note on a page, with a path that locates it. */
function notesOf(page: Record<string, unknown>): { path: string; text: string }[] {
	const found: { path: string; text: string }[] = [];
	const walk = (node: unknown, path: string) => {
		if (!node || typeof node !== 'object') return;
		const rec = node as Record<string, unknown>;
		if (typeof rec.karl === 'string') found.push({ path, text: rec.karl });
		for (const [key, value] of Object.entries(rec)) {
			if (Array.isArray(value)) value.forEach((child, i) => walk(child, `${path}.${key}[${i}]`));
		}
	};
	if (typeof page.editorNote === 'string')
		found.push({ path: 'editorNote', text: page.editorNote });
	const sections = Array.isArray(page.sections) ? page.sections : [];
	sections.forEach((section, i) => walk(section, `sections[${i}]`));
	return found;
}

/** Whole-word, case-sensitive: `tenantNoticeSteps` must not read as `Steps`. */
const mentions = (text: string, name: string) =>
	new RegExp(`(?<![\\w-])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`).test(text);

describe('karl notes name only fields their page type has', () => {
	it('reports every note naming a field owned by a different type', () => {
		const violations: string[] = [];
		for (const page of allPages as unknown as Record<string, unknown>[]) {
			for (const { name, owner } of EXCLUSIVE) {
				if (page.type === owner) continue;
				for (const { path, text } of notesOf(page)) {
					if (mentions(text, name)) {
						violations.push(`${page.slug} [${page.type}] ${path} → "${name}" is ${owner}-only`);
					}
				}
			}
		}
		expect(violations).toEqual([]);
	});

	it('does not fire on the type that owns the field', () => {
		const stepPages = (allPages as unknown as Record<string, unknown>[]).filter(
			(p) => p.type === 'Step by step'
		);
		expect(stepPages.length).toBeGreaterThan(0);
		const named = stepPages.filter((p) =>
			notesOf(p).some(({ text }) => mentions(text, 'Transaction link'))
		);
		expect(named.length).toBeGreaterThan(0);
	});
});
