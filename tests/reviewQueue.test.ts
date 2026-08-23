/**
 * @vitest-environment jsdom
 *
 * The queue only ever renders with rows in `pagesStore`, and locally that store
 * is empty without a Supabase session -- so every row, the progress block and
 * the count pills go unseen in a browser. Each store is a plain Svelte 4
 * `writable`, so this fills them directly.
 *
 * `$lib/supabase` is mocked because `reviewState` imports it and it calls
 * `createClient` at module scope.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readable } from 'svelte/store';
import { render, screen } from '@testing-library/svelte';
import ReviewQueue from '../src/lib/components/workspace/ReviewQueue.svelte';
import { pageStore } from '../src/lib/stores/pageData.svelte.js';
import { firstQueuePath, QUEUE_STATUS_ORDER, type ReviewPage } from '../src/lib/stores/reviewState';

vi.mock('$lib/supabase', () => ({
	supabase: {
		auth: {},
		from: () => ({}),
		channel: () => ({ on: () => ({ subscribe: () => ({}) }) })
	}
}));

let currentSlug = 'topic-x--about';
vi.mock('$app/stores', () => ({
	page: readable({
		params: {
			get slug() {
				return currentSlug;
			}
		}
	})
}));

const { pagesStore, editsStore } = await import('../src/lib/stores/reviewState.js');

const row = (path: string, status: string) => ({
	id: `id-${path}`,
	review_id: 'r1',
	path,
	status,
	manager_notes: null,
	page_checks: null
});

describe('ReviewQueue', () => {
	beforeEach(() => {
		currentSlug = 'topic-x--about';
		editsStore.set([]);
		// The queue reads titles and page types from the static corpus, keyed by
		// the derived routable id -- not from the pages table, which has neither.
		pageStore.pages = [
			{ id: 'topic-x--about', title: 'About vector control', type: 'About us', sections: [] },
			{ id: 'topic-x--report', title: 'Report a problem', type: 'Transaction', sections: [] }
		];
	});

	it('says so when nothing has loaded', () => {
		pagesStore.set([]);
		render(ReviewQueue);
		expect(screen.getByText(/No pages loaded/)).toBeTruthy();
	});

	it('counts decisions, not rows', () => {
		pagesStore.set([
			row('topic-x--about', 'approved'),
			row('topic-x--report', 'needs-review'),
			row('topic-x--third', 'revise'),
			row('topic-x--fourth', 'blocked')
		]);
		render(ReviewQueue);

		// `needs-review` is the status every seeded row starts on, so it is the
		// only one that is not a decision.
		expect(screen.getByText('3 of 4 decided')).toBeTruthy();
		expect(screen.getByText('75%')).toBeTruthy();
	});

	it('gives the progress bar a text equivalent', () => {
		pagesStore.set([row('topic-x--about', 'approved'), row('topic-x--report', 'needs-review')]);
		render(ReviewQueue);

		// A bar split by colour alone says nothing to a screen reader.
		expect(screen.getByRole('img', { name: '1 of 2 pages decided, 50 percent' })).toBeTruthy();
	});

	it('renders a row per page, with the corpus title and page type', () => {
		pagesStore.set([row('topic-x--about', 'needs-review')]);
		render(ReviewQueue);

		expect(screen.getByText('About vector control')).toBeTruthy();
		expect(screen.getByText('About us')).toBeTruthy();
	});

	it('shows how many fields on a page have been edited', () => {
		pagesStore.set([row('topic-x--about', 'needs-review')]);
		editsStore.set([
			{ page_id: 'id-topic-x--about', field_id: 'title', new_content: 'a' },
			{ page_id: 'id-topic-x--about', field_id: 'summary', new_content: 'b' },
			{ page_id: 'id-topic-x--report', field_id: 'title', new_content: 'c' }
		]);
		render(ReviewQueue);

		expect(screen.getByText('About us · 2 edited fields')).toBeTruthy();
	});

	it('marks the page being reviewed as the current one', () => {
		pagesStore.set([row('topic-x--about', 'needs-review'), row('topic-x--report', 'needs-review')]);
		render(ReviewQueue);

		const current = screen.getByRole('link', { current: 'page' });
		expect(current.getAttribute('href')).toBe('/review/topic-x--about');
	});

	it('hides a status group that has no pages, and counts the ones that do', () => {
		pagesStore.set([row('topic-x--about', 'approved'), row('topic-x--report', 'approved')]);
		render(ReviewQueue);

		expect(screen.getByText('Approved')).toBeTruthy();
		expect(screen.queryByText('Blocked')).toBeNull();
		// The count pill sits beside the heading it belongs to.
		expect(screen.getByText('Approved').parentElement?.textContent).toContain('2');
	});
});

describe('firstQueuePath', () => {
	const row = (path: string, status: ReviewPage['status']): ReviewPage => ({
		id: `id-${path}`,
		review_id: 'r1',
		path,
		status,
		manager_notes: null,
		page_checks: null
	});

	it('names the row the queue renders first, not the row the store holds first', () => {
		// Store order is decided-first here; the queue renders `needs-review`
		// first, so the two disagree. This is exactly the case a second copy of
		// the ordering would get wrong.
		const pages = [row('approved-page', 'approved'), row('todo-page', 'needs-review')];

		expect(firstQueuePath(pages)).toBe('todo-page');
	});

	it('falls through the group order when earlier groups are empty', () => {
		const pages = [row('blocked-page', 'blocked'), row('revise-page', 'revise')];

		// `revise` precedes `blocked`, and neither `needs-review` nor `approved`
		// has a row.
		expect(firstQueuePath(pages)).toBe('revise-page');
	});

	it('returns undefined with no review loaded, rather than inventing a page', () => {
		expect(firstQueuePath([])).toBeUndefined();
	});

	it('orders the rendered groups by the same constant', () => {
		expect([...QUEUE_STATUS_ORDER]).toEqual(['needs-review', 'approved', 'revise', 'blocked']);
	});
});
