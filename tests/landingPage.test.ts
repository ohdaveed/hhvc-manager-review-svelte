/**
 * @vitest-environment jsdom
 *
 * `/` used to be an onMount redirect. It is a page now: signed out it must
 * explain the tool and offer sign-in without claiming progress, and signed in
 * it shows progress and a Continue link a person clicks.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';

const goto = vi.fn();
vi.mock('$app/navigation', () => ({ goto: (...args: unknown[]) => goto(...args) }));

const session = { signedIn: false as boolean | undefined };
vi.mock('$lib/stores/session.svelte', () => ({ sessionStore: session }));

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

const loadReview = vi.fn(async () => () => {});
vi.mock('$lib/stores/reviewState', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/stores/reviewState')>()),
	loadReview: () => loadReview()
}));

const { default: Page } = await import('../src/routes/+page.svelte');
const { pagesStore } = await import('../src/lib/stores/reviewState');
const { draftsStore } = await import('../src/lib/stores/draftPages');
const { pageStore } = await import('../src/lib/stores/pageData.svelte.js');

const row = (path: string, status: 'needs-review' | 'approved') => ({
	id: `id-${path}`,
	review_id: 'r1',
	path,
	status,
	manager_notes: null,
	page_checks: null
});

describe('landing page', () => {
	let errorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		goto.mockReset();
		loadReview.mockClear();
		pagesStore.set([]);
		draftsStore.set([]);
		pageStore.pages = [
			{ id: 'topic-x--about', title: 'About vector control', type: 'About us', sections: [] },
			{ id: 'topic-x--report', title: 'Report a problem', type: 'Transaction', sections: [] }
		];
		errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('renders the explanation and a sign-in link when signed out', () => {
		session.signedIn = false;
		render(Page);

		expect(screen.getByRole('heading', { name: /how it works/i })).toBeTruthy();
		expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(4);
		expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/login');
		expect(screen.queryByText(/\d+ of \d+ decided/i)).toBeNull();
		expect(screen.queryByRole('link', { name: /continue/i })).toBeNull();
		expect(loadReview).not.toHaveBeenCalled();
		expect(errorSpy).not.toHaveBeenCalled();
	});

	it('claims no progress while the session check is still pending', () => {
		session.signedIn = undefined;
		render(Page);
		expect(screen.queryByText(/\d+ of \d+ decided/i)).toBeNull();
		// Neutral text, not the sign-in link: the visitor may well be signed in.
		expect(screen.queryByRole('link', { name: /sign in/i })).toBeNull();
		expect(screen.getByText(/checking your session/i)).toBeTruthy();
	});

	it('claims no progress between sign-in and the review load resolving', () => {
		session.signedIn = true;
		loadReview.mockImplementationOnce(() => new Promise(() => {}));
		render(Page);
		expect(screen.queryByText(/\d+ of \d+ decided/i)).toBeNull();
		expect(screen.getByText(/loading your progress/i)).toBeTruthy();
	});

	it('says so when the review fails to load, and does not log an error', async () => {
		session.signedIn = true;
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		loadReview.mockRejectedValueOnce(new Error('network down'));
		render(Page);

		expect(await screen.findByText(/progress could not be loaded/i)).toBeTruthy();
		expect(screen.queryByText(/loading your progress/i)).toBeNull();
		expect(warnSpy).toHaveBeenCalledOnce();
		expect(errorSpy).not.toHaveBeenCalled();
		// Everything else on the page is unaffected.
		expect(screen.getByRole('heading', { name: /how it works/i })).toBeTruthy();
	});

	it('does not redirect', async () => {
		session.signedIn = true;
		render(Page);
		// The old redirect navigated after an awaited load; let that settle.
		await new Promise((r) => setTimeout(r, 0));
		expect(goto).not.toHaveBeenCalled();
	});

	it('shows progress and a continue link when signed in', async () => {
		session.signedIn = true;
		pagesStore.set([row('topic-x--about', 'approved'), row('topic-x--report', 'needs-review')]);
		render(Page);

		expect(await screen.findByText(/1 of 2 decided/i)).toBeTruthy();
		const cont = screen.getByRole('link', { name: 'Continue to Report a problem' });
		expect(cont.getAttribute('href')).toBe('/review/topic-x--report');
		expect(loadReview).toHaveBeenCalledOnce();
	});

	it('links a draft that is first in the queue to its draft route, not a 404', async () => {
		session.signedIn = true;
		pagesStore.set([row('draft:abc', 'needs-review')]);
		render(Page);
		// Not in pageStore, not in draftsStore: the path is the last-resort name.
		expect((await screen.findByRole('link', { name: /continue/i })).getAttribute('href')).toBe(
			'/review/draft/abc'
		);
	});

	it('counts drafts in the total', async () => {
		session.signedIn = true;
		pagesStore.set([row('topic-x--about', 'approved'), row('draft:abc', 'needs-review')]);
		render(Page);
		expect(await screen.findByText(/1 of 2 decided/i)).toBeTruthy();
	});

	it('names a drafting draft by its stored title in All pages', () => {
		session.signedIn = true;
		draftsStore.set([
			{
				id: 'abc',
				path: 'draft:abc',
				title: 'Proposed rodent page',
				description: '',
				state: 'drafting',
				content: null,
				valid: null,
				issues: null,
				model: null,
				created_by: null,
				created_at: '',
				updated_at: ''
			}
		]);
		render(Page);
		expect(screen.getByRole('link', { name: 'Proposed rodent page' }).getAttribute('href')).toBe(
			'/review/draft/abc'
		);
	});

	it('lists every corpus page in All pages', () => {
		session.signedIn = false;
		render(Page);
		expect(screen.getByRole('link', { name: 'About vector control' }).getAttribute('href')).toBe(
			'/review/topic-x--about'
		);
	});
});
