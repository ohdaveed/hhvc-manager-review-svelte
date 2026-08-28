/**
 * Points local development at either the local Supabase stack or the hosted
 * project, and says which one is active.
 *
 * This exists because the failure it prevents is silent. `.env.local` pointed
 * at the hosted project while `ensureDevSession()` signs in with the local
 * seed's password, so the sign-in was rejected (`captcha protection: request
 * disallowed`), there was no session, and every RLS policy is
 * `TO authenticated` -- so `loadReview()` read nothing and the queue,
 * decisions, notes and checks were all inert. The mockups still rendered from
 * the static corpus, so the app looked like it was working. The only visible
 * symptom was `No review found: null` in the console.
 *
 * Three things here are load bearing:
 *
 * 1. **Local values are read from `supabase status` at switch time**, never
 *    stored. They change when the stack is recreated, and a stored copy would
 *    go stale silently -- reintroducing the same class of bug in a file whose
 *    name claims it is handled. It also keeps local keys out of this repo and
 *    out of shell history.
 *
 * 2. **`SUPABASE_SERVICE_ROLE_KEY` switches with the public vars.** It is the
 *    credential `corpus:import` and `scripts/sync-checks.ts` use, and it
 *    bypasses RLS entirely. A switcher that moved only the two
 *    `SVELTE_PUBLIC_*` vars would leave the app reading local while those
 *    scripts wrote to PRODUCTION -- the exact split this repo was in before
 *    this script existed, now hidden behind a command that implies otherwise.
 *
 * 3. **No key is ever printed.** Targets are reported by name and URL. The
 *    hosted anon key is public by design (it ships in the browser bundle), but
 *    the service-role key in the same file is not, and a script that prints
 *    "the env" prints both.
 *
 * Hosted credentials come from Doppler (`hhvc-svelte/prd`), falling back to
 * `.env.hosted` when Doppler cannot answer -- not installed, not logged in, or
 * offline. That file is gitignored by the `.env.*` rule and is a profile, not
 * the live file: nothing reads it but this script. Whichever source supplied
 * the values is printed, since "worked" and "worked from the file you meant to
 * retire" are different outcomes.
 *
 * Usage:
 *   bun run env:status    # which target is active
 *   bun run env:local     # point at the local stack
 *   bun run env:hosted    # point at the hosted project
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ENV_FILE = '.env.local';
const HOSTED_PROFILE = '.env.hosted';

/** Where the hosted secrets live. `prd` is the production Supabase project. */
const DOPPLER_PROJECT = 'hhvc-svelte';
const DOPPLER_CONFIG = 'prd';

/** The three variables a target owns. Anything else in `.env.local` is left alone. */
export const TARGET_KEYS = [
	'SVELTE_PUBLIC_SUPABASE_URL',
	'SVELTE_PUBLIC_SUPABASE_ANON_KEY',
	'SUPABASE_SERVICE_ROLE_KEY'
] as const;

export type TargetKey = (typeof TARGET_KEYS)[number];
export type EnvValues = Partial<Record<TargetKey, string>>;

/**
 * Strips one matched pair of surrounding quotes, the way dotenv does.
 *
 * `"http://127.0.0.1:54321"` has to read as a loopback URL, not as a string
 * beginning with `"`. Leaving the quotes on classified a correctly quoted
 * `.env.local` as hosted and reported SPLIT TARGET on a healthy local setup.
 */
function unquote(value: string): string {
	const quote = value[0];
	if ((quote === '"' || quote === "'") && value.length > 1 && value.endsWith(quote)) {
		return value.slice(1, -1);
	}
	return value;
}

/**
 * Reads `KEY=value` lines. Still not a full dotenv parser -- no interpolation,
 * no multi-line values -- but it does strip surrounding quotes, because Vite's
 * dotenv strips them too. Keeping them would be the second dialect, not the
 * other way round: the same file would mean one thing to the app and another
 * to the tool that reports on it.
 */
export function parseEnv(text: string): Record<string, string> {
	const out: Record<string, string> = {};
	for (const line of text.split('\n')) {
		const trimmed = line.trim();
		if (trimmed === '' || trimmed.startsWith('#')) continue;
		const eq = trimmed.indexOf('=');
		if (eq === -1) continue;
		out[trimmed.slice(0, eq).trim()] = unquote(trimmed.slice(eq + 1).trim());
	}
	return out;
}

/**
 * Replaces the target keys in place and appends any that were missing.
 *
 * In place rather than rewriting the file, so comments, ordering and any
 * unrelated variable a developer has added all survive a switch. A switcher
 * that flattened the file would be a reason not to use it.
 */
export function applyEnv(text: string, values: EnvValues): string {
	let out = text;
	for (const key of TARGET_KEYS) {
		const value = values[key];
		if (value === undefined) continue;
		const line = `${key}=${value}`;
		const pattern = new RegExp(`^${key}=.*$`, 'm');
		out = pattern.test(out) ? out.replace(pattern, line) : `${out.replace(/\n*$/, '\n')}${line}\n`;
	}
	return out.replace(/\n*$/, '\n');
}

/**
 * Names the target a Supabase URL points at.
 *
 * A loopback host is the local stack; anything else is a real project, named
 * by its ref so two hosted projects are never confused for each other.
 */
export function describeTarget(url: string | undefined): {
	kind: 'local' | 'hosted' | 'unset';
	ref: string | null;
	label: string;
} {
	if (!url) return { kind: 'unset', ref: null, label: 'not set' };
	if (/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?/.test(url)) {
		return { kind: 'local', ref: null, label: `local stack (${url})` };
	}
	const ref = /^https?:\/\/([a-z0-9-]+)\.supabase\./.exec(url)?.[1] ?? null;
	return { kind: 'hosted', ref, label: ref ? `hosted project ${ref} (${url})` : `hosted (${url})` };
}

/** The two credentials that have to name the same place as the URL does. */
const CREDENTIALS = [
	['SVELTE_PUBLIC_SUPABASE_ANON_KEY', 'anon key'],
	['SUPABASE_SERVICE_ROLE_KEY', 'service-role key']
] as const;

/**
 * Names the target a Supabase key belongs to, from its JWT payload.
 *
 * The local stack's keys are the Supabase CLI's fixed demo JWTs, whose payload
 * carries `"iss":"supabase-demo"`. That distinguishes a local key from a hosted
 * one without needing the stack to be running. A hosted key additionally
 * carries `"ref"`, which is how two different hosted projects are told apart.
 */
function describeCredential(key: string): { kind: 'local' | 'hosted'; ref: string | null } {
	try {
		// JWT payloads are base64url; normalise before decoding rather than
		// relying on a lenient decoder.
		const segment = (key.split('.')[1] ?? '').replace(/-/g, '+').replace(/_/g, '/');
		const payload = JSON.parse(Buffer.from(segment, 'base64').toString('utf8'));
		if (payload?.iss === 'supabase-demo') return { kind: 'local', ref: null };
		return { kind: 'hosted', ref: typeof payload?.ref === 'string' ? payload.ref : null };
	} catch {
		// A key shaped like anything else is treated as hosted: the safe
		// assumption, because the consequence of guessing "local" wrongly is a
		// script writing to production while the tool reports agreement.
		return { kind: 'hosted', ref: null };
	}
}

/**
 * Whether the URL, the anon key and the service-role key all name the same
 * database.
 *
 * This is the check the script exists for as much as the switching is. They can
 * disagree -- they did in this repo -- and when they do, the app reads one
 * database while the import and sync scripts write to the other.
 *
 * Two unknowns resolve in opposite directions, deliberately:
 *
 * - **An undecodable key is assumed hosted**, so a local URL beside it reads as
 *   a split. Guessing "local" wrongly reports agreement while a script writes
 *   to production; guessing "hosted" wrongly is loud and harmless.
 * - **A missing project ref is not treated as a disagreement.** A null ref
 *   carries no information -- the newer non-JWT `sb_secret_` keys have none,
 *   and a custom API domain hides the URL's -- so flagging every one would make
 *   the script cry wolf on a correct setup. Refs that ARE known are compared
 *   against every other known ref, the URL's included when it has one.
 */
export function credentialsAgree(values: Record<string, string>): {
	verdict: 'agree' | 'split' | 'unknown';
	reason: string | null;
} {
	const target = describeTarget(values.SVELTE_PUBLIC_SUPABASE_URL);
	if (target.kind === 'unset') {
		return { verdict: 'unknown', reason: 'SVELTE_PUBLIC_SUPABASE_URL is not set' };
	}

	// A split outranks an unknown. Half a file still carries a verdict: an
	// absent anon key must not hide a service-role key naming production,
	// which is the one state this whole script is here to catch.
	const missing = CREDENTIALS.filter(([key]) => !values[key]).map(([key]) => key);
	const unknownReason =
		missing.length > 0
			? `${missing.join(' and ')} ${missing.length === 1 ? 'is' : 'are'} not set`
			: null;

	const place = (kind: 'local' | 'hosted') =>
		kind === 'local' ? 'the local stack' : 'a hosted project';

	// Every ref that is known, compared pairwise. Against the URL's ref where
	// there is one -- and against each other where there is not, because a
	// custom API domain leaves `target.ref` null while the two keys can still
	// name two different projects outright.
	const known: { name: string; ref: string }[] = [];
	if (target.ref) known.push({ name: 'the URL', ref: target.ref });

	for (const [key, label] of CREDENTIALS) {
		if (!values[key]) continue;
		const credential = describeCredential(values[key]);
		if (credential.kind !== target.kind) {
			return {
				verdict: 'split',
				reason: `the ${label} names ${place(credential.kind)}, the URL names ${place(target.kind)}`
			};
		}
		if (!credential.ref) continue;
		const disagrees = known.find((other) => other.ref !== credential.ref);
		if (disagrees) {
			return {
				verdict: 'split',
				reason: `the ${label} belongs to hosted project ${credential.ref}, ${disagrees.name} names ${disagrees.ref}`
			};
		}
		known.push({ name: `the ${label}`, ref: credential.ref });
	}

	if (unknownReason) return { verdict: 'unknown', reason: unknownReason };
	return { verdict: 'agree', reason: null };
}

/** Local values, straight from the running stack. */
function readLocalStack(): EnvValues {
	let raw: string;
	try {
		raw = execFileSync('bunx', ['supabase', 'status', '-o', 'json'], {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore']
		});
	} catch {
		throw new Error(
			'Could not read the local stack. Start it with `supabase start`, then run this again.'
		);
	}

	const status = JSON.parse(raw);
	if (!status.API_URL || !status.ANON_KEY || !status.SERVICE_ROLE_KEY) {
		throw new Error('`supabase status` returned no API_URL/ANON_KEY/SERVICE_ROLE_KEY.');
	}

	return {
		SVELTE_PUBLIC_SUPABASE_URL: status.API_URL,
		SVELTE_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
		SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY
	};
}

/**
 * Hosted secrets, read from Doppler at switch time.
 *
 * Returns null -- rather than throwing -- when Doppler cannot answer for any
 * reason: not installed, not logged in, no network, project or config renamed.
 * The caller falls back to `.env.hosted`, so a Doppler outage degrades to the
 * previous behaviour instead of blocking a switch.
 */
function readDopplerSecrets(): Record<string, string> | null {
	let raw: string;
	try {
		raw = execFileSync(
			'doppler',
			[
				'secrets',
				'download',
				'--no-file',
				'--format',
				'json',
				'--project',
				DOPPLER_PROJECT,
				'--config',
				DOPPLER_CONFIG
			],
			// stderr discarded: Doppler puts auth and network errors there, and
			// they can quote the value that failed.
			{ encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
		);
	} catch {
		return null;
	}

	try {
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : null;
	} catch {
		return null;
	}
}

/**
 * Hosted values: Doppler first, the gitignored profile second.
 *
 * Doppler owns these because they are what a running process reads as
 * environment variables, and because `SUPABASE_DB_URL` is the highest-privilege
 * credential in the set -- the service-role key bypasses RLS through the API,
 * but the connection string is DDL. Keeping it out of a plaintext file in the
 * working tree is the point.
 *
 * `.env.hosted` still works and is still read when Doppler cannot answer or is
 * missing a key, so this is not a cutover: a contributor without Doppler access
 * is not blocked, and neither is a switch made offline. Which source was used is
 * printed, because "it worked" and "it worked from the file you thought you had
 * retired" are different states.
 */
function readHostedProfile(): EnvValues {
	const complete = (values: Record<string, string>) => TARGET_KEYS.filter((k) => !values[k]);

	const doppler = readDopplerSecrets();
	if (doppler) {
		const missing = complete(doppler);
		if (missing.length === 0) {
			console.log(`  hosted values from: Doppler ${DOPPLER_PROJECT}/${DOPPLER_CONFIG}`);
			return Object.fromEntries(TARGET_KEYS.map((k) => [k, doppler[k]])) as EnvValues;
		}
		console.log(
			`  Doppler ${DOPPLER_PROJECT}/${DOPPLER_CONFIG} is missing ${missing.join(', ')} — falling back to ${HOSTED_PROFILE}.`
		);
	}

	if (!existsSync(HOSTED_PROFILE)) {
		throw new Error(
			`No hosted values. Add ${TARGET_KEYS.join(', ')} to Doppler ` +
				`${DOPPLER_PROJECT}/${DOPPLER_CONFIG}, or create ${HOSTED_PROFILE} ` +
				`— it is gitignored by the .env.* rule.`
		);
	}

	const parsed = parseEnv(readFileSync(HOSTED_PROFILE, 'utf8'));
	const missing = complete(parsed);
	if (missing.length > 0) {
		throw new Error(`${HOSTED_PROFILE} is missing ${missing.join(', ')}.`);
	}

	console.log(`  hosted values from: ${HOSTED_PROFILE}`);
	return Object.fromEntries(TARGET_KEYS.map((k) => [k, parsed[k]])) as EnvValues;
}

/**
 * `SVELTE_PUBLIC_*` are `$env/static/public`: inlined at build time, so a
 * running dev server keeps serving the OLD target until it is restarted. A
 * switch that reported success over a stale server would be exactly the kind
 * of quiet lie this script exists to remove, so say so loudly when one is up.
 */
function warnIfDevServerRunning(): void {
	let listening = false;
	try {
		const out = execFileSync('ss', ['-ltn'], {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore']
		});
		listening = /:5173\b/.test(out);
	} catch {
		return; // No `ss`; nothing to claim either way.
	}

	if (!listening) return;

	console.log('');
	console.log('  !! A dev server is running on :5173 and is STILL ON THE OLD TARGET.');
	console.log('     SVELTE_PUBLIC_* are inlined at build time and do not hot-reload.');
	console.log('     Restart it before trusting what the browser shows.');
}

function reportStatus(): void {
	if (!existsSync(ENV_FILE)) {
		console.log(
			`  ${ENV_FILE} does not exist. Run \`bun run env:local\` or \`bun run env:hosted\`.`
		);
		return;
	}

	const values = parseEnv(readFileSync(ENV_FILE, 'utf8'));
	const target = describeTarget(values.SVELTE_PUBLIC_SUPABASE_URL);
	const { verdict, reason } = credentialsAgree(values);

	console.log(`  target: ${target.label}`);

	if (verdict === 'unknown') {
		console.log(`  credentials: ${reason} — nothing to compare.`);
		if (!values.SUPABASE_SERVICE_ROLE_KEY) {
			console.log('  Without SUPABASE_SERVICE_ROLE_KEY, `corpus:import` and `sync-checks`');
			console.log('  will not run.');
		}
	} else if (verdict === 'agree') {
		console.log('  credentials: anon and service-role keys name the same target');
	} else {
		console.log('');
		console.log(`  !! SPLIT TARGET — ${reason}.`);
		console.log('     The app, `corpus:import` and `scripts/sync-checks.ts` do not all');
		console.log('     name the same database, so writes land somewhere the app is not');
		console.log('     reading. Re-run `bun run env:local` or `bun run env:hosted` to fix.');
	}

	if (target.kind === 'hosted') {
		console.log('');
		console.log('  Note: this is the real review database. Edits made from the dev');
		console.log('  browser are written to it, not to a scratch copy.');
	}
}

function switchTo(kind: 'local' | 'hosted'): void {
	const values = kind === 'local' ? readLocalStack() : readHostedProfile();
	const existing = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf8') : '';
	writeFileSync(ENV_FILE, applyEnv(existing, values));

	console.log(`  ${ENV_FILE} now points at:`);
	reportStatus();
	warnIfDevServerRunning();
}

function main(argv: string[]): number {
	const command = argv[0] ?? 'status';

	try {
		if (command === 'status') reportStatus();
		else if (command === 'local' || command === 'hosted') switchTo(command);
		else {
			console.error(`Unknown command \`${command}\`. Use status, local or hosted.`);
			return 2;
		}
	} catch (error) {
		console.error(`  ${error instanceof Error ? error.message : String(error)}`);
		return 1;
	}

	return 0;
}

// Only when run directly, so the pure helpers above stay importable by tests.
if (import.meta.main) {
	process.exit(main(process.argv.slice(2)));
}
