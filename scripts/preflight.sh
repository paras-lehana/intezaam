#!/usr/bin/env bash
# Pre-publish checks for the public repository. Fails on anything that must never ship:
# secrets, private notes, build artefacts, banned code patterns, or a repository over 10 MB.
#
# Usage: scripts/preflight.sh
set -euo pipefail
cd "$(dirname "$0")/.."

fail() { echo "PREFLIGHT FAILED: $1" >&2; exit 1; }

echo "--> tracked files that must never be published"
if git ls-files | grep -E '(^|/)\.env$|(^|/)\.env\.[^e]|^docs/|node_modules/|/dist/|coverage/' ; then
  fail "private or generated files are tracked"
fi

echo "--> secret patterns in tracked files"
if git grep -nE 'AIza[0-9A-Za-z_-]{35}|-----BEGIN [A-Z ]*PRIVATE KEY-----|ghp_[0-9A-Za-z]{36}' -- . ; then
  fail "a secret-looking value is tracked"
fi

echo "--> banned code patterns in sources"
SRC=(packages/core/src apps/server/src apps/web/src e2e)
if git grep -nE 'console\.(log|debug|info)|eslint-disable|@ts-ignore|@ts-expect-error|TODO|FIXME|: any\b|as any\b' -- "${SRC[@]}" ; then
  fail "banned pattern found"
fi

echo "--> type casts other than 'as const' (ESLint enforces this on the syntax tree; this is a second look)"
# Comments and quoted test names say things like "typed as Hindi", so only code lines are checked.
if git grep -nP '\bas (?!const\b)[A-Z{\[(][A-Za-z]' -- "${SRC[@]}" \
  | grep -vE '^[^:]+:[0-9]+:[[:space:]]*(\*|//|/\*)' \
  | grep -vE "(it|describe|test)\(['\"]" \
  | grep -vE '^[^:]+:[0-9]+:[[:space:]]*import |\* as ' ; then
  fail "a type cast was found"
fi

echo "--> mis-encoded text (UTF-8 bytes decoded as Windows-1252, e.g. an em dash shown as three characters)"
if LC_ALL=C.UTF-8 git grep -nP '\x{00C3}[\x{0080}-\x{00BF}]|\x{00E2}\x{20AC}|\x{00C2}[\x{00A0}-\x{00BF}]' -- "${SRC[@]}" '*.md' ; then
  fail "mojibake found; re-save the file as UTF-8"
fi

echo "--> control characters in sources (a mangled escape, e.g. a backspace where \\b was meant)"
if git grep -nP '[\x00-\x08\x0B\x0C\x0E-\x1F]' -- "${SRC[@]}" ; then
  fail "a control character was found; rewrite the escape sequence"
fi

echo "--> commit trailers (credit only the tools actually used)"
if git log --format=%B 2>/dev/null | grep -qi 'co-authored-by' ; then
  fail "a co-author trailer is present in the history"
fi

echo "--> repository size"
SIZE_KB=$(git count-objects -v | awk '/size-pack/ {print $2}')
LOOSE_KB=$(git count-objects -v | awk '/^size:/ {print $2}')
TOTAL_KB=$((SIZE_KB + LOOSE_KB))
echo "    ${TOTAL_KB} KB"
[ "${TOTAL_KB}" -lt 10240 ] || fail "repository is ${TOTAL_KB} KB (limit 10 MB)"

echo "==> preflight passed"
