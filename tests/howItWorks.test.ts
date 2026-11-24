/**
 * @vitest-environment jsdom
 *
 * `How it works` is a disclosure now, and its DEFAULT state is the behaviour
 * worth pinning: closed for a signed-in reviewer, open for a signed-out
 * visitor, and closed during the initial session check so the signed-in case
 * never flashes open and collapses.
 *
 * All four steps stay in the DOM either way -- a `<details>` hides its content
 * visually but keeps it findable by in-page search, which is the reason for
 * using the native element rather than mounting the list conditionally.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';

const session = { signedIn: undefined as boolean | undefined, knownSignedOut: false };
vi.mock('$lib/stores/session.svelte', () => ({ sessionStore: session }));

vi.mock('$lib/supabase', () => ({
	ensureDevSession: async () => {},
	supabase: {
		auth: {
			getSession: async () => ({ data: { session: null } }),
			onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
		}
	}
}));

const { default: HowItWorks } = await import('../src/lib/components/landing/HowItWorks.svelte');

const panel = () => document.querySelector('details');

beforeEach(() => {
	session.signedIn = undefined;
	session.knownSignedOut = false;
});

describe('HowItWorks', () => {
	it('is closed while the session check is still pending', () => {
		render(HowItWorks);
		expect(panel()?.open).toBe(false);
	});

	it('is closed for a signed-in reviewer', () => {
		session.signedIn = true;
		session.knownSignedOut = false;
		render(HowItWorks);
		expect(panel()?.open).toBe(false);
	});

	it('is open for a visitor known to be signed out', () => {
		session.signedIn = false;
		session.knownSignedOut = true;
		render(HowItWorks);
		expect(panel()?.open).toBe(true);
	});

	it('keeps every step in the DOM when collapsed', () => {
		session.signedIn = true;
		render(HowItWorks);
		expect(panel()?.open).toBe(false);
		expect(screen.getAllByRole('listitem')).toHaveLength(4);
		expect(screen.getByText(/Record a decision/)).toBeTruthy();
	});

	it('names the disclosure with the heading, which stays a heading', () => {
		render(HowItWorks);
		const heading = screen.getByRole('heading', { level: 2, name: 'How it works' });
		expect(heading).toBeTruthy();
		expect(heading.closest('summary')).not.toBeNull();
	});
});
