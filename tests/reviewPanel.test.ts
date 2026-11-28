/**
 * @vitest-environment jsdom
 *
 * The decision panel only renders its live parts with a row in `pagesStore`,
 * which locally needs a Supabase session. The store is a plain `writable`, so
 * this fills it directly and stubs the one write the notes field makes.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import type { PageCheck } from '$lib/stores/reviewState';
import ReviewPanel from './ReviewPanelHarness.svelte';

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

vi.mock('$lib/stores/reviewState', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/stores/reviewState')>()),
	updatePageNotes: vi.fn(),
	updatePageStatus: vi.fn(),
	addPageToReview: vi.fn()
}));

const session = vi.hoisted(() => ({
	signedIn: true as boolean | undefined,
	knownSignedOut: false
}));
vi.mock('$lib/stores/session.svelte', () => ({ sessionStore: session }));

const { pagesStore, updatePageNotes, updatePageStatus, addPageToReview } =
	await import('$lib/stores/reviewState');
const { pageStore } = await import('$lib/stores/pageData.svelte');
const addPage = vi.mocked(addPageToReview);
const saveNotes = vi.mocked(updatePageNotes);
const saveStatus = vi.mocked(updatePageStatus);

const PATH = 'topic-x--about';
const setRow = (page_checks: Record<string, PageCheck> | null = null) =>
	pagesStore.set([
		{
			id: 'row-1',
			review_id: 'r1',
			path: PATH,
			status: 'needs-review',
			manager_notes: null,
			page_checks
		}
	]);

const typeNote = (value: string) =>
	fireEvent.input(screen.getByLabelText('Feedback'), { target: { value } });

describe('ReviewPanel', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		saveNotes.mockReset();
		saveStatus.mockReset();
		Object.assign(session, { signedIn: true, knownSignedOut: false });
		setRow();
	});
	afterEach(() => vi.useRealTimers());

	it('shows Saving… while a note is pending, then Saved once the write lands', async () => {
		saveNotes.mockResolvedValue(true);
		render(ReviewPanel, { pageData: { id: PATH } });

		await typeNote('Needs a phone number');
		expect(screen.getByText('Saving…')).toBeTruthy();
		expect(saveNotes).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(500);
		expect(saveNotes).toHaveBeenCalledWith('row-1', 'Needs a phone number');
		expect(screen.getByText('Saved')).toBeTruthy();
		expect(screen.getByText('Saved').getAttribute('aria-live')).toBe('polite');

		await vi.advanceTimersByTimeAsync(3000);
		expect(screen.queryByText('Saved')).toBeNull();
	});

	it('still offers retry when the write fails, and does not claim Saved', async () => {
		saveNotes.mockResolvedValue(false);
		render(ReviewPanel, { pageData: { id: PATH } });

		await typeNote('x');
		await vi.advanceTimersByTimeAsync(500);
		expect(screen.getByRole('button', { name: 'Not saved — retry' })).toBeTruthy();
		expect(screen.queryByText('Saved')).toBeNull();
		expect(screen.queryByText('Saving…')).toBeNull();

		saveNotes.mockResolvedValue(true);
		await fireEvent.click(screen.getByRole('button', { name: 'Not saved — retry' }));
		await vi.advanceTimersByTimeAsync(0);
		expect(screen.queryByRole('button', { name: 'Not saved — retry' })).toBeNull();
		expect(screen.getByText('Saved')).toBeTruthy();
	});

	it('does not announce Saved for a page the reviewer has left', async () => {
		let finish: (ok: boolean) => void = () => {};
		saveNotes.mockReturnValue(new Promise((r) => (finish = r)));
		render(ReviewPanel, { pageData: { id: PATH } });

		await typeNote('x');
		await vi.advanceTimersByTimeAsync(500);
		pagesStore.set([
			{
				id: 'row-2',
				review_id: 'r1',
				path: PATH,
				status: 'needs-review',
				manager_notes: null,
				page_checks: null
			}
		]);
		await vi.advanceTimersByTimeAsync(0);
		finish(true);
		await vi.advanceTimersByTimeAsync(0);
		expect(screen.queryByText('Saved')).toBeNull();
	});

	it('renders no Page checks section when the page has no checks', () => {
		render(ReviewPanel, { pageData: { id: PATH } });
		expect(screen.queryByRole('heading', { name: 'Page checks' })).toBeNull();
		expect(screen.queryByText('No checks available for this page.')).toBeNull();
	});

	it('renders the Page checks section when there are checks', () => {
		setRow({ hasTitle: { status: 'pass', message: 'Title present' } });
		render(ReviewPanel, { pageData: { id: PATH } });
		expect(screen.getByRole('heading', { name: 'Page checks' })).toBeTruthy();
		expect(screen.getByText('Title present')).toBeTruthy();
	});

	describe('with no live record', () => {
		const radios = () => screen.getAllByRole('radio') as HTMLButtonElement[];

		it('signed out: disables the decision and notes, says to sign in, writes nothing', async () => {
			Object.assign(session, { signedIn: false, knownSignedOut: true });
			pagesStore.set([]);
			render(ReviewPanel, { pageData: { id: PATH } });

			expect(radios()).toHaveLength(3);
			for (const r of radios()) expect(r.disabled).toBe(true);
			expect((screen.getByLabelText('Feedback') as HTMLTextAreaElement).disabled).toBe(true);
			expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/login');
			expect(screen.getByText(/to record a decision/)).toBeTruthy();

			await fireEvent.click(screen.getByRole('radio', { name: 'Approved' }));
			await vi.advanceTimersByTimeAsync(0);
			expect(saveStatus).not.toHaveBeenCalled();
			for (const r of radios()) expect(r.getAttribute('data-state')).toBe('off');
		});

		it('signed in, review still loading: disabled, and no "no record" message yet', () => {
			pagesStore.set([]);
			render(ReviewPanel, { pageData: { id: PATH } });
			for (const r of radios()) expect(r.disabled).toBe(true);
			expect(screen.queryByText('No review record exists for this page')).toBeNull();
			expect(screen.queryByRole('link', { name: 'Sign in' })).toBeNull();
		});

		it('session not yet known: neither message', () => {
			Object.assign(session, { signedIn: undefined, knownSignedOut: false });
			pagesStore.set([]);
			render(ReviewPanel, { pageData: { id: PATH } });
			for (const r of radios()) expect(r.disabled).toBe(true);
			expect(screen.queryByText('No review record exists for this page')).toBeNull();
			expect(screen.queryByText(/to record a decision/)).toBeNull();
		});

		it('signed in, review loaded without this page: says there is no review record', () => {
			pagesStore.set([
				{
					id: 'row-9',
					review_id: 'r1',
					path: 'some-other-page',
					status: 'needs-review',
					manager_notes: null,
					page_checks: null
				}
			]);
			render(ReviewPanel, { pageData: { id: PATH } });
			for (const r of radios()) expect(r.disabled).toBe(true);
			expect(screen.getByText('No review record exists for this page')).toBeTruthy();
			expect(screen.queryByRole('link', { name: 'Sign in' })).toBeNull();
		});

		describe('Add to review', () => {
			const otherRow = {
				id: 'row-9',
				review_id: 'r1',
				path: 'some-other-page',
				status: 'needs-review' as const,
				manager_notes: null,
				page_checks: null
			};
			let corpus: typeof pageStore.pages;
			beforeEach(() => {
				corpus = pageStore.pages;
				// `review.unreviewed` squares rows with the corpus, so the page has
				// to be a corpus page for the button to be offered.
				pageStore.pages = [{ id: PATH, title: 'About', sections: [] }];
				addPage.mockReset();
				pagesStore.set([otherRow]);
			});
			afterEach(() => {
				pageStore.pages = corpus;
			});

			it('is offered on a corpus page with no row, and adds it', async () => {
				addPage.mockImplementation(async () => {
					pagesStore.set([otherRow, { ...otherRow, id: 'row-new', path: PATH }]);
					return true;
				});
				render(ReviewPanel, { pageData: { id: PATH } });

				await fireEvent.click(screen.getByRole('button', { name: 'Add to review' }));
				await vi.advanceTimersByTimeAsync(0);

				expect(addPage).toHaveBeenCalledWith(PATH);
				expect(screen.queryByRole('button', { name: 'Add to review' })).toBeNull();
				expect(screen.queryByText('No review record exists for this page')).toBeNull();
				for (const r of radios()) expect(r.disabled).toBe(false);
			});

			it('says so when it cannot add the page, and keeps the button', async () => {
				addPage.mockResolvedValue(false);
				render(ReviewPanel, { pageData: { id: PATH } });

				await fireEvent.click(screen.getByRole('button', { name: 'Add to review' }));
				await vi.advanceTimersByTimeAsync(0);

				expect(screen.getByRole('alert').textContent).toMatch(/Couldn't add it/);
				expect(screen.getByRole('button', { name: 'Add to review' })).toBeTruthy();
				for (const r of radios()) expect(r.disabled).toBe(true);
			});

			it('is not offered on a page outside the corpus, or while signed out', () => {
				pageStore.pages = [];
				const { unmount } = render(ReviewPanel, { pageData: { id: PATH } });
				expect(screen.queryByRole('button', { name: 'Add to review' })).toBeNull();
				unmount();

				pageStore.pages = [{ id: PATH, title: 'About', sections: [] }];
				Object.assign(session, { signedIn: false, knownSignedOut: true });
				render(ReviewPanel, { pageData: { id: PATH } });
				expect(screen.queryByRole('button', { name: 'Add to review' })).toBeNull();
			});
		});

		it('signed in on a non-ready draft: disabled, but claims no missing record', () => {
			// A drafting, stale or failed draft has no corpus entry, so the layout
			// passes no `pageData` and the `pageData?.id` lookup misses -- but a
			// `pages` row for that `draft:<uuid>` does exist, so "no review record
			// exists" would be false. The draft banner explains the state instead.
			pagesStore.set([
				{
					id: 'row-draft',
					review_id: 'r1',
					path: 'draft:11111111-1111-4111-8111-111111111111',
					status: 'needs-review',
					manager_notes: null,
					page_checks: null
				}
			]);
			render(ReviewPanel, { pageData: undefined });
			for (const r of radios()) expect(r.disabled).toBe(true);
			expect(screen.queryByText('No review record exists for this page')).toBeNull();
		});
	});

	it('signed in with a record: controls are enabled and a decision writes', async () => {
		saveStatus.mockResolvedValue(true);
		render(ReviewPanel, { pageData: { id: PATH } });
		const radios = screen.getAllByRole('radio') as HTMLButtonElement[];
		for (const r of radios) expect(r.disabled).toBe(false);
		expect((screen.getByLabelText('Feedback') as HTMLTextAreaElement).disabled).toBe(false);
		expect(screen.queryByText(/to record a decision/)).toBeNull();

		await fireEvent.click(screen.getByRole('radio', { name: 'Approved' }));
		await vi.advanceTimersByTimeAsync(0);
		expect(saveStatus).toHaveBeenCalledWith('row-1', 'approved');
	});
});

describe('ReviewPanel after a decision', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		saveStatus.mockReset();
		Object.assign(session, { signedIn: true, knownSignedOut: false });
	});
	afterEach(() => vi.useRealTimers());

	const rowWith = (status: 'approved' | 'revise', manager_notes: string | null = null) =>
		pagesStore.set([
			{ id: 'row-1', review_id: 'r1', path: PATH, status, manager_notes, page_checks: null },
			{
				id: 'row-2',
				review_id: 'r1',
				path: 'topic-x--report',
				status: 'needs-review',
				manager_notes: null,
				page_checks: null
			}
		]);

	// Three options and no "Undecided" pill, so pressing the selected one is
	// the way back. It has to be a write: the control showing nothing over a
	// row that still says approved is the desync this control once had.
	it('clears the decision, as a write, when the selected option is pressed again', async () => {
		rowWith('approved');
		saveStatus.mockResolvedValue(true);
		render(ReviewPanel, { pageData: { id: PATH } });
		const approved = screen.getByRole('radio', { name: 'Approved' });
		expect(approved.getAttribute('data-state')).toBe('on');

		await fireEvent.click(approved);
		await vi.advanceTimersByTimeAsync(0);
		expect(saveStatus).toHaveBeenCalledWith('row-1', 'needs-review');
	});

	it('asks for feedback before a page is sent back without any', async () => {
		rowWith('revise');
		const onWriteFeedback = vi.fn();
		render(ReviewPanel, { pageData: { id: PATH }, onWriteFeedback });
		expect(screen.getByText('Required to send back')).toBeTruthy();
		await fireEvent.click(screen.getByRole('button', { name: 'Write feedback to send back' }));
		expect(onWriteFeedback).toHaveBeenCalledOnce();
	});

	it('stops asking once a sent-back page has its feedback', () => {
		rowWith('revise', 'Add the phone number');
		render(ReviewPanel, { pageData: { id: PATH }, onWriteFeedback: () => {} });
		expect(screen.queryByText('Required to send back')).toBeNull();
		expect(screen.queryByRole('button', { name: 'Write feedback to send back' })).toBeNull();
	});

	it('tells the workspace about a saved decision, so it can open Karl', async () => {
		pagesStore.set([
			{
				id: 'row-1',
				review_id: 'r1',
				path: PATH,
				status: 'needs-review',
				manager_notes: null,
				page_checks: null
			}
		]);
		saveStatus.mockResolvedValue(true);
		const onDecided = vi.fn();
		render(ReviewPanel, { pageData: { id: PATH }, onDecided });
		await fireEvent.click(screen.getByRole('radio', { name: 'Approved' }));
		await vi.advanceTimersByTimeAsync(0);
		expect(onDecided).toHaveBeenCalledWith('approved');
	});
});

describe('ReviewPanel decision moment', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		saveStatus.mockReset();
		Object.assign(session, { signedIn: true, knownSignedOut: false });
		setRow();
	});
	afterEach(() => vi.useRealTimers());

	// The store is mocked, so the write does not move the row; this stands in
	// for the optimistic update the real `updatePageStatus` makes.
	const approve = async () => {
		saveStatus.mockImplementation(async (_id, status) => {
			pagesStore.update((rows) => rows.map((r) => ({ ...r, status })));
			return true;
		});
		await fireEvent.click(screen.getByRole('radio', { name: 'Approved' }));
		await vi.advanceTimersByTimeAsync(0);
	};

	it('confirms a saved decision in a live region', async () => {
		render(ReviewPanel, { pageData: { id: PATH } });
		await approve();
		const receipt = screen.getByText(/· recorded/).closest('[aria-live]');
		expect(receipt?.getAttribute('aria-live')).toBe('polite');
		expect(receipt?.textContent).toMatch(/Approved\s*· recorded/);
	});

	it('shows no receipt when the write fails, only the error', async () => {
		saveStatus.mockResolvedValue(false);
		render(ReviewPanel, { pageData: { id: PATH } });
		await fireEvent.click(screen.getByRole('radio', { name: 'Approved' }));
		await vi.advanceTimersByTimeAsync(0);
		expect(screen.queryByText(/· recorded/)).toBeNull();
		expect(screen.getByRole('alert').textContent).toMatch(/Not saved/);
	});

	it('drops the receipt once the stored status moves on from elsewhere', async () => {
		render(ReviewPanel, { pageData: { id: PATH } });
		await approve();
		pagesStore.update((rows) => rows.map((r) => ({ ...r, status: 'blocked' as const })));
		await vi.advanceTimersByTimeAsync(0);
		expect(screen.queryByText(/· recorded/)).toBeNull();
	});

	it('describes the decision with the Karl readiness line', () => {
		render(ReviewPanel, {
			pageData: { id: PATH },
			karlReadiness: '4 sections: 3 go into Karl, 1 unconfirmed.'
		});
		const group = screen.getAllByRole('radio')[0].closest('[aria-describedby]');
		const line = document.getElementById(group!.getAttribute('aria-describedby')!);
		expect(line?.textContent).toMatch(/Karl:\s*4 sections: 3 go into Karl, 1 unconfirmed\./);
	});

	it('shows no readiness line when there is nothing to report', () => {
		render(ReviewPanel, { pageData: { id: PATH } });
		expect(document.getElementById('decision-readiness')).toBeNull();
	});
});
