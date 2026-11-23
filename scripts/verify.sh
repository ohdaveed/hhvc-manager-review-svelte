#!/usr/bin/env bash
#
# One command, one screen of output. Runs the gates that matter and prints a
# pass/fail line each; full output goes to a log that is only worth opening
# when something fails.
#
#   bun run verify        local gates only (tests, build)
#   bun run verify:live   also probes the deployed site
#
# Override the target with SITE_URL=... for a branch or preview deploy. When you
# do, set EXPECT_COMMIT=... to match, or the published-commit gate will compare
# that deploy against origin/main and correctly report a mismatch:
#
#   SITE_URL=https://deploy-preview-54--sfhealthyhousing.netlify.app \
#   EXPECT_COMMIT=$(git rev-parse HEAD) bun run verify:live

set -uo pipefail
cd "$(dirname "$0")/.."

SITE_URL="${SITE_URL:-https://sfhealthyhousing.netlify.app}"
LOG="${TMPDIR:-/tmp}/hhvc-verify.log"
: >"$LOG"

failures=0

pass() { printf '  \033[32mPASS\033[0m  %s\n' "$1"; }
fail() {
	printf '  \033[31mFAIL\033[0m  %s\n' "$1"
	failures=$((failures + 1))
}

# Runs a command quietly. On failure the log keeps the detail.
#
# The status has to be captured before the trailing blank-line echo, or the
# brace group returns that echo's status instead — always 0, which made every
# gate below report PASS unconditionally. The group is not a subshell, so the
# assignment survives it.
quiet() {
	local label="$1"
	shift
	local rc
	{
		echo "=== $label ==="
		"$@" 2>&1
		rc=$?
		echo
	} >>"$LOG"
	return $rc
}

echo "local"

if quiet 'unit tests' bun run test:unit -- --run; then
	count=$(grep -oE 'Tests +[0-9]+ passed' "$LOG" | tail -1 | grep -oE '[0-9]+')
	pass "unit tests (${count:-?} passed)"
else
	fail "unit tests — see $LOG"
fi

if quiet 'build' bun run build; then
	pass "production build"
else
	fail "production build — see $LOG"
fi

# Everything that should never leave the server, searched across the WHOLE
# published bundle -- every file under netlify.toml's `publish` dir, whether or
# not the module graph reaches it. Complete by construction: the build just
# ran, so these files are what Netlify will serve.
#
# The live gate crawls the served module graph, which is complete in a
# different direction: it covers what a browser can load, from the deploy
# rather than from disk. Neither subsumes the other -- keep both.
#
# `sb_secret_` must be followed by key-shaped characters: supabase-js carries
# the bare prefix in its own `e.startsWith('sb_secret_')` format check, so the
# prefix alone matches the library on every build. Measured: bare prefix hits 1
# file, the key-shaped form hits 0 and still catches a real key.
# `/api/invite` reads SUPABASE_SERVICE_ROLE_KEY from `$env/dynamic/private`,
# which is never inlined, and SvelteKit refuses at build time to import private
# env into client code -- that refusal is the real control. This backstops the
# two ways around it: renaming the key to a `SVELTE_PUBLIC_*` variable, or
# hardcoding the value.
#
# `-l` not `-o`: on failure this prints FILE NAMES, never the matching line,
# so a leaked secret is never written to the terminal or to $LOG.
#
# SOURCEMAPS ARE SCANNED, and that is load-bearing. An earlier version excluded
# `*.map` on the belief they were not served; the probe behind that belief used
# a chunk hash that did not exist on production, so it 404'd for the wrong
# reason. Measured properly, `app.<hash>.js.map` returns 200 -- netlify.toml
# publishes `build/` wholesale. A map is the WORST file to skip: code behind
# `import.meta.env.DEV` is tree-shaken out of the `.js` and survives verbatim in
# `sourcesContent`, which is exactly the shape a hardcoded key would take.
LEAK_PATTERN='GEMINI_API_KEY|AIza[0-9A-Za-z_-]{35}|RAILWAY_API_TOKEN|web-production-9bb3b|arrizon\.david|demo@hhvc\.local|dev-local-only|sb_secret_[A-Za-z0-9_-]{20,}'

if [ ! -d build ]; then
	# Without this the greps below return nothing and the gate prints PASS over
	# a directory it never read -- a security line reading green on no evidence.
	fail 'no build output to scan for server-only values'
else
	leaked=$(grep -rlE "$LEAK_PATTERN" build/ 2>/dev/null || true)

	# The literal key, when this shell has it. A legacy service-role key is a JWT
	# with no greppable marker, so the value itself is the only check that finds
	# one. `-f -` keeps it out of argv, and `-F` needs no escaping. Trailing
	# whitespace is stripped: a value ending in a newline would reach grep as two
	# patterns, the second empty, and an empty pattern matches every file.
	key_trimmed=$(printf '%s' "${SUPABASE_SERVICE_ROLE_KEY:-}" | tr -d '[:space:]')
	if [ -n "$key_trimmed" ]; then
		literal=$(printf '%s\n' "$key_trimmed" | grep -rlF -f - build/ 2>/dev/null || true)
		leaked=$(printf '%s\n%s' "$leaked" "$literal" | grep -v '^$' | sort -u || true)
	fi

	if [ -z "$leaked" ]; then
		pass 'no server-only values in the published bundle'
	else
		fail "server-only value(s) in the published bundle: $(printf '%s' "$leaked" | tr '\n' ' ')"
	fi
fi

# Invariants in config files -- the gap every other gate leaves open.
#
# Nothing imports a Dockerfile and no test renders docker-compose.yml, so the
# suite passes whatever those files happen to say. PR #86 arrived carrying
# pre-fix copies of both: merging it would have reverted #83's build-arg fix and
# dropped the Railway credential from Compose, with unit tests, e2e and the
# Netlify preview all green. It was caught by reading the diff, and reading is
# not a control. These are the claims that were nearly lost.
config_broken=''
require() { # <file> <literal string> <what it protects>
	grep -qF -- "$2" "$1" 2>/dev/null || config_broken="$config_broken
      missing in $1: $3"
}
forbid() { # <file> <literal string> <why it must not come back>
	! grep -qF -- "$2" "$1" 2>/dev/null || config_broken="$config_broken
      present in $1: $3"
}

require Dockerfile 'ARG SVELTE_PUBLIC_SUPABASE_URL' \
	'public Supabase URL as a build arg -- $env/static/public is inlined at build time, so runtime env never reaches it'
require Dockerfile 'ARG SVELTE_PUBLIC_SUPABASE_ANON_KEY' \
	'public anon key as a build arg, same reason'
require docker-compose.yml 'args:' \
	'the public pair passed as build args'
forbid docker-compose.yml '- SVELTE_PUBLIC_SUPABASE_URL=' \
	'the public pair back under environment:, where Compose sets it and the bundle ignores it'
require docker-compose.yml 'GEMINI_API_KEY' \
	'the Gemini key, without which every AI request answers 501'
require vite.config.ts ': adapterNetlify' \
	'netlify as the default adapter, so CI builds the one production ships'

if [ -z "$config_broken" ]; then
	pass 'config invariants'
else
	fail "config invariants$config_broken"
fi

if [ "${1:-}" != "--live" ]; then
	echo
	[ "$failures" -eq 0 ] && echo "all local gates green" || echo "$failures failed · $LOG"
	exit $((failures > 0))
fi

echo
echo "live · $SITE_URL"

code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$SITE_URL/")
[ "$code" = "200" ] && pass "GET / -> 200" || fail "GET / -> $code (want 200)"

# Which commit the site is actually SERVING.
#
# This gate exists because every other probe here survived a three-merge
# production freeze without flinching. A deploy locked to an older commit still
# answers 200, still refuses the proxy with 401, and still carries no leaked
# secrets -- so the script reported "all gates green" while `main` and
# production had diverged by three PRs. Status codes describe a site; only the
# commit describes WHICH site.
#
# Read from `/_app/version.json`, which vite.config.ts stamps with the build's
# commit, rather than from Netlify's API: the API needs auth, and its
# deploy-level `state: ready` is the very field that was misleading.
if [ -n "${EXPECT_COMMIT:-}" ]; then
	expected="$EXPECT_COMMIT"
else
	# Ask the REMOTE, not the local tracking ref. `git rev-parse origin/main`
	# returns whatever the last fetch left behind, so a clone that is itself
	# behind can match a stale published deploy and report PASS — reproducing
	# the false green this gate exists to remove. `ls-remote` reads the remote
	# without mutating any local ref.
	expected=$(git ls-remote origin refs/heads/main 2>/dev/null | cut -f1)
fi

served=$(curl -s --max-time 30 "$SITE_URL/_app/version.json" |
	sed -n 's/.*"version":"\([^"]*\)".*/\1/p')

if [ -z "$expected" ]; then
	fail "published commit — could not reach origin to resolve main; set EXPECT_COMMIT=<sha>"
elif [ -z "$served" ]; then
	fail "published commit — $SITE_URL/_app/version.json served no version"
elif [ "$served" = "$expected" ]; then
	pass "published commit is ${served:0:7}"
else
	fail "published commit is ${served:0:7}, expected ${expected:0:7} — the deploy is not what main says"
fi

# The AI proxy must refuse unauthenticated callers: it spends real money.
for label in 'no auth header' 'bad bearer token'; do
	if [ "$label" = 'no auth header' ]; then
		auth=()
	else
		auth=(-H 'Authorization: Bearer not-a-real-token')
	fi
	code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 -X POST \
		-H 'Content-Type: application/json' "${auth[@]}" \
		-d '{"task":"rewrite-field","fieldText":"probe"}' "$SITE_URL/api/ai/generate")
	[ "$code" = "401" ] && pass "proxy rejects $label -> 401" || fail "proxy $label -> $code (want 401)"
done

# Walk the deployed bundle for anything that should never leave the server.
#
# COMPLETE, and measurably so: this follows the served module graph
# transitively from the chunks the root HTML names, so it reads every JS file
# the browser can load rather than the two entry chunks the HTML happens to
# list.
#
# The crawl this replaces read only those two, and its note claimed that
# following their imports "adds nothing". That was an artifact of the regex
# used to look: `\./_app/immutable/[^"]+\.js` cannot match `../chunks/X.js`,
# which is how the entry and node files name the chunks they import. (Chunks
# name their own siblings `./X.js`, which it misses too.) Measured
# against production: the old crawl reached 2 of the 27 emitted files and never
# saw the Supabase project ref, which is certainly in the served JS. This one
# reaches all of them, and does.
#
# Accepting all three quote characters is load-bearing rather than defensive.
# Static imports are double-quoted, but the Sentry release chunk is reached
# only through a backtick-quoted dynamic `import(...)`. Measured against the
# build on disk, where `find` gives the ground truth: the two quoted forms
# together reach 26 of the 27 emitted files, and adding the backtick form
# reaches 27 of 27.
#
# Three properties worth keeping if this is ever changed:
#
#   - A non-200 is a FAILURE, not a skipped file. Netlify answers an unknown
#     path with an HTML 404 page, which scans clean -- so treating a miss as
#     "nothing found here" is exactly how a crawl shrinks back towards
#     vacuity without saying so.
#   - The reach is printed on every run, and a crawl that reaches 2 files or
#     fewer fails outright. The original defect was not that the gate was
#     wrong; it was that the gate was silent about how little it covered.
#   - `-l` not `-o`, as in the local gate: on failure this prints served
#     PATHS, never the matching line.
#
# This still does not subsume the local scan. It covers what a browser can
# load; the local gate covers every file under `publish`, including any the
# module graph does not reach.
work=$(mktemp -d "${TMPDIR:-/tmp}/hhvc-served.XXXXXX")
trap 'rm -rf "$work"' EXIT
# `site_dir`, not `served`: the published-commit gate above holds the deployed
# SHA in `served`, and a second meaning for that name is how the next gate
# added here ends up with a directory where it expects a commit.
site_dir="$work/site"
queue="$work/queue"
seen="$work/seen"
mkdir -p "$site_dir"
: >"$queue"
: >"$seen"

# The three quote characters, built with printf so no literal backtick appears
# in this script -- inside double quotes one would open a command substitution.
quotes=$(printf '"\047\140')

curl -s --max-time 30 "$SITE_URL/" -o "$site_dir/index.html"
grep -oE '_app/immutable/[A-Za-z0-9._/-]+\.js' "$site_dir/index.html" 2>/dev/null |
	sort -u >>"$queue"

unreachable=''
while :; do
	next=$(grep -vxF -f "$seen" "$queue" 2>/dev/null | head -1)
	[ -z "$next" ] && break
	printf '%s\n' "$next" >>"$seen"

	# A runaway crawl is a bug, not a thorough one. 500 is ~18x the bundle.
	[ "$(wc -l <"$seen")" -gt 500 ] && {
		unreachable="$unreachable crawl-exceeded-500-files"
		break
	}

	mkdir -p "$site_dir/$(dirname "$next")"
	code=$(curl -s --max-time 30 -w '%{http_code}' "$SITE_URL/$next" -o "$site_dir/$next")
	[ "$code" = '200' ] || unreachable="$unreachable $next($code)"

	dir=$(dirname "$next")
	grep -ohE "[$quotes][^$quotes]*\.js[$quotes]" "$site_dir/$next" 2>/dev/null |
		tr -d "$quotes" |
		while read -r spec; do
			case "$spec" in
			./* | ../*) printf '%s\n' "$dir/$spec" ;;
			/*) printf '%s\n' "${spec#/}" ;;
			*) ;;
			esac
		done |
		sed -E ':a;s|[^/]+/\.\./||;ta;s|/\./|/|g' >>"$queue"
done

chunks=$(sort -u "$seen" | wc -l)
leaked=$(grep -rlE "$LEAK_PATTERN" "$site_dir" 2>/dev/null || true)
if [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
	literal=$(printf '%s\n' "$SUPABASE_SERVICE_ROLE_KEY" |
		grep -rlF -f - "$site_dir" 2>/dev/null || true)
	leaked=$(printf '%s\n%s' "$leaked" "$literal" | grep -v '^$' | sort -u || true)
fi

if [ -n "$unreachable" ]; then
	fail "served bundle — not fetchable:$unreachable"
elif [ "$chunks" -le 2 ]; then
	fail "served bundle — crawl reached $chunks chunk(s); it is finding no imports"
elif [ -n "$leaked" ]; then
	fail "server-only value(s) in served bundle: $(printf '%s' "$leaked" |
		sed "s|^$site_dir/||" | tr '\n' ' ')"
else
	pass "no server-only values across $chunks served chunks"
fi

echo
if [ "$failures" -eq 0 ]; then
	echo "all gates green · $SITE_URL"
else
	echo "$failures failed · $LOG"
fi
exit $((failures > 0))
