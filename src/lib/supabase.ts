import { createClient } from '@supabase/supabase-js';
import { SVELTE_PUBLIC_SUPABASE_URL, SVELTE_PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// Initialize the Supabase client
export const supabase = createClient(SVELTE_PUBLIC_SUPABASE_URL, SVELTE_PUBLIC_SUPABASE_ANON_KEY);

/**
 * The account `supabase/seed.sql` creates for the local stack. Kept in step with
 * that file by hand — both are local-development fixtures, and the password is
 * only ever valid against a Postgres running on this machine.
 */
const DEV_USER_EMAIL = 'arrizon.david@gmail.com';
const DEV_USER_PASSWORD = 'dev-local-only';

let devSignIn: Promise<void> | null = null;

/**
 * Signs in as the seeded development user so the local loop works without a
 * magic link. Every RLS policy is `FOR ALL TO authenticated`, so with the bare
 * anon key `loadReview()` reads nothing and the queue, decisions, notes and
 * checks are all inert.
 *
 * `import.meta.env.DEV` is a compile-time constant, so this whole branch — the
 * credentials included — is dead code that Rollup drops from a production
 * build. `scripts/verify.sh` greps the deployed bundles for the address as a
 * standing check that it stays that way.
 *
 * This is a local convenience, not an auth implementation. The hosted app still
 * has no login route, and its RLS policies still let any signed-in user read or
 * delete any row.
 */
export async function ensureDevSession(): Promise<void> {
	if (!import.meta.env.DEV) return;

	// One in-flight attempt, reused: the review layout can mount more than once.
	devSignIn ??= (async () => {
		const { data } = await supabase.auth.getSession();
		if (data.session) return;

		const { error } = await supabase.auth.signInWithPassword({
			email: DEV_USER_EMAIL,
			password: DEV_USER_PASSWORD
		});

		if (error) {
			console.warn(
				`Dev auto sign-in failed (${error.message}). ` +
					'Run `supabase db reset` to apply supabase/seed.sql, or sign in manually.'
			);
			// Allow a later mount to retry rather than caching the failure.
			devSignIn = null;
		}
	})();

	return devSignIn;
}
