import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The local stack is the one environment where public signup could still be on.
 * Both hosted projects report `disable_signup: true`, so an address with no
 * invitation cannot mint itself an `authenticated` session there -- and that
 * role holds SELECT on every table plus UPDATE on ANY row of `pages`.
 *
 * With `enable_signup = true` locally, the login page's refusal path is never
 * exercised during development: a developer testing sign-in gets an account
 * created for whatever address they typed, and the one behaviour this app
 * depends on goes unobserved until production.
 *
 * `.spec.ts` under `tests/` is deliberate -- it puts this in the **server**
 * vitest project, which has node's `fs`. A `.test.ts` here would get jsdom.
 */
describe('local Supabase auth config', () => {
	it('disables signup in both [auth] and [auth.email]', () => {
		const toml = readFileSync('supabase/config.toml', 'utf8');
		const flags = [...toml.matchAll(/^enable_signup\s*=\s*(\w+)$/gm)].map((m) => m[1]);

		// Two uncommented occurrences: [auth] and [auth.email]. [auth.sms] is
		// already false and is matched here too; all of them must be false.
		expect(flags.length).toBeGreaterThanOrEqual(2);
		expect(flags.every((flag) => flag === 'false')).toBe(true);
	});
});
