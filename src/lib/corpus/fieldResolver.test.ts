import { describe, it, expect } from 'vitest';
import { resolveField, resolveFields } from './fieldResolver';
import { deriveFieldKey } from './fieldKey';
import { extractCopy } from './fields';
import { allPages } from '$lib/data';

/**
 * The resolver is what multi-field editing reads and writes through, so its
 * failure mode is a rewrite landing on the wrong field — or silently on
 * nothing. These tests run against the REAL corpus rather than a fixture, so a
 * shape added to `Section.svelte` later fails here first instead of in a panel.
 */

/** Mirrors what `pageData.svelte.ts` does when it builds `pageStore.pages`. */
/**
 * Same boundary as `fieldResolver.ts`'s `AnyPage`: these helpers walk the real
 * corpus modules, which carry no shared type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CorpusShape = Record<string, any>;

function withKeys(page: CorpusShape): CorpusShape {
	return {
		...page,
		sections: (page.sections ?? []).map((s: CorpusShape, i: number) => ({
			...s,
			fieldKey: deriveFieldKey(s, i)
		}))
	};
}

/** Every id `Page.svelte` and `Section.svelte` emit, for one page. */
function expectedIds(page: CorpusShape): string[] {
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
		const key = page.sections.find(
			(s: CorpusShape) => s.heading === 'What this tool covers'
		)!.fieldKey;

		const f = resolveField(page, `sections.${key}.paragraphs.0`)!;
		expect(f.value).toMatch(/assigns inspectors by neighborhood/);
		expect(f.unverified).toBe(true);
		expect(f.unverifiedReason).toMatch(/Confirm with HHVC/);
	});

	it('a rewrite keeps the unverified flag — editing is not verifying', () => {
		const page = pages.find((p) => p.slug.includes('find-healthy-housing-inspector'))!;
		const section = page.sections.find((s: CorpusShape) => s.heading === 'What this tool covers')!;
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

/**
 * Group D: `resolveField` used to know only the seven path shapes
 * `extractFields` advertises as edit targets. `extractCopy` -- the canonical
 * vocabulary every reader-visible string in the corpus, which `corpus.lock`
 * hashes -- emits many more, and every one of those silently vanished from the
 * Fields panel (`resolveFields` drops nulls with no error). These tests cover
 * the path families added to close that gap.
 */
describe('resolveField — extractCopy parity (Group D)', () => {
	const pages = allPages.map(withKeys);
	const findPage = (slug: string) => pages.find((p) => p.slug === slug)!;

	it('resolves every path extractCopy emits, not just the original seven', () => {
		const unresolved: string[] = [];
		let checked = 0;
		for (const raw of allPages) {
			const stamped = withKeys(raw);
			for (const id of Object.keys(extractCopy(raw))) {
				checked++;
				if (!resolveField(stamped, id)) unresolved.push(`${raw.slug} :: ${id}`);
			}
		}
		expect(checked).toBeGreaterThan(500);
		expect(unresolved).toEqual([]);
	});

	it('whatToKnow.cost', () => {
		const page = findPage('sf.gov/step-by-step--get-ready-for-a-housing-inspection');
		const f = resolveField(page, 'whatToKnow.cost')!;
		expect(f.value).toBe('Free');
		f.set('Free with a valid 311 report');
		expect(resolveField(page, 'whatToKnow.cost')!.value).toBe('Free with a valid 311 report');
	});

	it('whatToKnow.thingsToKnow.N (plain-string form)', () => {
		const page = findPage('sf.gov/step-by-step--get-ready-for-a-housing-inspection');
		const id = 'whatToKnow.thingsToKnow.0';
		expect(resolveField(page, id)!.value).toMatch(/may contact you/);
		resolveField(page, id)!.set('Rewritten thing to know.');
		expect(resolveField(page, id)!.value).toBe('Rewritten thing to know.');
	});

	it('whatToKnow.thingsToKnow.N.{label,text} (labelled form)', () => {
		const page = findPage('sf.gov/lookup-residential-health-code-violations');
		const labelId = 'whatToKnow.thingsToKnow.0.label';
		const textId = 'whatToKnow.thingsToKnow.0.text';
		expect(resolveField(page, labelId)!.value).toBe('What this tool covers');
		expect(resolveField(page, textId)!.value).toMatch(/same Environmental Health lookup tool/);
		resolveField(page, labelId)!.set('New label');
		resolveField(page, textId)!.set('New text');
		expect(resolveField(page, labelId)!.value).toBe('New label');
		expect(resolveField(page, textId)!.value).toBe('New text');
	});

	it('sections.<key>.cards.N.{title,text,url}, and leaves cards.N.target null', () => {
		const page = findPage('sf.gov/report/health-code-article-11-plain-language');
		const base = 'sections.mold-and-lead-hazards.cards.1';
		expect(resolveField(page, `${base}.title`)!.value).toBe(
			'Find Citywide healthy housing services'
		);
		expect(resolveField(page, `${base}.url`)!.value).toMatch(/^https:\/\/www\.sf\.gov/);
		resolveField(page, `${base}.url`)!.set('https://example.com/updated');
		expect(resolveField(page, `${base}.url`)!.value).toBe('https://example.com/updated');
		// Structural routing id, deliberately unread by extractCopy.
		expect(resolveField(page, 'sections.mold-and-lead-hazards.cards.0.target')).toBeNull();
	});

	it('sections.<key>.facts.N.{label,text}', () => {
		const page = findPage('sf.gov/mosquito-education-workshop');
		const base = 'sections.questions-before-you-apply.facts.1';
		expect(resolveField(page, `${base}.label`)!.value).toBe('Service area');
		expect(resolveField(page, `${base}.text`)!.value).toMatch(/schools, camps, museums/);
		resolveField(page, `${base}.text`)!.set('Updated service area.');
		expect(resolveField(page, `${base}.text`)!.value).toBe('Updated service area.');
	});

	it('sections.<key>.table.R.C', () => {
		const page = findPage('sf.gov/report/health-code-article-11-plain-language');
		const id = 'sections.article-11-sections-at-a-glance.table.1.0';
		expect(resolveField(page, id)!.value).toBe('**Sec. 581(a)**');
		resolveField(page, id)!.set('Sec. 581(a)');
		expect(resolveField(page, id)!.value).toBe('Sec. 581(a)');
	});

	it('sections.<key>.{button,buttonUrl}, and leaves the sibling buttonStyle null', () => {
		const page = findPage('sf.gov/mosquito-education-workshop');
		const buttonId = 'sections.request-a-workshop.button';
		const urlId = 'sections.request-a-workshop.buttonUrl';
		expect(resolveField(page, buttonId)!.value).toBe('Request a workshop online');
		expect(resolveField(page, urlId)!.value).toMatch(/fillout\.com/);
		resolveField(page, buttonId)!.set('Request now');
		expect(resolveField(page, buttonId)!.value).toBe('Request now');

		// Structural presentation flag, sibling of a real button/buttonUrl pair.
		const rodents = findPage('sf.gov/report-rats-mice-four-legged-problems');
		expect(resolveField(rodents, 'sections.how-your-report-is-processed.buttonStyle')).toBeNull();
	});

	it('sections.<key>.steps.N.{title,button,buttonUrl}', () => {
		const page = findPage('sf.gov/step-by-step--get-ready-for-a-housing-inspection');
		const id = 'sections.before-the-inspector-arrives.steps.0.title';
		expect(resolveField(page, id)!.value).toBe('Clear access to the reported area');
		resolveField(page, id)!.set('Clear a path first.');
		expect(resolveField(page, id)!.value).toBe('Clear a path first.');

		// No corpus step carries button/buttonUrl yet, so this half exercises a
		// minimal fixture rather than real data.
		const fixture = withKeys({
			slug: 'fixture',
			sections: [
				{ heading: 'S', steps: [{ title: 'T', button: 'Go', buttonUrl: 'https://example.com' }] }
			]
		});
		expect(resolveField(fixture, 'sections.s.steps.0.button')!.value).toBe('Go');
		expect(resolveField(fixture, 'sections.s.steps.0.buttonUrl')!.value).toBe(
			'https://example.com'
		);
	});

	it('sections.<key>.steps.N.text.J keeps the unverified flag through a write', () => {
		const page = findPage('sf.gov/step-by-step--get-ready-for-a-housing-inspection');
		const id = 'sections.before-the-inspector-arrives.steps.0.text.0';

		const before = resolveField(page, id)!;
		expect(before.value).toMatch(/Clear a path/);
		expect(before.unverified).toBe(true);
		expect(before.unverifiedReason).toMatch(/Confirm with HHVC/);

		before.set('Rewritten step text.');

		const after = resolveField(page, id)!;
		expect(after.value).toBe('Rewritten step text.');
		expect(after.unverified).toBe(true);
		expect(after.unverifiedReason).toMatch(/Confirm with HHVC/);
	});

	it('sections.<key>.steps.N.bullets.J', () => {
		const page = findPage('sf.gov/step-by-step--get-ready-for-a-housing-inspection');
		const id = 'sections.before-the-inspector-arrives.steps.2.bullets.0';
		expect(resolveField(page, id)!.value).toMatch(/Photos of the condition/);
		resolveField(page, id)!.set('Rewritten bullet.');
		expect(resolveField(page, id)!.value).toBe('Rewritten bullet.');
	});

	it('sections.<key>.steps.N.callout.{title,text}', () => {
		const page = findPage('sf.gov/pay-your-annual-healthy-housing-fee-apartment-buildings');
		const titleId = 'sections.what-to-do.steps.1.callout.title';
		const textId = 'sections.what-to-do.steps.1.callout.text';
		expect(resolveField(page, titleId)!.value).toBe(
			'Annual fee and reinspection fees are different'
		);
		resolveField(page, textId)!.set('Rewritten callout text.');
		expect(resolveField(page, textId)!.value).toBe('Rewritten callout text.');
	});

	it('spotlight.{title,paragraphs.N,button,buttonUrl}', () => {
		const page = findPage('sf.gov/report/health-code-article-11-plain-language');
		expect(resolveField(page, 'spotlight.title')!.value).toBe('Read the full Health Code');
		expect(resolveField(page, 'spotlight.paragraphs.0')!.value).toMatch(/plain-language summary/);
		// Compared against the corpus's own value, not a literal: this test is
		// about the RESOLVER, and pinning copy here means an editorial change
		// breaks a resolver test. It just did -- this button was shortened to fit
		// Karl's 25-character cap and took this assertion down with it.
		expect(resolveField(page, 'spotlight.button')!.value).toBe(page.spotlight.button);
		expect(resolveField(page, 'spotlight.buttonUrl')!.value).toMatch(/amlegal\.com/);
		resolveField(page, 'spotlight.button')!.set('Read Article 11');
		expect(resolveField(page, 'spotlight.button')!.value).toBe('Read Article 11');
	});

	it('contact.{phone,email,other}.N', () => {
		const page = findPage('sf.gov/information--article-11-compliance-for-property-owners');
		expect(resolveField(page, 'contact.phone.0')!.value).toBe('311 (call or text)');
		expect(resolveField(page, 'contact.email.0')!.value).toBe('ehb@sfdph.org');
		expect(resolveField(page, 'contact.other.0')!.value).toMatch(/Environmental Health/);
		resolveField(page, 'contact.phone.1')!.set('415-000-0000');
		expect(resolveField(page, 'contact.phone.1')!.value).toBe('415-000-0000');
	});

	it('partnerAgencies.N.{title,url}', () => {
		const page = findPage('sf.gov/find-complaints-and-inspection-records');
		expect(resolveField(page, 'partnerAgencies.0.title')!.value).toBe(
			'Department of Public Health'
		);
		resolveField(page, 'partnerAgencies.0.url')!.set('https://example.com/dph');
		expect(resolveField(page, 'partnerAgencies.0.url')!.value).toBe('https://example.com/dph');
	});

	it('page-level metaDescription, reportDate, seoTitle, topicTag', () => {
		const article11 = findPage('sf.gov/report/health-code-article-11-plain-language');
		expect(resolveField(article11, 'reportDate')!.value).toBe('August 7, 2026');
		expect(resolveField(article11, 'seoTitle')!.value).toBe(
			'Health Code Article 11 in plain language'
		);
		resolveField(article11, 'metaDescription')!.set('Updated description.');
		expect(resolveField(article11, 'metaDescription')!.value).toBe('Updated description.');

		const compliance = findPage('sf.gov/information--article-11-compliance-for-property-owners');
		expect(resolveField(compliance, 'topicTag')!.value).toBe(
			'Agency: Healthy Housing and Vector Control'
		);
	});

	it('returns null for structural/annotation paths extractCopy also excludes', () => {
		const page = findPage('sf.gov/report/health-code-article-11-plain-language');
		expect(resolveField(page, 'slug')).toBeNull();
		expect(resolveField(page, 'type')).toBeNull();
		expect(resolveField(page, 'reading')).toBeNull();
		expect(resolveField(page, 'sections.how-to-use-this-guide.callout.variant')).toBeNull();
		expect(resolveField(page, 'sections.mold-and-lead-hazards.cards.0.target')).toBeNull();
	});
});

describe('unverified metadata survives resolution', () => {
	// FieldsPanel derives its "no confirmed source" callout from
	// `field.unverified` on the RESOLVED field, while the mockup gets it from
	// FactsBlock's own prop. When the resolver dropped it, the page warned and
	// the panel did not -- so a reviewer could rewrite and approve an explicitly
	// unconfirmed phone number without ever seeing the flag.
	const factsPage = () =>
		withKeys({
			title: 'T',
			summary: 'S',
			sections: [
				{
					heading: 'Top facts',
					facts: [
						{
							label: 'Contact',
							text: 'Call 415-252-3806',
							unverified: true,
							unverifiedReason: 'No tier-1 source; tier-1 cites 415-252-3800.'
						},
						{ label: 'Cost', text: 'Free' }
					]
				}
			]
		});

	it("surfaces a fact's sibling unverified flag and its reason", () => {
		const page = factsPage();
		const key = page.sections[0].fieldKey;
		const field = resolveField(page, `sections.${key}.facts.0.text`);

		expect(field?.unverified).toBe(true);
		expect(field?.unverifiedReason).toContain('415-252-3800');
	});

	it('leaves a confirmed fact unflagged', () => {
		const page = factsPage();
		const key = page.sections[0].fieldKey;

		expect(resolveField(page, `sections.${key}.facts.1.text`)?.unverified).toBeFalsy();
	});

	it('does not flag the label, which FactsBlock does not flag either', () => {
		const page = factsPage();
		const key = page.sections[0].fieldKey;

		expect(resolveField(page, `sections.${key}.facts.0.label`)?.unverified).toBeFalsy();
	});

	it('matches only own properties, so an inherited key is not a field', () => {
		const page = factsPage();

		// `'__proto__' in TOP_LEVEL_STRINGS` is true, which used to match and
		// return a field whose `name` was undefined.
		expect(resolveField(page, '__proto__')).toBeNull();
		expect(resolveField(page, 'constructor')).toBeNull();
	});
});
