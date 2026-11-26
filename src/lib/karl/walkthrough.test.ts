import { describe, it, expect } from 'vitest';
import { allPages, pagesByKey } from '$lib/data';
import { buildWalkthrough, karlFormUrl, staleEditsMarkdown } from './walkthrough';
import { gapPages, pagesByKeyWithGaps } from './gapFixtures';
import { toStorePage } from '$lib/stores/pageData.svelte';

/**
 * The walkthrough is GENERATED from the Karl panel inventory, so these tests
 * run against the real corpus rather than a fixture wherever they can. A
 * fixture would only prove the mapper is self-consistent; the build plan's
 * actual requirement is that all 29 pages get a correct list, and the failure
 * mode it warns about -- confident invention -- is invisible to a fixture.
 */
describe('buildWalkthrough', () => {
	it('produces a step list for every page in the corpus', () => {
		for (const page of allPages) {
			const w = buildWalkthrough(page, pagesByKey);
			expect(w.steps.length, `${page.slug} has no steps`).toBeGreaterThan(0);
			expect(w.type, `${page.slug} has no type`).not.toBe('');
		}
	});

	it('numbers steps continuously from 1, with stable unique ids', () => {
		for (const page of allPages) {
			const w = buildWalkthrough(page, pagesByKey);
			expect(w.steps.map((s) => s.n)).toEqual(w.steps.map((_, i) => i + 1));
			expect(new Set(w.steps.map((s) => s.id)).size).toBe(w.steps.length);
		}
	});

	it('keeps the form order rather than grouping by outcome', () => {
		// Re-sorting would send the reviewer back up the real Karl form. The
		// transcript emits panels in the form's order, so step order must be
		// exactly entry order -- asserted here via the first two Content fields,
		// which every type opens with.
		const page = allPages.find((p) => p.type === 'Transaction')!;
		const w = buildWalkthrough(page, pagesByKey);
		expect(w.steps[0].rawName).toBe('title');
		expect(w.steps[1].rawName).toBe('description');
	});

	it('derives the add-page URL from the content type, never hardcoding one', () => {
		// Two of the eight do not follow from the type name by any rule.
		expect(karlFormUrl('Transaction')).toContain('/sf/transaction/');
		expect(karlFormUrl('About us')).toContain('/sf/aboutpage/');
		expect(karlFormUrl('Resource Collection')).toContain('/sf/resourcecollection/');

		// Every type present in the corpus resolves to a real add-page form.
		for (const page of allPages) {
			expect(karlFormUrl(page.type), `${page.type}`).toMatch(/\/admin\/pages\/add\/sf\/\w+\/2\/$/);
		}
	});

	it('falls back to the page list rather than a wrong form for an unknown type', () => {
		expect(karlFormUrl('Nonesuch')).toBe('https://api.sf.gov/admin/pages/');
	});

	it('offers no Copy button for a value that is absent or blank', () => {
		for (const page of allPages) {
			for (const step of buildWalkthrough(page, pagesByKey).steps) {
				for (const value of step.values) {
					expect(value.value.trim()).not.toBe('');
				}
			}
		}
	});

	describe('gap severity', () => {
		/**
		 * The trap this guards: all three flagged panels carry `required: true`,
		 * but `cost` is a struct whose RADIO is required once the block exists,
		 * and the block itself is optional. Keying off `required` alone told a
		 * reviewer the page could not be saved without a Cost, which is false --
		 * the field map's own required column reads `no` for it.
		 */
		const severities = () => {
			const out: Record<string, string> = {};
			for (const page of allPages) {
				for (const step of buildWalkthrough(page, pagesByKey).steps) {
					if (step.severity) out[step.rawName] = step.severity;
				}
			}
			return out;
		};

		it('treats a genuinely required panel as blocking', () => {
			expect(severities().primary_agency).toBe('blocking');
		});

		it('treats a conditional requirement inside an optional block as advisory', () => {
			expect(severities().cost).toBe('advisory');
		});

		it('sets a severity on flagged steps only', () => {
			for (const page of allPages) {
				for (const step of buildWalkthrough(page, pagesByKey).steps) {
					if (step.outcome === 'FLAG') expect(step.severity).toBeDefined();
					else expect(step.severity).toBeUndefined();
				}
			}
		});
	});

	/**
	 * The walkthrough is a RE-PRESENTATION of the transcript, so anything the
	 * transcript carries and the walkthrough drops is an instruction an editor
	 * never receives. Each case below is one such loss, measured across the
	 * corpus before it was fixed.
	 */
	describe('carries what the transcript carries', () => {
		it("transcribes the reviewer's edits, not the original mockup copy", () => {
			const page = allPages.find((p) => p.type === 'About us')!;
			const record = {
				section_edits: {},
				decision: 'Approved',
				edited_title: 'A TITLE THE REVIEWER WROTE'
			};

			const titleOf = (w: ReturnType<typeof buildWalkthrough>) =>
				w.steps.flatMap((s) => s.values).find((v) => v.label === 'Title')?.value;

			expect(titleOf(buildWalkthrough(page, pagesByKey, record))).toBe(
				'A TITLE THE REVIEWER WROTE'
			);
			// Without the record it is the mockup's own title -- the state the
			// drawer was in while the Help tab showed the edited version.
			expect(titleOf(buildWalkthrough(page, pagesByKey))).toBe(page.title);
		});

		it('names chooser options instead of stringifying the record', () => {
			let choices = 0;
			for (const page of allPages) {
				for (const step of buildWalkthrough(page, pagesByKey).steps) {
					for (const choice of step.choices) {
						choices++;
						// `.map(String)` produced this for all 157 of them.
						expect(choice.label).not.toBe('[object Object]');
						expect(choice.label.trim()).not.toBe('');
					}
				}
			}
			expect(choices).toBeGreaterThan(0);
		});

		it('resolves chooser labels to page titles, which an array keying cannot', () => {
			// `pageKey` is the corpus key and `label` the destination's title, so
			// a label that still equals its key means the target did not resolve.
			const page = allPages.find((p) => p.type === 'Agency')!;
			const resolved = buildWalkthrough(page, pagesByKey).steps.flatMap((s) => s.choices);
			expect(resolved.length).toBeGreaterThan(0);
			expect(resolved.every((c) => c.label !== c.pageKey)).toBe(true);
		});

		it("carries the links that have to be rebuilt with Karl's Link tool", () => {
			const links = allPages.flatMap((page) =>
				buildWalkthrough(page, pagesByKey).steps.flatMap((s) => s.links)
			);
			expect(links.length).toBeGreaterThan(0);
			// The representation is what tells the editor WHERE it goes, so an
			// unresolved one is as useless here as it is in the markdown.
			expect(links.some((l) => l.representation.includes('Internal link'))).toBe(true);
			expect(links.every((l) => !l.representation.includes('unresolved target'))).toBe(true);
		});

		it('reports unmapped content as its own register, not as a flag', () => {
			// One corpus section is unmapped: mosquitoControl's external-link cards,
			// whose karl note flags them as having no clean mapping. Until
			// 2026-11-26 the card classifier read that note's "no accompanying
			// Title and text block" as naming one, which hid them here. The rest
			// of the register is exercised through the gap fixtures.
			const corpusUnmapped = allPages.flatMap((page) =>
				buildWalkthrough(page, pagesByKey)
					.gaps.filter((g) => g.kind === 'unmapped')
					.map((g) => `${page.slug} ${g.path}`)
			);
			expect(corpusUnmapped).toEqual(['sf.gov/mosquito-control-program sections.2.cards']);
			const gaps = Object.values(gapPages).flatMap(
				(page) => buildWalkthrough(page as never, pagesByKeyWithGaps).gaps
			);
			const unmapped = gaps.filter((g) => g.kind === 'unmapped');
			expect(unmapped.length).toBeGreaterThan(0);
			expect(unmapped.every((g) => g.path !== '' && g.reason !== '')).toBe(true);
			// Flags come first: actionable before merely recorded. Per page, since
			// the order is a property of one page's list and not of the corpus.
			for (const page of Object.values(gapPages)) {
				const kinds = buildWalkthrough(page as never, pagesByKeyWithGaps).gaps.map((g) => g.kind);
				const firstUnmapped = kinds.indexOf('unmapped');
				const lastFlag = kinds.lastIndexOf('flag');
				if (firstUnmapped !== -1 && lastFlag !== -1) {
					expect(lastFlag, `${String(page.slug)} interleaves flags and unmapped`).toBeLessThan(
						firstUnmapped
					);
				}
			}
		});

		it('renders the markdown export from the same transcript as the steps', () => {
			const page = allPages.find((p) => p.type === 'About us')!;
			const w = buildWalkthrough(page, pagesByKey, {
				section_edits: {},
				decision: 'Approved',
				edited_title: 'A TITLE THE REVIEWER WROTE'
			});
			expect(w.markdown).toContain('Karl transcript');
			expect(w.markdown).toContain('A TITLE THE REVIEWER WROTE');
			// Approved, so the banner must be absent -- it is the one thing the
			// export carries that the drawer does not.
			expect(w.markdown).not.toContain('NOT APPROVED');
			expect(buildWalkthrough(page, pagesByKey).markdown).toContain('NOT APPROVED');
		});
	});
});

describe('stale edits in the transcript', () => {
	const page = allPages[0];
	const record = {
		section_edits: {},
		decision: 'Needs review',
		expired: { title: { accepted: 'Saved title', base: 'Base title now' } },
		orphaned: { 'sections.gone.heading': 'Was a heading' }
	};

	it('lists expired and orphaned edits above the first panel', () => {
		const w = buildWalkthrough(page, pagesByKey, record);
		expect(w.stale.map((e) => e.kind)).toEqual(['expired', 'orphaned']);
		const section = w.markdown.indexOf('## Saved edits that need a decision');
		expect(section).toBeGreaterThan(0);
		expect(section).toBeLessThan(w.markdown.indexOf('\n### '));
		expect(w.markdown).toContain('Base copy now: Base title now');
		expect(w.markdown).toContain('**Orphaned** `sections.gone.heading`');
	});

	it('renders nothing extra when no edit is stale', () => {
		expect(staleEditsMarkdown([])).toBe('');
		const plain = buildWalkthrough(page, pagesByKey, null);
		expect(plain.stale).toEqual([]);
		expect(plain.markdown).not.toContain('Saved edits that need a decision');
	});
});

describe('the page object the layout hands over', () => {
	// `pageStore.pages[n]` is built by `toStorePage`, which adds the routable
	// `id`. It is not copy, but the transcript's sweep reports any page key it
	// does not recognise, so the drawer listed "`id` — The page carries `id`,
	// and no About us panel documented in the field map accepts it." under No
	// Karl field for this content, on every page. Placement already strips it.
	it.each(allPages.map((p) => [(p as { slug: string }).slug, p] as const))(
		'%s: no derived key reported as unmapped',
		(_slug, page) => {
			const corpusKeys = new Set(Object.keys(page as object));
			const derived = Object.keys(toStorePage(page as object)).filter((k) => !corpusKeys.has(k));
			const w = buildWalkthrough(toStorePage(page as object) as never, pagesByKey);
			const unmapped = w.gaps.filter((g) => g.kind === 'unmapped').map((g) => g.path);
			expect(unmapped.filter((path) => derived.includes(path))).toEqual([]);
		}
	);
});
