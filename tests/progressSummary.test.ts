/**
 * @vitest-environment jsdom
 *
 * The landing card's end state. Its total counts corpus pages with no review
 * row, which nothing in the app can decide, so "every page has a decision"
 * would contradict the count above it. It must name them instead.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ProgressSummary from '../src/lib/components/landing/ProgressSummary.svelte';

const base = {
	counts: { approved: 33 },
	hasNext: false,
	onShow: () => {}
};

describe('ProgressSummary end state', () => {
	it('says every page has a decision when every page is in the review', () => {
		render(ProgressSummary, { ...base, decided: 33, total: 33 });
		expect(screen.getByText('Every page has a decision.')).toBeTruthy();
	});

	it('names the pages not in the review rather than claim all are decided', () => {
		render(ProgressSummary, { ...base, decided: 33, total: 38, unreviewed: 5 });
		expect(screen.queryByText('Every page has a decision.')).toBeNull();
		expect(
			screen.getByText(
				/Every page in the review has a decision\.\s*5\s*pages are not in the review yet\./
			)
		).toBeTruthy();
	});
});
