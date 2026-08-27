/**
 * Which functions in `public` can an anon or authenticated caller EXECUTE?
 *
 *   bun run audit:privileges              # SUPABASE_DB_URL
 *   bun run audit:privileges --local      # the local stack
 *
 * PLAN.md G2. `20260823130000` documents why revoking PUBLIC was not enough on
 * hosted Supabase: the project's ALTER DEFAULT PRIVILEGES grants EXECUTE to
 * `anon` and `authenticated` **by name**, so every new function arrives
 * anon-executable and needs three REVOKE lines written by hand. A missed one is
 * silent and reachable at /rest/v1/rpc/<name> by anyone holding the anon key.
 *
 * This is detection rather than prevention, on purpose. Prevention was
 * considered twice and rejected: a `DO` block in a migration runs exactly once,
 * so it cannot see the function added two migrations later, and a schema-wide
 * default revoke would 403 the first RPC someone genuinely wants callable, at a
 * distance, with no hint as to the cause.
 *
 * It needs a direct Postgres connection because `pg_proc.proacl` is not
 * reachable through PostgREST. The connection string is read from the
 * environment and never printed.
 */
import { Client } from 'pg';

export type FunctionGrant = {
	name: string;
	anon: boolean;
	authenticated: boolean;
	security_definer: boolean;
	search_path: string | null;
};

/**
 * Functions that are *meant* to be callable through PostgREST by a signed-in
 * or anonymous caller. Empty today, and that is the correct state: the only
 * function in `public` is `import_corpus_version`, whose sole caller
 * (scripts/corpus-import.ts) authenticates as service_role.
 *
 * Adding a name here is a deliberate act. It should come with the reason.
 */
export const ALLOWLIST: readonly string[] = [];

export type Violation = { name: string; reason: string };

/** Pure, so the rules are testable without a database. */
export function classify(rows: FunctionGrant[], allowlist: readonly string[]): Violation[] {
	const violations: Violation[] = [];
	for (const fn of rows) {
		const roles = [fn.anon && 'anon', fn.authenticated && 'authenticated'].filter(
			Boolean
		) as string[];
		if (roles.length > 0 && !allowlist.includes(fn.name)) {
			violations.push({ name: fn.name, reason: `EXECUTE granted to: ${roles.join(', ')}` });
		}
		// A definer function without a pinned search_path resolves its own body
		// through the caller's path while running as its owner -- the shape
		// 20260827100100 removed from import_corpus_version.
		if (fn.security_definer && fn.search_path === null) {
			violations.push({ name: fn.name, reason: 'SECURITY DEFINER with no SET search_path' });
		}
	}
	return violations;
}

const QUERY = `
	SELECT p.proname AS name,
	       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon,
	       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated,
	       p.prosecdef AS security_definer,
	       (SELECT c FROM unnest(coalesce(p.proconfig, '{}')) c
	         WHERE c LIKE 'search_path=%') AS search_path
	FROM pg_proc p
	JOIN pg_namespace n ON n.oid = p.pronamespace
	WHERE n.nspname = 'public'
	ORDER BY p.proname;
`;

const LOCAL_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function main() {
	const local = process.argv.includes('--local');
	const connectionString = local ? LOCAL_URL : process.env.SUPABASE_DB_URL;

	if (!connectionString) {
		console.error('Missing SUPABASE_DB_URL. Use --local to audit the local stack instead.');
		process.exit(1);
	}

	// Name the target by host, never by connection string -- the string carries
	// the database password.
	const host = new URL(connectionString).hostname;
	const client = new Client({
		connectionString,
		ssl: local ? false : { rejectUnauthorized: true }
	});

	await client.connect();
	const { rows } = await client.query<FunctionGrant>(QUERY);
	await client.end();

	const violations = classify(rows, ALLOWLIST);

	console.log(`  target    ${host}`);
	console.log(`  functions ${rows.length} in schema public`);

	if (violations.length === 0) {
		console.log('  PASS      no function in public is anon- or authenticated-executable');
		return;
	}

	for (const v of violations) {
		console.log(`  FAIL      public.${v.name}`);
		console.log(`            ${v.reason}`);
	}
	console.log(
		`\n${violations.length} finding(s). An EXECUTE grant here is reachable at /rest/v1/rpc/<name>.`
	);
	process.exit(1);
}

// Only run when invoked directly, so the pure helpers above stay importable.
if (import.meta.main) {
	await main();
}
