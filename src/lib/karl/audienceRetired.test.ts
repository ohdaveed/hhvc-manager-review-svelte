/**
 * The page-level `audience` field is retired (2026-11-26), and stays retired.
 *
 * It had special handling in four places: the renderer drew it under the What
 * to know box; the transcript placed it as an Information page's first block
 * and gave every other type a bespoke "decision, not a gap" reason; placement
 * numbered Information blocks around it; and the field extractor gave it
 * `audience.N` ids. Yesterday's audit had already removed or folded every list
 * on a page type Karl has no home for. The 13 left, all on Information pages,
 * became ordinary "Who this information is for" sections, so what goes into
 * Karl is unchanged. That is what these tests hold.
 */
import { describe, it, expect } from 'vitest';
import { buildTranscript } from '$lib/legacy-core/karl-transcript.js';
import { allPages, pagesByKey } from '$lib/data/index';
import { extractFields } from '$lib/corpus/fields';

type Entry = { rawName: string; fields: { label: string; value: string }[] };
type Transcript = {
	entries: Entry[];
	unmapped: { path: string; reason: string }[];
};
const transcriptFor = (page: object) => buildTranscript(page, null, pagesByKey) as Transcript;

describe('the audience field is retired', () => {
	it('is on no corpus page', () => {
		const carrying = (allPages as { slug: string; audience?: unknown }[])
			.filter((p) => 'audience' in p)
			.map((p) => p.slug);
		expect(carrying).toEqual([]);
	});

	it('is reported like any unknown field if a page brings it back', () => {
		const page = { ...pagesByKey.rodentsReport, audience: ['A tenant'] };
		const gap = transcriptFor(page).unmapped.find((u) => u.path === 'audience');
		expect(gap?.reason).toBe(
			'The page carries `audience`, and no Transaction panel documented in the field map accepts it.'
		);
	});

	it('mints no field id', () => {
		const page = { ...pagesByKey.afterReport, audience: ['A tenant'] };
		expect(Object.keys(extractFields(page)).filter((id) => id.startsWith('audience'))).toEqual([]);
	});
});

describe('the 13 former Information audiences are ordinary sections', () => {
	const information = (allPages as { type?: string; sections: { heading?: string }[] }[]).filter(
		(p) => p.sections[0]?.heading === 'Who this information is for' && p.type === 'Information'
	);

	it('covers all 13', () => {
		expect(information).toHaveLength(13);
	});

	it('is still the first Information section block, titled as the live pattern titles it', () => {
		for (const page of information) {
			const first = transcriptFor(page).entries.find((e) => e.rawName === 'information_section');
			expect(first?.fields[0], String((page as { slug?: string }).slug)).toEqual({
				label: 'Title',
				value: 'Who this information is for'
			});
			expect(first?.fields[1].value.startsWith('- ')).toBe(true);
		}
	});
});
