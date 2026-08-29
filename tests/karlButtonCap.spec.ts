import { describe, it, expect } from 'vitest';
// @ts-expect-error -- legacy-core is untyped JS, ported from the vanilla app.
import { buildTranscript } from '../src/lib/legacy-core/karl-transcript.js';
import { allPages } from '../src/lib/data/index';

// The Karl Editor Help Center became the source of truth on 2026-08-23
// (field map, "Precedence, revised 2026-08-23"). Its 25-character button cap
// went from guidance to rule, and the live field's maxlength="255" from
// "the real limit" to a gap in the form.
//
// Before that, this transcript told the reviewer the cap was "editorial
// guidance, not a schema limit — the field accepts 255". That sentence is now
// the opposite of the instruction, and it is REVIEWER-FACING: HelpPanel
// renders these notes. A doc that says the cap binds while the tool says it
// does not is worse than either alone, so the behaviour is pinned here.
describe('button label cap (O14 / U24)', () => {
	const article11 = allPages.find((p) => p.slug.includes('health-code-article-11'));

	const notesFor = (page: unknown) => {
		const t = buildTranscript(page, null, allPages);
		const out: string[] = [];
		const walk = (n: unknown) => {
			if (!n || typeof n !== 'object') return;
			if (Array.isArray(n)) return n.forEach(walk);
			for (const [k, v] of Object.entries(n as Record<string, unknown>)) {
				if (k === 'notes' && Array.isArray(v)) out.push(...(v as string[]));
				else walk(v);
			}
		};
		walk(t);
		return out;
	};

	it('finds the page the corpus violation lives on', () => {
		expect(article11, 'health-code-article-11 must be in allPages').toBeTruthy();
	});

	it('flags the 27-character Spotlight label as over the limit', () => {
		// `allPages` is a union of the eight page shapes and only some carry a
		// spotlight, so this reads it through the same untyped-corpus boundary
		// `notesFor` already takes.
		const source = article11 as (Record<string, unknown> & { spotlight?: object }) | undefined;
		expect(source, 'health-code-article-11 must be in allPages').toBeTruthy();
		const overCapPage = {
			...source!,
			spotlight: { ...(source!.spotlight as object), button: 'View Health Code Article 11' }
		};
		const notes = notesFor(overCapPage);
		const flagged = notes.filter((n) => n.includes('27 characters'));

		// "View Health Code Article 11" — 27 chars, the only over-cap label in
		// the corpus. U19 reported the corpus clean because it swept section-
		// and step-level buttons and never reached the page-level Spotlight.
		expect(
			flagged.length,
			`expected an over-length note, got: ${JSON.stringify(notes)}`
		).toBeGreaterThan(0);
		expect(flagged[0]).toMatch(/over the 25-character limit/);
	});

	it('does not tell the reviewer the cap is optional', () => {
		expect(article11, 'health-code-article-11 must be in allPages').toBeTruthy();
		const notes = notesFor(article11!).join('\n');

		expect(notes).not.toMatch(/editorial guidance/);
		expect(notes).not.toMatch(/not a schema limit/);
		// The 255 may still be mentioned — as the form's permissiveness, which
		// is the thing being warned about — but never as what the reviewer may
		// author up to.
		expect(notes).not.toMatch(/the field accepts 255\./);
	});
});
