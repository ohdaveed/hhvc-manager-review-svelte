/**
 * @vitest-environment jsdom
 *
 * `/` used to be an onMount redirect. It is a page now: signed out it must
 * explain the tool and offer sign-in without claiming progress, and signed in
 * it shows progress and a Continue link a person clicks.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { tick } from 'svelte';

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

		expect(await screen.findByText(/your progress didn't load/i)).toBeTruthy();
		expect(screen.queryByText(/loading your progress/i)).toBeNull();
		expect(warnSpy).toHaveBeenCalledOnce();
		expect(errorSpy).not.toHaveBeenCalled();
		// Everything else on the page is unaffected.
		expect(screen.getByRole('heading', { name: /how it works/i })).toBeTruthy();
	});

	it('recovers in place when Try again succeeds', async () => {
		session.signedIn = true;
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		loadReview.mockRejectedValueOnce(new Error('network down'));
		render(Page);

		const retry = await screen.findByRole('button', { name: 'Try again' });
		pagesStore.set([row('topic-x--about', 'approved'), row('topic-x--report', 'needs-review')]);
		await fireEvent.click(retry);

		expect(await screen.findByText(/1 of 2 decided/i)).toBeTruthy();
		expect(screen.queryByText(/didn't load/i)).toBeNull();
		expect(loadReview).toHaveBeenCalledTimes(2);
	});

	it('tells "no review yet" apart from loading when the load finds nothing', async () => {
		session.signedIn = true;
		render(Page);
		expect(await screen.findByText(/no review to work through yet/i)).toBeTruthy();
		expect(screen.queryByText(/loading your progress/i)).toBeNull();
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
		// The title sits beside the button, not inside it, so a long one cannot
		// push the button past a phone's edge. The visible label starts the name.
		expect(cont.textContent?.trim()).toBe('Continue');
		expect(screen.getByText('Next up')).toBeTruthy();
		expect(loadReview).toHaveBeenCalledOnce();
	});

	it('filters All pages to a status from the status card, and focuses the list', async () => {
		session.signedIn = true;
		pagesStore.set([row('topic-x--about', 'approved'), row('topic-x--report', 'needs-review')]);
		render(Page);

		await fireEvent.click(await screen.findByRole('button', { name: /^1 approved/ }));

		// Scoped to the list: the Karl section above it links approved pages too.
		const list = within(screen.getByRole('region', { name: 'All pages' }));
		expect(list.getByRole('link', { name: /About vector control/ })).toBeTruthy();
		expect(list.queryByRole('link', { name: /^Report a problem/ })).toBeNull();
		expect(screen.getByRole('radio', { name: /Approved/ }).getAttribute('aria-checked')).toBe(
			'true'
		);
		expect(document.activeElement?.id).toBe('all-pages');
	});

	// A chip at zero filtered to an empty list. The status card already drops
	// zeroes; the list's chips now follow the same rule.
	it('offers no status chip for a status with no pages', async () => {
		session.signedIn = true;
		pagesStore.set([row('topic-x--about', 'approved'), row('topic-x--report', 'needs-review')]);
		render(Page);
		await screen.findByText(/1 of 2 decided/i);

		const chips = screen
			.getAllByRole('radio')
			.map((r) => r.textContent?.replace(/\s+/g, ' ').trim());
		// `All` counts every listed corpus page, not just these two rows.
		expect(chips.slice(1)).toEqual(['Undecided 1', 'Approved 1']);
	});

	it('keeps the active chip when its status empties, so the filter can be left', async () => {
		session.signedIn = true;
		pagesStore.set([row('topic-x--about', 'approved'), row('topic-x--report', 'needs-review')]);
		render(Page);

		await fireEvent.click(await screen.findByRole('button', { name: /^1 approved/ }));
		pagesStore.set([row('topic-x--about', 'needs-review'), row('topic-x--report', 'needs-review')]);
		await tick();

		const approved = screen.getByRole('radio', { name: /Approved/ });
		expect(approved.getAttribute('aria-checked')).toBe('true');
		expect(approved.textContent).toMatch(/0/);
	});

	it('names the active filter when nothing matches, and clears both', async () => {
		session.signedIn = true;
		pagesStore.set([row('topic-x--about', 'approved'), row('topic-x--report', 'needs-review')]);
		render(Page);

		await fireEvent.click(await screen.findByRole('button', { name: /^1 approved/ }));
		await fireEvent.input(screen.getByLabelText('Search pages'), { target: { value: 'zzzz' } });
		expect(screen.getByText('No pages marked “Approved” match “zzzz”.')).toBeTruthy();

		await fireEvent.click(screen.getByRole('button', { name: 'Clear search and filter' }));
		expect(screen.getByRole('link', { name: /^Report a problem/ })).toBeTruthy();
		expect(document.activeElement?.id).toBe('page-search');
	});

	it('links a draft that is first in the queue to its draft route, not a 404', async () => {
		session.signedIn = true;
		pagesStore.set([row('draft:abc', 'needs-review')]);
		render(Page);
		// Not in pageStore, not in draftsStore: the path is the last-resort name.
		// The verb depends on whether anything is decided -- nothing is here, so
		// the button reads "Start with". This test is about the href either way.
		expect(
			(await screen.findByRole('link', { name: /start with|continue to/i })).getAttribute('href')
		).toBe('/review/draft/abc');
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
		// The meta line is the draft's state, so a reviewer who left while it
		// drafted can see from here whether it finished.
		expect(
			screen.getByRole('link', { name: 'Proposed rodent page Drafting…' }).getAttribute('href')
		).toBe('/review/draft/abc');
	});

	it('keeps a READY draft under Proposed pages, not Other pages', () => {
		session.signedIn = false;
		pageStore.pages = [
			...pageStore.pages,
			{ id: 'draft:abc', title: 'Report a noisy site', type: 'Transaction', sections: [] }
		];
		render(Page);
		const link = screen.getByRole('link', { name: /^Report a noisy site/ });
		expect(link.closest('details')?.querySelector('summary')?.textContent).toMatch(
			/Proposed pages/
		);
	});

	it('lists every corpus page in All pages', () => {
		session.signedIn = false;
		render(Page);
		// A row is ONE anchor covering the whole row, so its accessible name is
		// every line inside it -- the title and the muted type line -- not the
		// title alone. That is deliberate: a screen reader then hears what a
		// sighted reader scans. `topic-x--about` is in no theme group, so this
		// also covers the "Other pages" fallback.
		expect(
			screen.getByRole('link', { name: 'About vector control About us' }).getAttribute('href')
		).toBe('/review/topic-x--about');
	});

	it('badges a page with its recorded status, inside the row name', async () => {
		session.signedIn = true;
		pagesStore.set([row('topic-x--about', 'approved')]);
		render(Page);

		// The badge is a span inside the link, so it joins the row's name. Pinned
		// deliberately: this is the composed order a screen reader announces.
		const link = await screen.findByRole('link', { name: /About vector control/ });
		expect(link.textContent?.replace(/\s+/g, ' ').trim()).toBe(
			'About vector control Approved About us'
		);
	});

	it('shows no status badge when signed out, there being no review to read', () => {
		session.signedIn = false;
		render(Page);
		expect(screen.queryByText('Undecided')).toBeNull();
		expect(screen.queryByText('Approved')).toBeNull();
	});
});
