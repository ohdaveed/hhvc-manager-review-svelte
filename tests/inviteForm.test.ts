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
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		getSession.mockReset();
		getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });

		fetchMock = vi.fn(async () => new Response(JSON.stringify({ email: 'new@sfgov.org' })));
		vi.stubGlobal('fetch', fetchMock);
	});

	async function submitInvite(address: string) {
		const { container } = render(Login);
		const input = container.querySelector<HTMLInputElement>(
			'#invite-email input, input#invite-email'
		);
		if (!input) throw new Error('no invite email input rendered');

		await fireEvent.input(input, { target: { value: address } });
		await fireEvent.submit(input.closest('form')!);
	}

	it('sends the invite with the caller’s access token', async () => {
		await submitInvite('new@sfgov.org');

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(path).toBe('/api/invite');
		expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
		expect(JSON.parse(init.body as string)).toEqual({ email: 'new@sfgov.org' });
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
