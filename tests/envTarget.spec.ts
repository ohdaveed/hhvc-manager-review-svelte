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

const LOCAL_DB = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
/** Direct connection: the ref is in the host. */
const hostedDb = (ref: string) => `postgresql://postgres:pw@db.${ref}.supabase.co:5432/postgres`;
/** Pooler: the ref is in the username instead, which is why both are parsed. */
const poolerDb = (ref: string) =>
	`postgresql://postgres.${ref}:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
/** A custom domain hides the ref, the same way a custom API domain does. */
const REFLESS_DB = 'postgresql://postgres:pw@custom.example.com:5432/postgres';

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
	it('agrees when all four name the local stack', () => {
		expect(
			credentialsAgree({
				SVELTE_PUBLIC_SUPABASE_URL: LOCAL_URL,
				SVELTE_PUBLIC_SUPABASE_ANON_KEY: LOCAL_KEY,
				SUPABASE_SERVICE_ROLE_KEY: LOCAL_KEY,
				SUPABASE_DB_URL: LOCAL_DB
			}).verdict
		).toBe('agree');
	});

	it('agrees when all four name the same hosted project', () => {
		expect(
			credentialsAgree({
				SVELTE_PUBLIC_SUPABASE_URL: PROJECT_URL,
				SVELTE_PUBLIC_SUPABASE_ANON_KEY: hostedKey(PROJECT),
				SUPABASE_SERVICE_ROLE_KEY: hostedKey(PROJECT),
				SUPABASE_DB_URL: hostedDb(PROJECT)
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

	it('catches two hosted projects behind a custom API domain', () => {
		// Supabase supports custom API domains, so `describeTarget` cannot read a
		// ref off the URL. The two keys still name two projects outright, and
		// comparing them only against the URL's ref missed that entirely.
		const { verdict, reason } = credentialsAgree({
			SVELTE_PUBLIC_SUPABASE_URL: 'https://api.example.gov',
			SVELTE_PUBLIC_SUPABASE_ANON_KEY: hostedKey(PROJECT),
			SUPABASE_SERVICE_ROLE_KEY: hostedKey('nopqrstuvwxyz')
		});
		expect(verdict).toBe('split');
		expect(reason).toContain('nopqrstuvwxyz');
		expect(reason).toContain(PROJECT);
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
				SUPABASE_SERVICE_ROLE_KEY: HOSTED_KEY,
				SUPABASE_DB_URL: REFLESS_DB
			}).verdict
		).toBe('agree');
	});

	it('catches a connection string naming a different hosted project', () => {
		// The failure this variable introduced the risk of: the app and both keys
		// on staging while `corpus:import` writes the corpus version to
		// production, with nothing in the UI to say so.
		const { verdict, reason } = credentialsAgree({
			SVELTE_PUBLIC_SUPABASE_URL: PROJECT_URL,
			SVELTE_PUBLIC_SUPABASE_ANON_KEY: hostedKey(PROJECT),
			SUPABASE_SERVICE_ROLE_KEY: hostedKey(PROJECT),
			SUPABASE_DB_URL: hostedDb('otherproject')
		});
		expect(verdict).toBe('split');
		expect(reason).toContain('connection string');
		expect(reason).toContain('otherproject');
	});

	it('finds the ref in the pooler username too, not only the host', () => {
		// A pooler connection string has no ref in its host at all -- it is
		// `aws-0-<region>.pooler.supabase.com` for every project -- so reading
		// only the host would silently classify every pooled connection as
		// ref-unknown and never catch a mismatch.
		const { verdict, reason } = credentialsAgree({
			SVELTE_PUBLIC_SUPABASE_URL: PROJECT_URL,
			SVELTE_PUBLIC_SUPABASE_ANON_KEY: hostedKey(PROJECT),
			SUPABASE_SERVICE_ROLE_KEY: hostedKey(PROJECT),
			SUPABASE_DB_URL: poolerDb('otherproject')
		});
		expect(verdict).toBe('split');
		expect(reason).toContain('otherproject');
	});

	it('catches a local connection string beside a hosted app', () => {
		const { verdict, reason } = credentialsAgree({
			SVELTE_PUBLIC_SUPABASE_URL: PROJECT_URL,
			SVELTE_PUBLIC_SUPABASE_ANON_KEY: hostedKey(PROJECT),
			SUPABASE_SERVICE_ROLE_KEY: hostedKey(PROJECT),
			SUPABASE_DB_URL: LOCAL_DB
		});
		expect(verdict).toBe('split');
		expect(reason).toContain('connection string');
	});

	it('never puts the connection string itself in the reason', () => {
		// It carries the database password. The ref is nameable; the string is not.
		const { reason } = credentialsAgree({
			SVELTE_PUBLIC_SUPABASE_URL: PROJECT_URL,
			SVELTE_PUBLIC_SUPABASE_ANON_KEY: hostedKey(PROJECT),
			SUPABASE_SERVICE_ROLE_KEY: hostedKey(PROJECT),
			SUPABASE_DB_URL: hostedDb('otherproject')
		});
		expect(reason).not.toContain('pw');
		expect(reason).not.toContain('postgresql://');
	});

	it('reports unknown when only the connection string is missing', () => {
		const { verdict, reason } = credentialsAgree({
			SVELTE_PUBLIC_SUPABASE_URL: LOCAL_URL,
			SVELTE_PUBLIC_SUPABASE_ANON_KEY: LOCAL_KEY,
			SUPABASE_SERVICE_ROLE_KEY: LOCAL_KEY
		});
		expect(verdict).toBe('unknown');
		expect(reason).toContain('SUPABASE_DB_URL');
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
			`SUPABASE_SERVICE_ROLE_KEY="${LOCAL_KEY}"`,
			`SUPABASE_DB_URL="${LOCAL_DB}"`
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

	it('still catches a split when the other credential is merely absent', () => {
		// A split outranks an unknown. Checking presence first would let an
		// absent anon key hide exactly the state #49 already caught: a
		// service-role key naming production beside a local URL.
		const { verdict, reason } = credentialsAgree({
			SVELTE_PUBLIC_SUPABASE_URL: LOCAL_URL,
			SUPABASE_SERVICE_ROLE_KEY: HOSTED_KEY
		});
		expect(verdict).toBe('split');
		expect(reason).toContain('service-role key');
	});

	it('reports unknown rather than a verdict when the url is unset', () => {
		expect(credentialsAgree({ SUPABASE_SERVICE_ROLE_KEY: LOCAL_KEY }).verdict).toBe('unknown');
	});

	it('never puts key material in the reason it reports', () => {
		// `reportStatus` prints `reason` verbatim, and "no key is ever printed"
		// is one of the three load-bearing properties of this script.
		const HOSTED = hostedKey('nopqrstuvwxyz');
		const reasons = [
			credentialsAgree({
				SVELTE_PUBLIC_SUPABASE_URL: LOCAL_URL,
				SVELTE_PUBLIC_SUPABASE_ANON_KEY: LOCAL_KEY,
				SUPABASE_SERVICE_ROLE_KEY: HOSTED
			}),
			credentialsAgree({
				SVELTE_PUBLIC_SUPABASE_URL: PROJECT_URL,
				SVELTE_PUBLIC_SUPABASE_ANON_KEY: hostedKey(PROJECT),
				SUPABASE_SERVICE_ROLE_KEY: HOSTED
			}),
			credentialsAgree({ SVELTE_PUBLIC_SUPABASE_URL: LOCAL_URL })
		].map((result) => result.reason ?? '');

		expect(reasons).toHaveLength(3);
		for (const reason of reasons) {
			expect(reason).not.toContain(LOCAL_KEY);
			expect(reason).not.toContain(HOSTED);
			expect(reason).not.toContain(hostedKey(PROJECT));
		}
	});
});
