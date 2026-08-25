/**
 * `.spec.ts` under `tests/`, so this runs in the NODE project rather than
 * jsdom -- see the vitest project split in CLAUDE.md. It exercises the pure
 * helpers only; the switch itself shells out to `supabase status` and writes
 * a real file, neither of which belongs in a unit test.
 */
import { describe, it, expect } from 'vitest';
import { parseEnv, applyEnv, describeTarget, serviceKeyAgrees } from '../scripts/env-target';

/** A JWT-shaped string whose payload carries the given issuer. */
const jwt = (iss: string) =>
	`header.${Buffer.from(JSON.stringify({ iss, role: 'service_role' })).toString('base64')}.sig`;

const LOCAL_KEY = jwt('supabase-demo');
const HOSTED_KEY = jwt('supabase');

describe('parseEnv', () => {
	it('reads keys and values, ignoring comments and blanks', () => {
		expect(parseEnv('# note\n\nA=1\nB=two\n')).toEqual({ A: '1', B: 'two' });
	});

	it('keeps `=` inside a value, which every JWT-bearing var has', () => {
		expect(parseEnv('K=a=b=c').K).toBe('a=b=c');
	});
});

describe('applyEnv', () => {
	it('replaces a target key in place', () => {
		const out = applyEnv('SVELTE_PUBLIC_SUPABASE_URL=old\n', {
			SVELTE_PUBLIC_SUPABASE_URL: 'new'
		});
		expect(out).toBe('SVELTE_PUBLIC_SUPABASE_URL=new\n');
	});

	it('appends a target key that was not there', () => {
		const out = applyEnv('OTHER=keep\n', { SUPABASE_SERVICE_ROLE_KEY: 'k' });
		expect(out).toContain('OTHER=keep');
		expect(out).toContain('SUPABASE_SERVICE_ROLE_KEY=k');
	});

	it('leaves comments and unrelated variables alone', () => {
		// The reason a switch edits in place rather than rewriting the file: a
		// switcher that flattened someone's notes is a switcher they stop using.
		const original = '# my notes\nMY_OWN_VAR=1\nSVELTE_PUBLIC_SUPABASE_URL=old\n';
		const out = applyEnv(original, { SVELTE_PUBLIC_SUPABASE_URL: 'new' });
		expect(out).toContain('# my notes');
		expect(out).toContain('MY_OWN_VAR=1');
		expect(out).not.toContain('old');
	});
});

describe('describeTarget', () => {
	it('recognises the local stack on any loopback form', () => {
		expect(describeTarget('http://127.0.0.1:54321').kind).toBe('local');
		expect(describeTarget('http://localhost:54321').kind).toBe('local');
	});

	it('names a hosted project by its ref', () => {
		const target = describeTarget('https://abcdefghijklm.supabase.co');
		expect(target.kind).toBe('hosted');
		expect(target.label).toContain('abcdefghijklm');
	});

	it('reports an unset url rather than guessing', () => {
		expect(describeTarget(undefined).kind).toBe('unset');
	});
});

describe('serviceKeyAgrees', () => {
	it('agrees when both name the local stack', () => {
		expect(
			serviceKeyAgrees({
				SVELTE_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
				SUPABASE_SERVICE_ROLE_KEY: LOCAL_KEY
			})
		).toBe(true);
	});

	it('agrees when both name a hosted project', () => {
		expect(
			serviceKeyAgrees({
				SVELTE_PUBLIC_SUPABASE_URL: 'https://abcdefghijklm.supabase.co',
				SUPABASE_SERVICE_ROLE_KEY: HOSTED_KEY
			})
		).toBe(true);
	});

	it('catches the split this script exists for: app local, service key hosted', () => {
		// The state this repo was actually in -- the app reading the local stack
		// while `corpus:import` would have written to production.
		expect(
			serviceKeyAgrees({
				SVELTE_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
				SUPABASE_SERVICE_ROLE_KEY: HOSTED_KEY
			})
		).toBe(false);
	});

	it('catches the reverse split too', () => {
		expect(
			serviceKeyAgrees({
				SVELTE_PUBLIC_SUPABASE_URL: 'https://abcdefghijklm.supabase.co',
				SUPABASE_SERVICE_ROLE_KEY: LOCAL_KEY
			})
		).toBe(false);
	});

	it('treats an undecodable key as hosted, the safe guess', () => {
		// Guessing "local" wrongly reports agreement while a script writes to
		// production; guessing "hosted" wrongly only reports a split that is not
		// there, which is loud and harmless.
		expect(
			serviceKeyAgrees({
				SVELTE_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
				SUPABASE_SERVICE_ROLE_KEY: 'not-a-jwt'
			})
		).toBe(false);
	});

	it('reports null rather than a verdict when there is nothing to compare', () => {
		expect(serviceKeyAgrees({ SVELTE_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321' })).toBeNull();
	});
});
