#!/usr/bin/env bash
# audit-tokens.sh — Sprint 54 Phase 54.1 (ADR-029).
#
# Fails if `src/components/` or `src/pages/` contain hardcoded hex
# colours, !important, or other token-bypass smells. To intentionally
# bypass on a specific line (e.g. contrast colour over arbitrary user
# input), add a trailing `audit-ignore` comment on that line.
#
# Test files (`*.test.{ts,tsx}`) are excluded — they often need raw
# fixture values.
set -euo pipefail

cd "$(dirname "$0")/.."

# Build the set of paths to scan.
mapfile -t files < <(
  find src/components src/pages -type f \
    \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' \) \
    ! -name '*.test.ts' ! -name '*.test.tsx'
)

if [[ ${#files[@]} -eq 0 ]]; then
  echo "audit-tokens: no files to scan" >&2
  exit 1
fi

# Patterns: 6- or 3-digit hex literal, or !important.
pattern='#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|!important'

violations=$(grep -nHE "$pattern" "${files[@]}" 2>/dev/null \
  | grep -v 'audit-ignore' \
  || true)

if [[ -n "$violations" ]]; then
  echo "audit-tokens: hardcoded colours / !important found in components or pages." >&2
  echo "Use semantic tokens from src/theme/tokens.ts or var(--color-*) instead." >&2
  echo "If genuinely needed, add a trailing 'audit-ignore' comment with a reason." >&2
  echo >&2
  echo "$violations" >&2
  exit 1
fi

echo "audit-tokens: clean."
