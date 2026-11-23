import { describe, it, expect, vi } from 'vitest';

type Listener = (event: string, session: unknown) => void;
let listener: Listener = () => {};
const getSession = vi.fn();

vi.mock('$app/environment', () => ({ browser: true }));
vi.mock('$lib/supabase', () => ({
	supabase: {
		auth: {
			getSession,
			onAuthStateChange: (fn: Listener) => {
				listener = fn;
			}
		}
	},
	ensureDevSession: vi.fn(async () => {})
}));

const session = { user: { email: 'reviewer@example.test' } };
getSession.mockResolvedValue({ data: { session } });
const { sessionStore } = await import('../src/lib/stores/session.svelte');

describe('sessionStore email', () => {
	it('takes the address from the initial session', async () => {
		await vi.waitFor(() => expect(sessionStore.signedIn).toBe(true));
		expect(sessionStore.email).toBe('reviewer@example.test');
		expect(sessionStore.knownSignedOut).toBe(false);
	});

	it('clears it on sign-out and sets it again on sign-in', () => {
		listener('SIGNED_OUT', null);
		expect(sessionStore.signedIn).toBe(false);
		expect(sessionStore.knownSignedOut).toBe(true);
		expect(sessionStore.email).toBeNull();

		listener('SIGNED_IN', { user: { email: 'other@example.test' } });
		expect(sessionStore.signedIn).toBe(true);
		expect(sessionStore.email).toBe('other@example.test');
	});
});
