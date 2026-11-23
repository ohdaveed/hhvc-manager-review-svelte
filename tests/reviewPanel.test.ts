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
import ReviewPanel from '../src/lib/components/workspace/ReviewPanel.svelte';

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
	updatePageStatus: vi.fn()
}));

const session = vi.hoisted(() => ({
	signedIn: true as boolean | undefined,
	knownSignedOut: false
}));
vi.mock('$lib/stores/session.svelte', () => ({ sessionStore: session }));

const { pagesStore, updatePageNotes, updatePageStatus } = await import('$lib/stores/reviewState');
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
	fireEvent.input(screen.getByLabelText('Decision notes'), { target: { value } });

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

			expect(radios()).toHaveLength(4);
			for (const r of radios()) expect(r.disabled).toBe(true);
			expect((screen.getByLabelText('Decision notes') as HTMLTextAreaElement).disabled).toBe(true);
			expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/login');
			expect(screen.getByText(/to record a decision/)).toBeTruthy();

			await fireEvent.click(screen.getByRole('radio', { name: 'Approved' }));
			await vi.advanceTimersByTimeAsync(0);
			expect(saveStatus).not.toHaveBeenCalled();
			for (const r of radios()) expect(r.getAttribute('data-state')).toBe('off');
		});

		it('signed in: says there is no review record instead of asking to sign in', () => {
			pagesStore.set([]);
			render(ReviewPanel, { pageData: { id: PATH } });
			for (const r of radios()) expect(r.disabled).toBe(true);
			expect(screen.getByText('No review record exists for this page')).toBeTruthy();
			expect(screen.queryByRole('link', { name: 'Sign in' })).toBeNull();
		});
	});

	it('signed in with a record: controls are enabled and a decision writes', async () => {
		saveStatus.mockResolvedValue(true);
		render(ReviewPanel, { pageData: { id: PATH } });
		const radios = screen.getAllByRole('radio') as HTMLButtonElement[];
		for (const r of radios) expect(r.disabled).toBe(false);
		expect((screen.getByLabelText('Decision notes') as HTMLTextAreaElement).disabled).toBe(false);
		expect(screen.queryByText(/to record a decision/)).toBeNull();

		await fireEvent.click(screen.getByRole('radio', { name: 'Approved' }));
		await vi.advanceTimersByTimeAsync(0);
		expect(saveStatus).toHaveBeenCalledWith('row-1', 'approved');
	});
});
