/**
 * `.spec.ts` under `tests/`, so this runs in the NODE project rather than
 * jsdom -- see the vitest project split in CLAUDE.md. It exercises the pure
 * helpers only; the switch itself shells out to `supabase status` and writes
 * a real file, neither of which belongs in a unit test.
 */
import { describe, it, expect } from 'vitest';
import { parseEnv, applyEnv, describeTarget, credentialsAgree } from '../scripts/env-target';

/** A JWT-shaped string carrying the given payload. */
const jwt = (payload: Record<string, unknown>) =>
	`header.${Buffer.from(JSON.stringify(payload)).toString('base64')}.sig`;

const LOCAL_KEY = jwt({ iss: 'supabase-demo', role: 'service_role' });
/** A hosted key, optionally naming the project it belongs to. */
const hostedKey = (ref?: string) => jwt({ iss: 'supabase', ref, role: 'service_role' });
/** The refless shape -- an older key, or one of the non-JWT `sb_secret_` kind. */
const HOSTED_KEY = hostedKey();

const PROJECT = 'abcdefghijklm';
const PROJECT_URL = `https://${PROJECT}.supabase.co`;
const LOCAL_URL = 'http://127.0.0.1:54321';

describe('parseEnv', () => {
	it('reads keys and values, ignoring comments and blanks', () => {
		expect(parseEnv('# note\n\nA=1\nB=two\n')).toEqual({ A: '1', B: 'two' });
	});

	it('keeps `=` inside a value, which every JWT-bearing var has', () => {
		expect(parseEnv('K=a=b=c').K).toBe('a=b=c');
	});

	it('strips surrounding quotes, as Vite’s dotenv does', () => {
		expect(parseEnv('A="one"\nB=\'two\'\n')).toEqual({ A: 'one', B: 'two' });
	});

	it('leaves unmatched or interior quotes alone', () => {
		expect(parseEnv('A="one\nB=say "hi"\nC="\n')).toEqual({
			A: '"one',
			B: 'say "hi"',
			C: '"'
		});
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
		const target = describeTarget(PROJECT_URL);
		expect(target.kind).toBe('hosted');
		expect(target.ref).toBe(PROJECT);
		expect(target.label).toContain(PROJECT);
	});

	it('reports an unset url rather than guessing', () => {
		expect(describeTarget(undefined).kind).toBe('unset');
	});
});

describe('credentialsAgree', () => {
	it('agrees when all three name the local stack', () => {
		expect(
			credentialsAgree({
				SVELTE_PUBLIC_SUPABASE_URL: LOCAL_URL,
				SVELTE_PUBLIC_SUPABASE_ANON_KEY: LOCAL_KEY,
				SUPABASE_SERVICE_ROLE_KEY: LOCAL_KEY
			}).verdict
		).toBe('agree');
	});

	it('agrees when all three name the same hosted project', () => {
		expect(
			credentialsAgree({
				SVELTE_PUBLIC_SUPABASE_URL: PROJECT_URL,
				SVELTE_PUBLIC_SUPABASE_ANON_KEY: hostedKey(PROJECT),
				SUPABASE_SERVICE_ROLE_KEY: hostedKey(PROJECT)
			}).verdict
		).toBe('agree');
	});

	it('catches the split this script exists for: app local, service key hosted', () => {
		// The state this repo was actually in -- the app reading the local stack
		// while `corpus:import` would have written to production.
		const { verdict, reason } = credentialsAgree({
			SVELTE_PUBLIC_SUPABASE_URL: LOCAL_URL,
			SVELTE_PUBLIC_SUPABASE_ANON_KEY: LOCAL_KEY,
			SUPABASE_SERVICE_ROLE_KEY: HOSTED_KEY
		});
		expect(verdict).toBe('split');
		expect(reason).toContain('service-role key');
	});

	it('catches the reverse split too', () => {
		expect(
			credentialsAgree({
				SVELTE_PUBLIC_SUPABASE_URL: PROJECT_URL,
				SVELTE_PUBLIC_SUPABASE_ANON_KEY: hostedKey(PROJECT),
				SUPABASE_SERVICE_ROLE_KEY: LOCAL_KEY
			}).verdict
		).toBe('split');
	});

	it('catches an anon key that names somewhere the other two do not', () => {
		// The service-role key alone used to decide this, so a stale anon key
		// beside a correct URL and service key reported a healthy target while
		// the browser could not authenticate at all.
		const { verdict, reason } = credentialsAgree({
			SVELTE_PUBLIC_SUPABASE_URL: PROJECT_URL,
			SVELTE_PUBLIC_SUPABASE_ANON_KEY: LOCAL_KEY,
			SUPABASE_SERVICE_ROLE_KEY: hostedKey(PROJECT)
		});
		expect(verdict).toBe('split');
		expect(reason).toContain('anon key');
	});

	it('catches two different hosted projects, which both look "hosted"', () => {
		const { verdict, reason } = credentialsAgree({
			SVELTE_PUBLIC_SUPABASE_URL: PROJECT_URL,
			SVELTE_PUBLIC_SUPABASE_ANON_KEY: hostedKey(PROJECT),
			SUPABASE_SERVICE_ROLE_KEY: hostedKey('nopqrstuvwxyz')
		});
		expect(verdict).toBe('split');
		expect(reason).toContain('nopqrstuvwxyz');
	});

	it('does not call a missing project ref a disagreement', () => {
		// The opposite resolution to the undecodable-key case below, and
		// deliberately so: a null ref carries no information, and the newer
		// non-JWT keys have none, so flagging them would cry wolf on a correct
		// setup. Refs are compared only when both sides have one.
		expect(
			credentialsAgree({
				SVELTE_PUBLIC_SUPABASE_URL: PROJECT_URL,
				SVELTE_PUBLIC_SUPABASE_ANON_KEY: HOSTED_KEY,
				SUPABASE_SERVICE_ROLE_KEY: HOSTED_KEY
			}).verdict
		).toBe('agree');
	});

	it('treats an undecodable key as hosted, the safe guess', () => {
		// Guessing "local" wrongly reports agreement while a script writes to
		// production; guessing "hosted" wrongly only reports a split that is not
		// there, which is loud and harmless.
		expect(
			credentialsAgree({
				SVELTE_PUBLIC_SUPABASE_URL: LOCAL_URL,
				SVELTE_PUBLIC_SUPABASE_ANON_KEY: LOCAL_KEY,
				SUPABASE_SERVICE_ROLE_KEY: 'not-a-jwt'
			}).verdict
		).toBe('split');
	});

	it('agrees on a quoted .env.local, read the way the script reads it', () => {
		// End to end through parseEnv, because the reported failure was a
		// correctly quoted file classified as hosted -- SPLIT TARGET on a
		// healthy local setup.
		const file = [
			`SVELTE_PUBLIC_SUPABASE_URL="${LOCAL_URL}"`,
			`SVELTE_PUBLIC_SUPABASE_ANON_KEY="${LOCAL_KEY}"`,
			`SUPABASE_SERVICE_ROLE_KEY="${LOCAL_KEY}"`
		].join('\n');
		expect(credentialsAgree(parseEnv(file)).verdict).toBe('agree');
	});

	it('reports unknown, naming the gap, when a credential is missing', () => {
		const { verdict, reason } = credentialsAgree({
			SVELTE_PUBLIC_SUPABASE_URL: LOCAL_URL,
			SVELTE_PUBLIC_SUPABASE_ANON_KEY: LOCAL_KEY
		});
		expect(verdict).toBe('unknown');
		expect(reason).toContain('SUPABASE_SERVICE_ROLE_KEY');
	});

	it('reports unknown rather than a verdict when the url is unset', () => {
		expect(credentialsAgree({ SUPABASE_SERVICE_ROLE_KEY: LOCAL_KEY }).verdict).toBe('unknown');
	});
});
