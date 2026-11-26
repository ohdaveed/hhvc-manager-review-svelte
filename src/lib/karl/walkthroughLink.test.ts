import { describe, expect, it } from 'vitest';
import { WALKTHROUGH_QUERY, wantsWalkthrough, withWalkthrough } from './walkthroughLink';

const at = (s: string) => new URL(s, 'https://example.test');

describe('wantsWalkthrough', () => {
	it('is true only for the exact value', () => {
		expect(wantsWalkthrough(at('/review/a?view=walkthrough'))).toBe(true);
		expect(wantsWalkthrough(at('/review/a'))).toBe(false);
		expect(wantsWalkthrough(at('/review/a?view=Walkthrough'))).toBe(false);
		expect(wantsWalkthrough(at('/review/a?view=sitemap'))).toBe(false);
	});

	it('matches the query string the home page links with', () => {
		expect(wantsWalkthrough(at(`/review/a${WALKTHROUGH_QUERY}`))).toBe(true);
	});
});

describe('withWalkthrough', () => {
	it('adds the parameter, keeping the others and the hash', () => {
		const next = withWalkthrough(at('/review/a?x=1#top'), true);
		expect(next.pathname + next.search + next.hash).toBe('/review/a?x=1&view=walkthrough#top');
	});

	it('removes it, keeping the others', () => {
		const next = withWalkthrough(at('/review/a?x=1&view=walkthrough'), false);
		expect(next.search).toBe('?x=1');
	});

	it('leaves a different `view` value alone when removing', () => {
		expect(withWalkthrough(at('/review/a?view=other'), false).search).toBe('?view=other');
	});

	it('returns a new URL rather than mutating its input', () => {
		const url = at('/review/a');
		withWalkthrough(url, true);
		expect(url.search).toBe('');
	});
});
