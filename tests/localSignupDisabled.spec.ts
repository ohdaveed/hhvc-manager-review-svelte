import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The local stack is the one environment where public signup could still be on.
 * Both hosted projects report `disable_signup: true`, so an address with no
 * invitation cannot mint itself an `authenticated` session there -- and that
 * role holds SELECT on every table plus UPDATE on ANY row of `pages`.
 *
 * With signup on locally, the login page's refusal path is never exercised
 * during development: a developer testing sign-in gets an account created for
 * whatever address they typed, and the one behaviour this app depends on goes
 * unobserved until production.
 *
 * The two `enable_signup` keys do NOT mean the same thing, and this test used
 * to require both `false`, which broke every email login on the local stack:
 *
 * - `[auth] enable_signup` is the signup switch (GOTRUE_DISABLE_SIGNUP).
 * - `[auth.email] enable_signup` is the email PROVIDER switch
 *   (GOTRUE_EXTERNAL_EMAIL_ENABLED). At `false`, password and magic-link
 *   sign-in both answer 422 `email_provider_disabled`, so `ensureDevSession()`
 *   failed and the local app was always signed out.
 *
 * Measured on the local stack with `[auth]` false and `[auth.email]` true: the
 * seeded user signs in, a magic link to them sends, and both
 * `POST /auth/v1/signup` and `POST /auth/v1/otp` with `create_user: true` for an
 * unknown address answer 422 `signup_disabled`.
 *
 * `.spec.ts` under `tests/` is deliberate -- it puts this in the **server**
 * vitest project, which has node's `fs`. A `.test.ts` here would get jsdom.
 */
function signupFlags(toml: string): Record<string, string> {
	const flags: Record<string, string> = {};
	let section = '';
	for (const line of toml.split('\n')) {
		const header = line.match(/^\[([^\]]+)\]\s*$/);
		if (header) section = header[1];
		const flag = line.match(/^enable_signup\s*=\s*(\w+)\s*$/);
		if (flag) flags[section] = flag[1];
	}
	return flags;
}

describe('local Supabase auth config', () => {
	const flags = signupFlags(readFileSync('supabase/config.toml', 'utf8'));

	it('disables signup', () => {
		expect(flags['auth']).toBe('false');
		expect(flags['auth.sms']).toBe('false');
	});

	it('keeps the email provider on, so sign-in works locally', () => {
		expect(flags['auth.email']).toBe('true');
	});
});
