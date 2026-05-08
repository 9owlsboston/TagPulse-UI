#!/usr/bin/env bash
# scripts/ui-preflight.sh
#
# Phase 0 preflight for the TagPulse UI deploy runbook
# (TagPulse/docs/runbooks/ui-first-deploy.md).
#
# Verifies that the local workstation is ready for `scripts/ui-bootstrap.sh`
# and `npm run build`. Exits non-zero on any blocking failure; warnings
# ("WARN") are informational only.
#
# Mirror of TagPulse/scripts/azd-preflight.sh.

set -u

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0
FAILURES=()

green()  { printf '\033[32m%s\033[0m' "$1"; }
red()    { printf '\033[31m%s\033[0m' "$1"; }
yellow() { printf '\033[33m%s\033[0m' "$1"; }

ok()    { printf '  [%s] %s\n'   "$(green PASS)" "$1"; PASS_COUNT=$((PASS_COUNT+1)); }
fail()  { printf '  [%s] %s\n'   "$(red FAIL)"  "$1"; FAIL_COUNT=$((FAIL_COUNT+1)); FAILURES+=("$1"); }
warn()  { printf '  [%s] %s\n'   "$(yellow WARN)" "$1"; WARN_COUNT=$((WARN_COUNT+1)); }

section() { printf '\n\033[1m== %s ==\033[0m\n' "$1"; }

# Compare semver-ish "MAJOR.MINOR" >= "MIN_MAJOR.MIN_MINOR"
ge_version() {
  local have="$1" need="$2"
  local hM=${have%%.*} hRest=${have#*.} hm
  hm=${hRest%%.*}
  local nM=${need%%.*} nRest=${need#*.} nm
  nm=${nRest%%.*}
  hM=${hM:-0}; hm=${hm:-0}; nM=${nM:-0}; nm=${nm:-0}
  if (( hM > nM )); then return 0; fi
  if (( hM < nM )); then return 1; fi
  (( hm >= nm ))
}

# ---------- Tooling ----------
section "Tooling"

check_node() {
  if ! command -v node >/dev/null 2>&1; then
    fail "node not found in PATH (need >= 20)"
    return
  fi
  local v
  v=$(node -v 2>/dev/null | sed 's/^v//')
  if ge_version "$v" "20.0"; then
    ok "node $v (need >= 20)"
  else
    fail "node $v too old (need >= 20). Fix: nvm install 20 && nvm use 20"
  fi
}

check_npm() {
  if ! command -v npm >/dev/null 2>&1; then
    fail "npm not found in PATH (need >= 10)"
    return
  fi
  local v
  v=$(npm -v 2>/dev/null)
  if ge_version "$v" "10.0"; then
    ok "npm $v (need >= 10)"
  else
    fail "npm $v too old (need >= 10). Fix: npm install -g npm@latest"
  fi
}

check_node
check_npm

if command -v gh >/dev/null 2>&1; then
  ok "gh $(gh --version 2>/dev/null | awk 'NR==1 {print $3}') present"
else
  fail "gh not found (install: https://cli.github.com/)"
fi

if command -v az >/dev/null 2>&1; then
  ok "az $(az version --output tsv --query '"azure-cli"' 2>/dev/null) present"
else
  fail "az not found (install: https://aka.ms/install-azure-cli)"
fi

# ---------- gh auth ----------
section "GitHub auth"
if command -v gh >/dev/null 2>&1; then
  if gh auth status >/dev/null 2>&1; then
    GH_USER=$(gh api user --jq .login 2>/dev/null || echo "?")
    ok "gh signed in as $GH_USER"
    # Confirm membership/access to 9owlsboston org (best-effort).
    if gh api orgs/9owlsboston/members/"$GH_USER" >/dev/null 2>&1; then
      ok "gh user is a member of 9owlsboston"
    else
      warn "gh user '$GH_USER' is not visible as a 9owlsboston org member (could be private membership)"
    fi
  else
    fail "gh not authenticated (run 'gh auth login')"
  fi
else
  warn "skipping gh auth check"
fi

# ---------- az auth ----------
section "Azure auth"
if command -v az >/dev/null 2>&1; then
  if az account show >/dev/null 2>&1; then
    SUB_NAME=$(az account show --query name -o tsv)
    SUB_ID=$(az account show --query id -o tsv)
    TENANT=$(az account show --query tenantId -o tsv)
    ok "logged in to subscription '$SUB_NAME' ($SUB_ID)"
    ok "tenant: $TENANT"

    # Cross-check against .env.<env> if the caller set one.
    REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
    ENV_HINT="${TAGPULSE_UI_ENV:-}"
    if [[ -z "$ENV_HINT" ]]; then
      # Look for any .env.<env> file (excluding .env.example).
      for cand in "$REPO_ROOT"/.env.*; do
        [[ -f "$cand" && "$cand" != *.example ]] || continue
        ENV_HINT="${cand##*/.env.}"
        break
      done
    fi
    if [[ -n "$ENV_HINT" && -f "$REPO_ROOT/.env.$ENV_HINT" ]]; then
      EXPECTED_TENANT=$(awk -F= '$1=="AZURE_TENANT_ID" {gsub(/"/,"",$2); print $2; exit}' "$REPO_ROOT/.env.$ENV_HINT")
      if [[ -n "$EXPECTED_TENANT" && "$EXPECTED_TENANT" != "$TENANT" ]]; then
        fail "az tenant ($TENANT) doesn't match .env.$ENV_HINT tenant ($EXPECTED_TENANT). Run 'az login --tenant $EXPECTED_TENANT'."
      else
        ok "az tenant matches .env.$ENV_HINT"
      fi
    else
      warn "no .env.<env> found; skipping tenant cross-check (run scripts/ui-bootstrap.sh <env>)"
    fi
  else
    fail "not logged in (run 'az login')"
  fi
else
  warn "skipping az auth check"
fi

# ---------- Workspace ----------
section "Workspace"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
for f in package.json vite.config.ts staticwebapp.config.json .env.example \
         scripts/ui-bootstrap.sh scripts/ui-env-load.sh \
         scripts/ui-cicd-setup.sh scripts/ui-cicd-verify.sh; do
  if [[ -e "$REPO_ROOT/$f" ]]; then
    ok "$f present"
  else
    fail "$f missing"
  fi
done

# ---------- Summary ----------
section "Summary"
printf '  %s passed, %s failed, %s warnings\n\n' \
  "$(green "$PASS_COUNT")" \
  "$( ((FAIL_COUNT==0)) && green 0 || red "$FAIL_COUNT" )" \
  "$( ((WARN_COUNT==0)) && green 0 || yellow "$WARN_COUNT" )"

if (( FAIL_COUNT > 0 )); then
  echo "Blocking failures:"
  for msg in "${FAILURES[@]}"; do
    echo "  - $msg"
  done
  echo
  echo "See TagPulse/docs/runbooks/ui-first-deploy.md § Phase 0 for fix steps."
  exit 1
fi

echo "Phase 0 checks passed. Next: scripts/ui-bootstrap.sh <env>"
exit 0
