import { describe, expect, it, vi } from 'vitest';
import { filterPages, matchesQuery, type StatusFilter } from './filter';

const titles: Record<string, string> = {
	'topic-mold--about': 'About Mold',
	'topic-rodents--about': 'Rats and Mice',
	'service-report-pests': 'Report a pest problem',
	'topic-lead--about': 'Lead hazards',
	'proposed-noise--about': 'Noise complaints'
};

// `proposed-noise--about` is deliberately absent: a corpus page with no review row.
const statuses: Record<string, string> = {
	'topic-mold--about': 'needs-review',
	'topic-rodents--about': 'revise',
	'service-report-pests': 'blocked',
	'topic-lead--about': 'approved'
};

const paths = Object.keys(titles);
const titleOf = (path: string) => titles[path] ?? path;
const statusOf = (path: string) => statuses[path];

const run = (query: string, status: StatusFilter, over: readonly string[] = paths) =>
	filterPages({ paths: over, query, status, statusOf, titleOf });

describe('filterPages query', () => {
	it('matches everything on an empty query', () => {
		expect(run('', 'all')).toEqual(paths);
	});

	it('matches everything on a whitespace-only query', () => {
		expect(run('  \t ', 'all')).toEqual(paths);
	});

	it('matches on the title when the path does not contain the query', () => {
		expect(run('mice', 'all')).toEqual(['topic-rodents--about']);
	});

	it('matches on the path when the title does not contain the query', () => {
		expect(run('rodents', 'all')).toEqual(['topic-rodents--about']);
	});

	it('ignores case in the query', () => {
		expect(run('RATS AND', 'all')).toEqual(['topic-rodents--about']);
		expect(run('TOPIC-LEAD', 'all')).toEqual(['topic-lead--about']);
	});

	it('ignores case in the title and the path', () => {
		expect(
			filterPages({
				paths: ['Topic-MOLD'],
				query: 'topic-mold',
				status: 'all',
				statusOf,
				titleOf: () => 'x'
			})
		).toEqual(['Topic-MOLD']);
		expect(run('about mold', 'all')).toEqual(['topic-mold--about']);
	});

	it('trims the query before matching', () => {
		expect(run('  mold  ', 'all')).toEqual(['topic-mold--about']);
	});

	it('returns nothing when neither title nor path contains the query', () => {
		expect(run('asbestos', 'all')).toEqual([]);
	});
});

describe('filterPages status', () => {
	it.each([
		['needs-review', 'topic-mold--about'],
		['revise', 'topic-rodents--about'],
		['blocked', 'service-report-pests'],
		['approved', 'topic-lead--about']
	] as const)('%s keeps only pages with that status', (status, expected) => {
		expect(run('', status)).toEqual([expected]);
	});

	it('all keeps every page and never asks for a status', () => {
		const spy = vi.fn(statusOf);
		expect(filterPages({ paths, query: '', status: 'all', statusOf: spy, titleOf })).toEqual(paths);
		expect(spy).not.toHaveBeenCalled();
	});

	it('a page with no review row is not needs-review', () => {
		expect(statusOf('proposed-noise--about')).toBeUndefined();
		expect(run('', 'needs-review')).not.toContain('proposed-noise--about');
	});

	it('a page with no review row matches no specific status', () => {
		for (const status of ['needs-review', 'revise', 'blocked', 'approved'] as const) {
			expect(run('', status, ['proposed-noise--about'])).toEqual([]);
		}
	});

	it('a page with no review row is included under all', () => {
		expect(run('', 'all')).toContain('proposed-noise--about');
		expect(run('noise', 'all')).toEqual(['proposed-noise--about']);
	});
});

describe('filterPages composition', () => {
	it('requires both the query and the status to match', () => {
		// 'about' hits four paths; only one of them is `revise`.
		expect(run('about', 'all')).toHaveLength(4);
		expect(run('about', 'revise')).toEqual(['topic-rodents--about']);
		// Query matches, status does not.
		expect(run('mold', 'approved')).toEqual([]);
		// Status matches, query does not.
		expect(run('mold', 'blocked')).toEqual([]);
	});

	it('preserves the input order', () => {
		const reversed = [...paths].reverse();
		expect(run('', 'all', reversed)).toEqual(reversed);
		expect(run('about', 'all', reversed)).toEqual([
			'proposed-noise--about',
			'topic-lead--about',
			'topic-rodents--about',
			'topic-mold--about'
		]);
	});

	it('returns a new array and leaves the input untouched', () => {
		const input = Object.freeze([...paths]);
		const out = run('', 'all', input);
		expect(out).not.toBe(input);
		expect(out).toEqual(paths);
	});
});

describe('matchesQuery', () => {
	it('applies the title-or-path rule on its own', () => {
		expect(matchesQuery('', 'T', 'p')).toBe(true);
		expect(matchesQuery(' MOLD ', 'About Mold', 'x')).toBe(true);
		expect(matchesQuery('topic', 'About Mold', 'Topic-mold')).toBe(true);
		expect(matchesQuery('lead', 'About Mold', 'topic-mold')).toBe(false);
	});
});
