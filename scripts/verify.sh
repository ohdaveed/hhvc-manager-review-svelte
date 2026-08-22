#!/usr/bin/env bash
#
# One command, one screen of output. Runs the gates that matter and prints a
# pass/fail line each; full output goes to a log that is only worth opening
# when something fails.
#
#   bun run verify        local gates only (tests, build)
#   bun run verify:live   also probes the deployed site
#
# Override the target with SITE_URL=... for a branch or preview deploy.

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
quiet() {
	local label="$1"
	shift
	{
		echo "=== $label ==="
		"$@" 2>&1
		echo
	} >>"$LOG"
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

if [ "${1:-}" != "--live" ]; then
	echo
	[ "$failures" -eq 0 ] && echo "all local gates green" || echo "$failures failed · $LOG"
	exit $((failures > 0))
fi

echo
echo "live · $SITE_URL"

code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$SITE_URL/")
[ "$code" = "200" ] && pass "GET / -> 200" || fail "GET / -> $code (want 200)"

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
		grep -coE 'RAILWAY_API_TOKEN|web-production-9bb3b'
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
