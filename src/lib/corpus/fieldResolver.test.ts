import { describe, it, expect } from 'vitest';
import { resolveField, resolveFields } from './fieldResolver';
import { deriveFieldKey } from './fieldKey';
import { allPages } from '$lib/data';

/**
 * The resolver is what multi-field editing reads and writes through, so its
 * failure mode is a rewrite landing on the wrong field — or silently on
 * nothing. These tests run against the REAL corpus rather than a fixture, so a
 * shape added to `Section.svelte` later fails here first instead of in a panel.
 */

/** Mirrors what `pageData.svelte.ts` does when it builds `pageStore.pages`. */
function withKeys(page: Record<string, any>) {
	return {
		...page,
		sections: (page.sections ?? []).map((s: Record<string, any>, i: number) => ({
			...s,
			fieldKey: deriveFieldKey(s, i)
		}))
	};
}

/** Every id `Page.svelte` and `Section.svelte` emit, for one page. */
function expectedIds(page: Record<string, any>): string[] {
	const ids: string[] = ['title'];
	if (page.summary) ids.push('summary');
	(page.audience ?? []).forEach((_: unknown, i: number) => ids.push(`audience.${i}`));
	for (const s of page.sections ?? []) {
		const k = s.fieldKey;
		if (s.heading) ids.push(`sections.${k}.heading`);
		(s.paragraphs ?? []).forEach((_: unknown, i: number) =>
			ids.push(`sections.${k}.paragraphs.${i}`)
		);
		(s.bullets ?? []).forEach((_: unknown, i: number) => ids.push(`sections.${k}.bullets.${i}`));
		if (s.callout?.title) ids.push(`sections.${k}.callout.title`);
		if (s.callout?.text) ids.push(`sections.${k}.callout.text`);
	}
	return ids;
}

describe('resolveField', () => {
	const pages = allPages.map(withKeys);

	it('resolves every field id the corpus can emit', () => {
		const unresolved: string[] = [];
		let checked = 0;

		for (const page of pages) {
			for (const id of expectedIds(page)) {
				checked++;
				const raw = resolveField(page, id);
				if (!raw) unresolved.push(`${page.slug} :: ${id}`);
			}
		}

		expect(checked).toBeGreaterThan(500);
		expect(unresolved).toEqual([]);
	});

	it('never resolves a value to the string "[object Object]"', () => {
		// The bug this guards is not hypothetical. Ten paragraph/bullet entries
		// are `{text, unverified, unverifiedReason}` — copy with no tier-1
		// source — and Section.svelte rendered them straight into the DOM, so
		// seven pages of a copy-review tool displayed the literal text
		// "[object Object]" where SF.gov copy belongs.
		const bad: string[] = [];
		for (const page of pages) {
			for (const id of expectedIds(page)) {
				const f = resolveField(page, id);
				if (f && (f.value.includes('[object Object]') || typeof f.value !== 'string')) {
					bad.push(`${page.slug} :: ${id}`);
				}
			}
		}
		expect(bad).toEqual([]);
	});

	it('unwraps object entries and surfaces their unverified flag', () => {
		const page = pages.find((p) => p.slug.includes('find-healthy-housing-inspector'))!;
		const key = page.sections.find((s: any) => s.heading === 'What this tool covers')!.fieldKey;

		const f = resolveField(page, `sections.${key}.paragraphs.0`)!;
		expect(f.value).toMatch(/assigns inspectors by neighborhood/);
		expect(f.unverified).toBe(true);
		expect(f.unverifiedReason).toMatch(/Confirm with HHVC/);
	});

	it('a rewrite keeps the unverified flag — editing is not verifying', () => {
		const page = pages.find((p) => p.slug.includes('find-healthy-housing-inspector'))!;
		const section = page.sections.find((s: any) => s.heading === 'What this tool covers')!;
		const id = `sections.${section.fieldKey}.paragraphs.0`;

		resolveField(page, id)!.set('Plainer wording.');

		const after = resolveField(page, id)!;
		expect(after.value).toBe('Plainer wording.');
		// Still an object, still flagged: a reviewer rewriting copy has not
		// thereby confirmed it with HHVC.
		expect(after.unverified).toBe(true);
		expect(after.unverifiedReason).toMatch(/Confirm with HHVC/);
	});

	it('round-trips a write back into the page object', () => {
		const page = withKeys(allPages[0]);
		const id = expectedIds(page).find((x) => x.includes('.paragraphs.'))!;

		const before = resolveField(page, id)!;
		expect(typeof before.value).toBe('string');

		before.set('Rewritten by the resolver.');

		// Re-resolved, not re-read from the closure — this is the property the
		// registry approach could not offer, since a captured value goes stale.
		expect(resolveField(page, id)!.value).toBe('Rewritten by the resolver.');
	});

	it('carries the same display label the components show', () => {
		const page = withKeys(allPages.find((p) => (p.sections ?? []).length > 1)!);
		const secondKey = page.sections[1].fieldKey;

		expect(resolveField(page, 'title')!.name).toBe('Title');
		expect(resolveField(page, `sections.${secondKey}.heading`)!.name).toBe('Section [2] Heading');
	});

	describe('returns null rather than guessing', () => {
		const page = withKeys(allPages[0]);

		it.each([
			['an unknown top-level key', 'nonsense'],
			['a section key that does not exist', 'sections.no-such-section.heading'],
			['an index past the end', 'sections.' + page.sections[0].fieldKey + '.paragraphs.9999'],
			['a malformed path', 'sections.'],
			['an empty id', '']
		])('%s', (_label, id) => {
			expect(resolveField(page, id)).toBeNull();
		});

		it('a null page', () => {
			expect(resolveField(null, 'title')).toBeNull();
		});
	});

	it('resolveFields drops stale ids instead of returning holes', () => {
		const page = withKeys(allPages[0]);
		const good = 'title';
		const out = resolveFields(page, [good, 'sections.gone.heading', 'summary']);

		// Two of three resolve, and the caller gets no nulls to guard against.
		expect(out.map((o) => o.fieldId)).not.toContain('sections.gone.heading');
		expect(out.every((o) => o.field !== null)).toBe(true);
		expect(out[0].fieldId).toBe(good);
	});
});
