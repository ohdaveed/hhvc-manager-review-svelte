import { describe, it, expect } from 'vitest';
import { allPages } from '$lib/data';
import { buildWalkthrough, karlFormUrl } from './walkthrough';

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
			const w = buildWalkthrough(page, allPages);
			expect(w.steps.length, `${page.slug} has no steps`).toBeGreaterThan(0);
			expect(w.type, `${page.slug} has no type`).not.toBe('');
		}
	});

	it('numbers steps continuously from 1, with stable unique ids', () => {
		for (const page of allPages) {
			const w = buildWalkthrough(page, allPages);
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
		const w = buildWalkthrough(page, allPages);
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
			for (const step of buildWalkthrough(page, allPages).steps) {
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
				for (const step of buildWalkthrough(page, allPages).steps) {
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
				for (const step of buildWalkthrough(page, allPages).steps) {
					if (step.outcome === 'FLAG') expect(step.severity).toBeDefined();
					else expect(step.severity).toBeUndefined();
				}
			}
		});
	});
});
