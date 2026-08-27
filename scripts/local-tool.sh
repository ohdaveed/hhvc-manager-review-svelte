#!/usr/bin/env bash
#
# Runs a pinned developer binary, fetching it on first use.
#
# typos is a compiled binary, not an npm package, so `bun install` cannot
# supply it. The options were: a third-party npm wrapper (the
# actionlint one is published by an unaffiliated account -- see the note in
# pr.yml), or this. Fetching a version-pinned release and checking its SHA-256
# against a digest recorded here means the bytes that run are the bytes that
# were reviewed, and a compromised release cannot silently substitute itself.
#
# The cache lives in .tooling/ and is gitignored. First run downloads; every
# run after is a no-op.
#
# Usage: bash scripts/local-tool.sh <typos> [args...]

set -euo pipefail

TOOL="${1:?usage: local-tool.sh <typos> [args...]}"
shift

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CACHE="${ROOT}/.tooling"

case "$TOOL" in
typos)
	VERSION=1.49.0
	URL="https://github.com/crate-ci/typos/releases/download/v${VERSION}/typos-v${VERSION}-x86_64-unknown-linux-musl.tar.gz"
	SHA256=48bd2d58e02ce713b8c0f1aa239e68ee4f7d8c551013135806e6aed3938d9e10
	;;
*)
	echo "local-tool.sh: unknown tool '${TOOL}'" >&2
	exit 2
	;;
esac

BIN="${CACHE}/${TOOL}-${VERSION}"

if [[ ! -x "$BIN" ]]; then
	# Only linux x64 digests are pinned, which is what this project targets
	# (WSL2) and what CI runs. Fail loudly rather than skipping: a check that
	# quietly does nothing is worse than no check, because it is trusted.
	if [[ "$(uname -s)" != "Linux" || "$(uname -m)" != "x86_64" ]]; then
		echo "local-tool.sh: no pinned ${TOOL} build for $(uname -s)/$(uname -m)." >&2
		echo "Install ${TOOL} yourself and add a pin here." >&2
		exit 1
	fi

	mkdir -p "$CACHE"
	tmp="$(mktemp -d)"
	trap 'rm -rf "$tmp"' EXIT

	echo "local-tool.sh: fetching ${TOOL} ${VERSION}…" >&2
	curl -sSfL -o "${tmp}/archive.tar.gz" "$URL"

	echo "${SHA256}  ${tmp}/archive.tar.gz" | sha256sum -c - >/dev/null

	# Extract everything and find the binary rather than naming a member: typos
	# ships `./typos` alongside doc/ and LICENSE, and a member name has to match
	# the archive's layout exactly. Finding it keeps this generic, so a second
	# pinned tool can be added without minding its layout.
	tar xzf "${tmp}/archive.tar.gz" -C "$tmp"

	found="$(find "$tmp" -type f -name "$TOOL" -perm -u+x -print -quit)"
	if [[ -z "$found" ]]; then
		echo "local-tool.sh: no '${TOOL}' binary inside ${URL}" >&2
		exit 1
	fi

	install -m 0755 "$found" "$BIN"
fi

exec "$BIN" "$@"
