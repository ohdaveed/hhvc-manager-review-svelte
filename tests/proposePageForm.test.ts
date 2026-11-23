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
	it('explains that sign-in is needed, offers no form and no second sign-in link, when signed out', () => {
		session.signedIn = false;
		render(ProposePageForm);
		expect(screen.queryByRole('textbox')).toBeNull();
		expect(screen.queryByRole('link', { name: /sign in/i })).toBeNull();
		expect(screen.getByText(/needs you to sign in/i)).toBeTruthy();
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
		createDraft.mockImplementation(async (d: string) => {
			await Promise.resolve();
			draftsStore.update((all) => [...all, draft(d)]);
			return new Promise(() => {});
		});
		render(ProposePageForm);
		await type('First');
		await fireEvent.click(submit());
		await type('First, plus more');
		await new Promise((r) => setTimeout(r, 0));
		expect(field().value).toBe('First, plus more');
	});
});
