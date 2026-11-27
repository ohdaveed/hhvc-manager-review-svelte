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
import { fireEvent, render, screen } from '@testing-library/svelte';
import ReviewQueue from '../src/lib/components/workspace/ReviewQueue.svelte';
import { pageStore } from '../src/lib/stores/pageData.svelte.js';
import { sessionStore } from '../src/lib/stores/session.svelte.js';
import {
	firstQueuePath,
	nextUndecidedPath,
	QUEUE_STATUS_ORDER,
	type ReviewPage
} from '../src/lib/stores/reviewState';

// `ensureDevSession` is required because ReviewQueue now reads `sessionStore`
// to tell "signed out" from "this review is empty" in its empty state, and
// `SessionStore`'s constructor calls it at module scope.
vi.mock('$lib/supabase', () => ({
	ensureDevSession: async () => {},
	supabase: {
		auth: {
			getSession: async () => ({ data: { session: null } }),
			onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
		},
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
const { draftsStore } = await import('../src/lib/stores/draftPages.js');

// Typed rather than left as `status: string`: the widened parameter was the
// single cause of 12 of the 23 svelte-check errors, and it also meant a typo in
// a status would have produced a row the queue silently never groups.
const row = (path: string, status: ReviewPage['status']): ReviewPage => ({
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

	/**
	 * The empty queue is the signed-out queue, almost always: every
	 * `TO authenticated` policy denies the read while the mockups keep
	 * rendering from the static corpus, so this is the state a reviewer hits
	 * when the tool looks broken but isn't.
	 *
	 * It used to read "No pages loaded. (Waiting for Supabase data)" -- a
	 * loading promise the app was not keeping, naming a service the reviewer
	 * cannot act on. The assertion here is that the empty state offers the
	 * one thing that fixes it.
	 */
	it('offers sign-in when the queue is empty because nobody is signed in', () => {
		pagesStore.set([]);
		render(ReviewQueue);

		const link = screen.getByRole('link', { name: 'Sign in' });
		expect(link.getAttribute('href')).toBe('/login');
		expect(screen.getByText(/to load the review queue/)).toBeTruthy();

		// The old copy must not come back.
		expect(screen.queryByText(/Waiting for Supabase data/)).toBeNull();
	});

	// The corpus renders without a session, so signed out the queue still lists
	// it -- otherwise Site map was the only way to browse.
	it('lists every corpus page when signed out, without review data', async () => {
		pagesStore.set([]);
		currentSlug = 'topic-x--report';
		render(ReviewQueue);

		await screen.findByRole('link', { name: 'Sign in' });
		const about = screen.getByRole('link', { name: /About vector control/ });
		const report = screen.getByRole('link', { name: /Report a problem/ });
		expect(about.getAttribute('href')).toBe('/review/topic-x--about');
		expect(report.getAttribute('href')).toBe('/review/topic-x--report');
		expect(report.getAttribute('aria-current')).toBe('page');
		expect(about.getAttribute('aria-current')).toBeNull();
		expect(screen.getByText('Transaction')).toBeTruthy();

		expect(screen.queryByRole('region', { name: 'Review progress' })).toBeNull();
		expect(screen.queryByText(/decided/)).toBeNull();
		expect(screen.queryByText('Undecided')).toBeNull();
	});

	it('filters the signed-out corpus list', async () => {
		pagesStore.set([]);
		render(ReviewQueue);

		await fireEvent.input(await screen.findByLabelText('Filter pages'), {
			target: { value: 'report' }
		});
		expect(screen.getByRole('link', { name: /Report a problem/ })).toBeTruthy();
		expect(screen.queryByRole('link', { name: /About vector control/ })).toBeNull();
	});

	it('counts decisions, not rows', () => {
		pageStore.pages = [
			...pageStore.pages,
			{ id: 'topic-x--third', title: 'Third page', type: 'Information', sections: [] },
			{ id: 'topic-x--fourth', title: 'Fourth page', type: 'Information', sections: [] }
		];
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

		// A bar split by colour alone says nothing to a screen reader, and the sum
		// alone does not say what the colours mean -- the label names the parts.
		expect(
			screen.getByRole('img', { name: '1 of 2 pages decided, 50 percent: 1 approved' })
		).toBeTruthy();
	});

	it('renders a row per page, with the corpus title, its decision and page type', () => {
		pagesStore.set([row('topic-x--about', 'needs-review')]);
		render(ReviewQueue);

		expect(screen.getByText('About vector control')).toBeTruthy();
		expect(screen.getByText('Undecided · About us')).toBeTruthy();
	});

	it('shows how many fields on a page have been edited', () => {
		pagesStore.set([row('topic-x--about', 'needs-review')]);
		editsStore.set([
			{ page_id: 'id-topic-x--about', field_id: 'title', new_content: 'a' },
			{ page_id: 'id-topic-x--about', field_id: 'summary', new_content: 'b' },
			{ page_id: 'id-topic-x--report', field_id: 'title', new_content: 'c' }
		]);
		render(ReviewQueue);

		expect(screen.getByText('Undecided · About us · 2 edited fields')).toBeTruthy();
	});

	it('marks the page being reviewed as the current one', () => {
		pagesStore.set([row('topic-x--about', 'needs-review'), row('topic-x--report', 'needs-review')]);
		render(ReviewQueue);

		const current = screen.getByRole('link', { current: 'page' });
		expect(current.getAttribute('href')).toBe('/review/topic-x--about');
	});

	it('groups pages under the landing page headings, in its order, and counts each', () => {
		// `report-mold` is themed (Report a problem); the fixture pages are in no
		// group, so they fall under Other pages, after every theme.
		pageStore.pages = [
			...pageStore.pages,
			{ id: 'report-mold', title: 'Report mold', type: 'Transaction', sections: [] }
		];
		pagesStore.set([
			row('topic-x--about', 'approved'),
			row('topic-x--report', 'approved'),
			row('report-mold', 'blocked')
		]);
		render(ReviewQueue);

		const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
		expect(headings.map((t) => t?.replace(/\d+/g, '').trim())).toEqual([
			'Report a problem',
			'Other pages'
		]);
		// The count pill sits beside the heading it belongs to.
		expect(screen.getByText('Other pages').parentElement?.textContent).toContain('2');
		// Empty themes are not drawn.
		expect(screen.queryByText('About HHVC')).toBeNull();
		expect(screen.getByText('Blocked · Transaction')).toBeTruthy();
	});

	it('says in words when a page has decision notes, with no colour-only marker', () => {
		pagesStore.set([
			{ ...row('topic-x--about', 'needs-review'), manager_notes: 'Check the hours' },
			{ ...row('topic-x--report', 'needs-review'), manager_notes: '   ' }
		]);
		const { container } = render(ReviewQueue);

		expect(screen.getByText('Undecided · About us · has notes')).toBeTruthy();
		// Whitespace-only notes are not notes.
		expect(screen.getByText('Undecided · Transaction')).toBeTruthy();
		// The per-row status dot only repeated the group's colour; it is gone.
		expect(container.querySelector('li .rounded-full')).toBeNull();
	});

	/**
	 * The table and the corpus drift apart in both directions (see
	 * `reconcileReview`). Measured on the local stack: five corpus pages with no
	 * row, and two rows for retired pages, under a queue that said "0 of 38".
	 */
	describe('when the review table and the corpus disagree', () => {
		it('counts and lists corpus pages that have no review row', () => {
			pagesStore.set([row('topic-x--about', 'approved')]);
			render(ReviewQueue);

			expect(screen.getByText('1 of 2 decided')).toBeTruthy();
			const group = screen.getByTestId('queue-unreviewed');
			expect(group.textContent).toContain('Not in the review yet');
			expect(group.textContent).toMatch(/can't be decided/);
			expect(screen.getByRole('link', { name: /Report a problem/ }).getAttribute('href')).toBe(
				'/review/topic-x--report'
			);
		});

		it('leaves rows for retired pages out of the count, and names them without a link', () => {
			pagesStore.set([
				row('topic-x--about', 'needs-review'),
				row('topic-x--report', 'needs-review'),
				row('topic-x--retired', 'approved')
			]);
			render(ReviewQueue);

			expect(screen.getByText('0 of 2 decided')).toBeTruthy();
			expect(screen.queryByText('Approved')).toBeNull();
			expect(screen.getByTestId('queue-retired').textContent).toContain('topic-x--retired');
			expect(
				screen
					.getAllByRole('link')
					.some((a) => a.getAttribute('href') === '/review/topic-x--retired')
			).toBe(false);
		});

		it('says nothing extra when they agree', () => {
			pagesStore.set([row('topic-x--about', 'approved'), row('topic-x--report', 'needs-review')]);
			render(ReviewQueue);

			expect(screen.queryByTestId('queue-unreviewed')).toBeNull();
			expect(screen.queryByTestId('queue-retired')).toBeNull();
		});
	});

	describe('filter', () => {
		const filterTo = async (text: string) => {
			const box = screen.getByRole('searchbox', { name: 'Filter pages' });
			await fireEvent.input(box, { target: { value: text } });
		};

		beforeEach(() => {
			pageStore.pages = [
				...pageStore.pages,
				{ id: 'topic-x--third', title: 'Third page', type: 'Information', sections: [] }
			];
			pagesStore.set([
				row('topic-x--about', 'approved'),
				row('topic-x--report', 'needs-review'),
				row('topic-x--third', 'needs-review')
			]);
		});

		it('matches titles case-insensitively, and recounts and hides groups', async () => {
			render(ReviewQueue);
			await filterTo('REPORT a');

			expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
				'/review/topic-x--report'
			]);
			expect(screen.getByText('Other pages').parentElement?.textContent).toContain('1');
			expect(screen.queryByText(/^Approved/)).toBeNull();
		});

		it('matches the path too', async () => {
			render(ReviewQueue);
			await filterTo('x--third');

			expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
				'/review/topic-x--third'
			]);
		});

		it('says when nothing matches, and keeps progress on every page', async () => {
			render(ReviewQueue);
			await filterTo('zzz');

			expect(screen.getByRole('status').textContent).toMatch(/No pages match/);
			expect(screen.queryAllByRole('link')).toHaveLength(0);
			expect(screen.getByText('1 of 3 decided')).toBeTruthy();
		});

		// Signed in to an empty review. Signed out, the corpus list is filterable.
		it('is not offered when there are no pages to filter', () => {
			pagesStore.set([]);
			sessionStore.signedIn = true;
			render(ReviewQueue);

			expect(screen.queryByRole('searchbox')).toBeNull();
			sessionStore.signedIn = false;
		});
	});

	// Signed in with an empty store, the queue said "This review has no pages
	// yet." while the load was still in flight -- seen 1.5s into a normal load.
	// The empty message is now reserved for a load that resolved with nothing.
	describe('while the review is empty and signed in', () => {
		beforeEach(() => {
			pagesStore.set([]);
			sessionStore.signedIn = true;
			return () => {
				sessionStore.signedIn = false;
			};
		});

		it('says it is loading, not that the review is empty', () => {
			render(ReviewQueue, { loadState: 'loading' });

			expect(screen.getByRole('status').textContent).toBe('Loading the queue…');
			expect(screen.queryByText(/no pages yet/)).toBeNull();
		});

		it('says the load failed and offers Try again', async () => {
			const onRetry = vi.fn(async () => {});
			render(ReviewQueue, { loadState: 'failed', onRetry });

			expect(screen.getByRole('alert').textContent).toMatch(/The queue didn't load/);
			expect(screen.queryByText(/no pages yet/)).toBeNull();
			await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
			expect(onRetry).toHaveBeenCalledOnce();
		});

		it('says the review has no pages only once the load resolved', () => {
			render(ReviewQueue, { loadState: 'ready' });

			expect(screen.getByText('This review has no pages yet.')).toBeTruthy();
			expect(screen.queryByRole('alert')).toBeNull();
		});
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

describe('ReviewQueue drafts', () => {
	beforeEach(() => {
		currentSlug = 'topic-x--about';
		editsStore.set([]);
		pageStore.pages = [];
		draftsStore.set([]);
		pagesStore.set([]);
	});

	const draftRow = (id: string): ReviewPage => ({
		id: `id-${id}`,
		review_id: 'r1',
		path: `draft:${id}`,
		status: 'needs-review',
		manager_notes: null,
		page_checks: null
	});

	it('links a draft to /review/draft/<id> and badges it', () => {
		pagesStore.set([draftRow('9f1c')]);
		draftsStore.set([{ id: '9f1c', path: 'draft:9f1c', title: 'Rat bait stations' } as never]);
		render(ReviewQueue);
		const link = screen.getByRole('link', { name: /Rat bait stations/ });
		expect(link.getAttribute('href')).toBe('/review/draft/9f1c');
		expect(screen.getByText('AI draft')).toBeTruthy();
	});

	it("shows the reviewer's words, not the raw path, for a draft with no store page", () => {
		pagesStore.set([draftRow('9f1c')]);
		draftsStore.set([{ id: '9f1c', path: 'draft:9f1c', title: 'Words I typed' } as never]);
		render(ReviewQueue);
		expect(screen.queryByText('draft:9f1c')).toBeNull();
		expect(screen.getByText('Words I typed')).toBeTruthy();
	});

	it('prefers the model title once the draft is ready and in the page store', () => {
		pagesStore.set([draftRow('9f1c')]);
		pageStore.pages = [{ id: 'draft:9f1c', title: 'Model title', type: 'topic', sections: [] }];
		draftsStore.set([{ id: '9f1c', path: 'draft:9f1c', title: 'Words I typed' } as never]);
		render(ReviewQueue);
		expect(screen.getByText('Model title')).toBeTruthy();
		expect(screen.queryByText('Words I typed')).toBeNull();
	});
});

describe('nextUndecidedPath', () => {
	const row = (path: string, status: ReviewPage['status']): ReviewPage => ({
		id: `id-${path}`,
		review_id: 'r1',
		path,
		status,
		manager_notes: null,
		page_checks: null
	});

	it('names the next undecided row after the current one, skipping decided rows', () => {
		const pages = [row('a', 'needs-review'), row('b', 'approved'), row('c', 'needs-review')];
		expect(nextUndecidedPath(pages, 'a')).toBe('c');
	});

	it('still means "the row after" once the current page has been decided', () => {
		// Deciding `b` moves it out of the needs-review group, but the store keeps
		// its position, so "next" is still `c` rather than jumping back to `a`.
		const pages = [row('a', 'needs-review'), row('b', 'revise'), row('c', 'needs-review')];
		expect(nextUndecidedPath(pages, 'b')).toBe('c');
	});

	it('wraps round to the start of the queue', () => {
		const pages = [row('a', 'needs-review'), row('b', 'needs-review')];
		expect(nextUndecidedPath(pages, 'b')).toBe('a');
	});

	it('never names the current page, and is undefined when nothing else is left', () => {
		expect(
			nextUndecidedPath([row('a', 'needs-review'), row('b', 'approved')], 'a')
		).toBeUndefined();
		expect(nextUndecidedPath([], 'a')).toBeUndefined();
	});

	it('starts from the top when the current page is not in the review', () => {
		const pages = [row('a', 'approved'), row('b', 'needs-review')];
		expect(nextUndecidedPath(pages, 'not-loaded')).toBe('b');
	});
});
