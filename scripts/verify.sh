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
#   SITE_URL=https://deploy-preview-54--hhvc-manager-review.netlify.app \
#   EXPECT_COMMIT=$(git rev-parse HEAD) bun run verify:live

set -uo pipefail
cd "$(dirname "$0")/.."

SITE_URL="${SITE_URL:-https://hhvc-manager-review.netlify.app}"
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
require docker-compose.yml 'RAILWAY_API_TOKEN' \
	'the AI proxy credential, without which every rewrite 401s'
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
leak=$(
	curl -s --max-time 30 "$SITE_URL/" |
		grep -oE '\./_app/immutable/[^"]+\.js' |
		while read -r chunk; do curl -s --max-time 30 "$SITE_URL/${chunk#./}"; done |
		grep -coE 'RAILWAY_API_TOKEN|web-production-9bb3b|arrizon\.david|dev-local-only'
)
[ "$leak" = "0" ] && pass "no server-only values in client bundle" ||
	fail "$leak server-only reference(s) in client bundle"

echo
if [ "$failures" -eq 0 ]; then
	echo "all gates green · $SITE_URL"
else
	echo "$failures failed · $LOG"
fi
exit $((failures > 0))
