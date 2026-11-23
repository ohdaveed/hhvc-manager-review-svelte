import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';

const getSession = vi.fn();

vi.mock('$lib/supabase', () => ({
	supabase: { auth: { getSession, signOut: vi.fn() } },
	ensureDevSession: vi.fn()
}));

// The signed-in branch is the only one that carries the invite form, and
// `sessionStore` resolves its real value from browser storage. A plain object
// is enough: the page reads `signedIn` once per render.
vi.mock('$lib/stores/session.svelte', () => ({
	sessionStore: { signedIn: true, knownSignedOut: false }
}));

const Login = (await import('../src/routes/login/+page.svelte')).default;

/**
 * The invite is an authenticated call: `/api/invite` verifies the bearer token
 * and refuses without one. A form that posted the address alone would 401 on
 * every send, so the token is the thing worth pinning.
 */
describe('invite form on /login', () => {
	const ACTION_LINK = 'https://example.test/verify?token=abc';

	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		getSession.mockReset();
		getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });

		fetchMock = vi.fn(
			async () => new Response(JSON.stringify({ email: 'new@sfgov.org', actionLink: ACTION_LINK }))
		);
		vi.stubGlobal('fetch', fetchMock);
	});

	let lastContainer: HTMLElement;

	async function submitInvite(address: string) {
		const { container } = render(Login);
		lastContainer = container;
		const input = container.querySelector<HTMLInputElement>(
			'#invite-email input, input#invite-email'
		);
		if (!input) throw new Error('no invite email input rendered');

		await fireEvent.input(input, { target: { value: address } });
		await fireEvent.submit(input.closest('form')!);
		return input;
	}

	it('sends the invite with the caller’s access token', async () => {
		await submitInvite('new@sfgov.org');

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(path).toBe('/api/invite');
		expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
		expect(JSON.parse(init.body as string)).toEqual({ email: 'new@sfgov.org' });
	});

	it('shows the generated link for copying', async () => {
		await submitInvite('new@sfgov.org');

		expect(await screen.findByText(ACTION_LINK)).toBeTruthy();
	});

	/**
	 * The link is single-use. If it renders as an anchor and the inviter clicks
	 * it to check it works, they consume the token, get signed in AS the
	 * invitee, and the invitee's link is dead before it is sent.
	 */
	it('does not render the link as a navigable anchor', async () => {
		await submitInvite('new@sfgov.org');

		expect(lastContainer.querySelector('a[href*="example.test"]')).toBeNull();
	});

	it('warns that the link signs the holder in', async () => {
		await submitInvite('new@sfgov.org');

		expect(await screen.findByText(/signs in as them|treat it like a password/i)).toBeTruthy();
	});

	it('recovers when the request itself fails', async () => {
		// `fetch` REJECTS on a network failure -- it does not resolve a non-ok
		// Response. The sign-in half of this page is safe from that only because
		// `signInWithOtp` returns `{ error }` instead of throwing. Without a
		// `finally`, `inviting` stays true: the field stays disabled, the button
		// stays on "Sending…", and nothing is ever shown to the reviewer.
		fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

		const input = await submitInvite('new@sfgov.org');

		expect(input.disabled).toBe(false);
		// Matched on the body, not the alert title: "That did not send" is the
		// shared title of every failure, so it appears twice.
		expect(await screen.findByText(/Check your connection/i)).toBeTruthy();
	});

	it('shows the route’s message when the invite is refused', async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ message: 'That address already has an account.' }), {
				status: 409
			})
		);

		await submitInvite('taken@sfgov.org');

		expect(await screen.findByText('That address already has an account.')).toBeTruthy();
	});
});
