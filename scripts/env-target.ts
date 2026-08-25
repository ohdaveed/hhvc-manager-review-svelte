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
 * Hosted credentials live in `.env.hosted`, which is gitignored by the `.env.*`
 * rule. It is a profile, not the live file: nothing reads it but this script.
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

/** The three variables a target owns. Anything else in `.env.local` is left alone. */
export const TARGET_KEYS = [
	'SVELTE_PUBLIC_SUPABASE_URL',
	'SVELTE_PUBLIC_SUPABASE_ANON_KEY',
	'SUPABASE_SERVICE_ROLE_KEY'
] as const;

export type TargetKey = (typeof TARGET_KEYS)[number];
export type EnvValues = Partial<Record<TargetKey, string>>;

/**
 * Reads `KEY=value` lines. Deliberately not a full dotenv parser -- this file
 * is written by this script and by hand, and quoting or interpolation here
 * would be a second dialect to keep in step with Vite's.
 */
export function parseEnv(text: string): Record<string, string> {
	const out: Record<string, string> = {};
	for (const line of text.split('\n')) {
		const trimmed = line.trim();
		if (trimmed === '' || trimmed.startsWith('#')) continue;
		const eq = trimmed.indexOf('=');
		if (eq === -1) continue;
		out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
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
	label: string;
} {
	if (!url) return { kind: 'unset', label: 'not set' };
	if (/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?/.test(url)) {
		return { kind: 'local', label: `local stack (${url})` };
	}
	const ref = /^https?:\/\/([a-z0-9-]+)\.supabase\./.exec(url)?.[1];
	return { kind: 'hosted', label: ref ? `hosted project ${ref} (${url})` : `hosted (${url})` };
}

/**
 * Whether the browser-facing vars and the service-role key point at the same
 * place.
 *
 * This is the check the script exists for as much as the switching is. The two
 * can disagree -- they did in this repo -- and when they do, the app reads one
 * database while the import and sync scripts write to the other.
 */
export function serviceKeyAgrees(values: Record<string, string>): boolean | null {
	const key = values.SUPABASE_SERVICE_ROLE_KEY;
	if (!key) return null;
	const publicKind = describeTarget(values.SVELTE_PUBLIC_SUPABASE_URL).kind;
	if (publicKind === 'unset') return null;

	// The local stack's keys are the Supabase CLI's fixed demo JWTs, whose
	// payload carries `"iss":"supabase-demo"`. Decode both keys: the browser
	// client uses the anon key, so checking only the service key can report a
	// healthy target while authentication is actually pointed elsewhere.
	const anonKey = values.SVELTE_PUBLIC_SUPABASE_ANON_KEY;
	const decodeIssuer = (value: string): string | null => {
		try {
			const payload = JSON.parse(Buffer.from(value.split('.')[1] ?? '', 'base64').toString('utf8'));
			return typeof payload?.iss === 'string' ? payload.iss : null;
		} catch {
			return null;
		}
	};
	const serviceIssuer = decodeIssuer(key);
	if (!serviceIssuer) return false;

	if (anonKey) {
		const anonIssuer = decodeIssuer(anonKey);
		// Opaque keys have no verifiable project identity. Do not claim that
		// they agree merely because the URL and service key happen to match.
		if (!anonIssuer) return null;
		if ((serviceIssuer === 'supabase-demo') !== (anonIssuer === 'supabase-demo')) return false;
		if (serviceIssuer !== anonIssuer && publicKind === 'hosted') return false;
	}

	const isLocalKey = serviceIssuer === 'supabase-demo';
	return publicKind === 'local' ? isLocalKey : !isLocalKey;
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

/** Hosted values, from the gitignored profile. */
function readHostedProfile(): EnvValues {
	if (!existsSync(HOSTED_PROFILE)) {
		throw new Error(
			`No ${HOSTED_PROFILE}. Create it with the hosted project's ` +
				`${TARGET_KEYS.join(', ')} — it is gitignored by the .env.* rule.`
		);
	}

	const parsed = parseEnv(readFileSync(HOSTED_PROFILE, 'utf8'));
	const missing = TARGET_KEYS.filter((k) => !parsed[k]);
	if (missing.length > 0) {
		throw new Error(`${HOSTED_PROFILE} is missing ${missing.join(', ')}.`);
	}

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
	const agrees = serviceKeyAgrees(values);

	console.log(`  target: ${target.label}`);

	if (agrees === null) {
		console.log('  service-role key: not set — `corpus:import` and `sync-checks` will not run.');
	} else if (agrees) {
		console.log('  service-role key: same target');
	} else {
		console.log('');
		console.log('  !! SPLIT TARGET. The app reads one database and the service-role key');
		console.log('     names the other, so `corpus:import` and `scripts/sync-checks.ts`');
		console.log('     would write somewhere the app is not reading. Re-run a switch to fix.');
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
