/**
 * `transcript.claims`: which Karl panel consumed each page path.
 *
 * The Karl outline labels every rendered element with the panel it lands in,
 * and this map is the only place that answer exists. Two properties matter:
 * every consumed path has a claimant (or the outline would show a placed
 * element as unlabelled), and the Promote tab and the sweep are not mistaken
 * for the last content panel (a scratch prototype attributed `slug`,
 * `seoTitle` and `metaDescription` to `redirect_url` exactly that way).
 */
import { describe, expect, it } from 'vitest';
import { buildTranscript } from '$lib/legacy-core/karl-transcript.js';
import { pagesByKey } from '$lib/data/index';

type Transcript = { consumed: string[]; claims: Record<string, string> };
const transcriptFor = (key: string) =>
	buildTranscript(
		(pagesByKey as Record<string, object>)[key],
		null,
		pagesByKey
	) as unknown as Transcript;

describe('transcript claims', () => {
	it.each(Object.keys(pagesByKey))('%s: every consumed path has a claimant', (key) => {
		const { consumed, claims } = transcriptFor(key);
		expect(Object.keys(claims).sort()).toEqual(consumed);
	});

	it('attributes the Promote tab to promote, not to the last content panel', () => {
		const { claims } = transcriptFor('rodentsReport');
		expect(claims.slug).toBe('promote');
		expect(claims.seoTitle).toBe('promote');
		expect(claims.metaDescription).toBe('promote');
	});

	it('names the panel each part of the rats report lands in', () => {
		const { claims } = transcriptFor('rodentsReport');
		expect(claims).toMatchObject({
			title: 'title',
			summary: 'description',
			'whatToKnow.thingsToKnow': 'things_to_know',
			'sections.0.heading': 'what_to_do',
			'sections.0.steps.1.button': 'what_to_do',
			'sections.0.steps.0.callout.text': 'what_to_do',
			'sections.1.heading': 'supporting_information',
			'sections.2.cards': 'related',
			partnerAgencies: 'partner_agencies'
		});
	});
});
