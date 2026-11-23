/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';

const session = vi.hoisted(() => ({ signedIn: true as boolean | undefined }));
vi.mock('$lib/stores/session.svelte', () => ({ sessionStore: session }));
vi.mock('$lib/ai/generate', () => ({ requestGeneration: vi.fn() }));
vi.mock('$lib/supabase', () => ({
	supabase: { auth: { getSession: async () => ({ data: { session: null } }) }, from: () => ({}) }
}));

const createDraft = vi.fn();
vi.mock('$lib/stores/draftPages', async (orig) => ({
	...(await orig<typeof import('../src/lib/stores/draftPages')>()),
	createDraft: (...a: unknown[]) => createDraft(...a)
}));

import ProposePageForm from '../src/lib/components/landing/ProposePageForm.svelte';
import { draftsStore, type DraftPage } from '../src/lib/stores/draftPages';
import { MAX_DESCRIPTION_CHARS } from '../src/lib/corpus/draftPath';

const draft = (description: string): DraftPage => ({
	id: 'new1',
	path: 'draft:new1',
	title: 'Rat bait',
	description,
	state: 'drafting',
	content: null,
	valid: null,
	issues: null,
	model: null,
	created_by: 'u1',
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString()
});

/** Mimics createDraft: the row lands in the store at once, the promise settles later. */
function pending() {
	let finish!: () => void;
	let fail!: (e: Error) => void;
	createDraft.mockImplementation((description: string) => {
		draftsStore.update((all) => [...all, draft(description)]);
		return new Promise((res, rej) => {
			finish = () => res(draft(description));
			fail = rej;
		});
	});
	return { finish: () => finish(), fail: (e: Error) => fail(e) };
}

const field = () => screen.getByRole('textbox') as HTMLTextAreaElement;
const submit = () => screen.getByRole('button', { name: /draft this page/i }) as HTMLButtonElement;
const type = (v: string) => fireEvent.input(field(), { target: { value: v } });

beforeEach(() => {
	session.signedIn = true;
	createDraft.mockReset();
	draftsStore.set([]);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('ProposePageForm', () => {
	it('offers no form but an actionable, distinctly named sign-in link when signed out', () => {
		session.signedIn = false;
		render(ProposePageForm);
		expect(screen.queryByRole('textbox')).toBeNull();
		expect(
			screen.getByRole('link', { name: 'Sign in to propose a page' }).getAttribute('href')
		).toBe('/login');
	});

	it('shows a neutral line while the session is still resolving', () => {
		session.signedIn = undefined;
		render(ProposePageForm);
		expect(screen.queryByRole('textbox')).toBeNull();
		expect(screen.getByText(/preparing the form/i)).toBeTruthy();
	});

	it('disables submit until a non-whitespace description is typed', async () => {
		render(ProposePageForm);
		expect(submit().disabled).toBe(true);
		await type('   \n ');
		expect(submit().disabled).toBe(true);
		await type('A page about rat bait');
		expect(submit().disabled).toBe(false);
	});

	it('refuses to submit over the cap, names it, and does not truncate', async () => {
		render(ProposePageForm);
		const long = 'x'.repeat(MAX_DESCRIPTION_CHARS + 1);
		await type(long);
		expect(field().value).toBe(long);
		// jsdom does not enforce maxlength, so pin its absence: a real browser would cut pasted text.
		expect(field().hasAttribute('maxlength')).toBe(false);
		expect(submit().disabled).toBe(true);
		expect(screen.getByText(/1 character over/i)).toBeTruthy();
		expect(field().getAttribute('aria-invalid')).toBe('true');
		const describedBy = field().getAttribute('aria-describedby') ?? '';
		expect(
			describedBy
				.split(' ')
				.some((id) => document.getElementById(id)?.getAttribute('role') === 'alert')
		).toBe(true);
		expect(createDraft).not.toHaveBeenCalled();
	});

	it('disables submit while a draft is in flight so a double click cannot create two rows', async () => {
		let release!: (d: DraftPage) => void;
		createDraft.mockImplementation(
			() => new Promise((res) => (release = res)) // row never lands: still waiting on the POST
		);
		render(ProposePageForm);
		await type('A page about rat bait');
		await fireEvent.click(submit());
		expect(submit().disabled).toBe(true);
		await fireEvent.click(submit());
		expect(createDraft).toHaveBeenCalledOnce();
		release(draft('A page about rat bait'));
	});

	it('confirms and clears as soon as the row exists, without waiting for generation', async () => {
		pending(); // the promise never settles in this test
		render(ProposePageForm);
		await type('A page about rat bait');
		await fireEvent.click(submit());

		await waitFor(() => expect(field().value).toBe(''));
		expect(screen.getByRole('status').textContent).toMatch(/in your queue/i);
		expect(screen.getByRole('status').textContent).toMatch(/leave this page/i);
		expect(screen.getByRole('link', { name: /open the draft/i }).getAttribute('href')).toBe(
			'/review/draft/new1'
		);
		// Free for another description while the first is still generating.
		await type('Another page');
		expect(submit().disabled).toBe(false);
	});

	it('keeps the description when the request fails before a row exists', async () => {
		createDraft.mockRejectedValue(new Error('Draft request failed with status 500.'));
		render(ProposePageForm);
		await type('A page about rat bait');
		await fireEvent.click(submit());

		expect((await screen.findByRole('alert')).textContent).toMatch(/nothing was saved/i);
		expect(field().value).toBe('A page about rat bait');
		expect(field().getAttribute('aria-invalid')).toBe('true');
		expect(submit().disabled).toBe(false);
	});

	it('does not touch the field or log an error when a draft fails after its row exists', async () => {
		const ctl = pending();
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		render(ProposePageForm);
		await type('First page');
		await fireEvent.click(submit());
		await waitFor(() => expect(field().value).toBe(''));
		await type('Second, half typed');
		ctl.fail(new Error('Draft request failed with status 500.'));

		await waitFor(() => expect(warnSpy).toHaveBeenCalledOnce());
		expect(field().value).toBe('Second, half typed');
		expect(screen.queryByRole('alert')).toBeNull();
		expect(screen.getByRole('status').textContent).toMatch(/open the draft to retry/i);
		expect(errorSpy).not.toHaveBeenCalled();
	});

	it('keeps text typed while the row was being created', async () => {
		let land!: () => void;
		createDraft.mockImplementation(
			(d: string) =>
				new Promise(() => {
					land = () => draftsStore.update((all) => [...all, draft(d)]);
				})
		);
		render(ProposePageForm);
		await type('First');
		await fireEvent.click(submit());
		// The row has NOT landed yet; the reviewer keeps typing, then it lands.
		await type('First, plus more');
		land();
		await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/in your queue/i));
		expect(field().value).toBe('First, plus more');
	});

	it('confirms from the resolved draft when the store match never fires', async () => {
		createDraft.mockResolvedValue(draft('A page about rat bait'));
		render(ProposePageForm);
		await type('A page about rat bait');
		await fireEvent.click(submit());
		await waitFor(() => expect(field().value).toBe(''));
		expect(screen.getByRole('status').textContent).toMatch(/in your queue/i);
	});

	it('keeps the over-limit alert text static so it is not re-announced per keystroke', async () => {
		render(ProposePageForm);
		await type('x'.repeat(MAX_DESCRIPTION_CHARS + 1));
		const before = document.getElementById('propose-over')?.textContent;
		await type('x'.repeat(MAX_DESCRIPTION_CHARS + 5));
		expect(document.getElementById('propose-over')?.textContent).toBe(before);
	});

	it('leaves no store subscriber behind after a failed attempt or an unmount', async () => {
		let active = 0;
		const original = draftsStore.subscribe.bind(draftsStore);
		vi.spyOn(draftsStore, 'subscribe').mockImplementation((...args) => {
			active++;
			const off = original(...args);
			return () => {
				active--;
				off();
			};
		});
		createDraft.mockRejectedValueOnce(new Error('boom'));
		const { unmount } = render(ProposePageForm);
		await type('A page');
		await fireEvent.click(submit());
		await screen.findByRole('alert');
		expect(active).toBe(0);

		// Retry; the row never lands, so the watcher is live until teardown.
		createDraft.mockImplementationOnce(() => new Promise(() => {}));
		await fireEvent.click(submit());
		expect(active).toBe(1);
		unmount();
		expect(active).toBe(0);
	});

	it('a stale draft failing late does not overwrite the newer draft note', async () => {
		const fails: ((e: Error) => void)[] = [];
		let n = 0;
		createDraft.mockImplementation((d: string) => {
			const id = `row${++n}`;
			draftsStore.update((all) => [...all, { ...draft(d), id, path: `draft:${id}` }]);
			return new Promise((_, rej) => fails.push(rej));
		});
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		render(ProposePageForm);
		await type('First');
		await fireEvent.click(submit());
		await waitFor(() => expect(field().value).toBe(''));
		await type('Second');
		await fireEvent.click(submit());
		await waitFor(() => expect(field().value).toBe(''));
		fails[0](new Error('late'));
		await new Promise((r) => setTimeout(r, 0));
		const status = screen.getByRole('status');
		expect(status.textContent).not.toMatch(/did not finish/i);
		expect(screen.getByRole('link', { name: /open the draft/i }).getAttribute('href')).toBe(
			'/review/draft/row2'
		);
	});
});
