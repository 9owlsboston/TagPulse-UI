#!/usr/bin/env bash
# scripts/ui-cicd-verify.sh <env>
#
# Read-only check that scripts/ui-cicd-setup.sh wiring is complete +
# correct for the named GitHub Environment. Run after ui-cicd-setup.sh,
# or any time you suspect drift (someone deleted a variable, the SWA
# token was rotated out-of-band, etc.).
#
# Exits 0 on success, non-zero with a diagnostic on the first failure.
#
# Mirror of TagPulse/scripts/azd-cicd-verify.sh.

set -euo pipefail

ENV_NAME="${1:-}"
if [[ -z "$ENV_NAME" ]]; then
  echo "Usage: $0 <env>   (dev | staging | production)" >&2
  exit 1
fi

REPO="9owlsboston/TagPulse-UI"

fail() { echo "FAIL: $*" >&2; exit 1; }
ok()   { echo "  OK  $*"; }

command -v gh >/dev/null || fail "gh CLI not found"
gh auth status >/dev/null 2>&1 || fail "gh not authenticated (run 'gh auth login')"

echo "==> Verifying CI/CD wiring for environment '${ENV_NAME}'"

# 1. GitHub Environment exists
gh api "/repos/${REPO}/environments/${ENV_NAME}" >/dev/null 2>&1 \
  || fail "GitHub Environment '${ENV_NAME}' not found"
ok "GitHub Environment exists"

# 2. Variables
EXPECTED_VARS=(AZURE_TENANT_ID AZURE_SUBSCRIPTION_ID AZURE_STATIC_WEB_APPS_NAME VITE_API_BASE_URL)
ACTUAL=$(gh variable list --env "$ENV_NAME" --repo "$REPO" --json name -q '.[].name' | sort)
for v in "${EXPECTED_VARS[@]}"; do
  echo "$ACTUAL" | grep -qx "$v" || fail "GitHub variable '$v' missing on environment '${ENV_NAME}'"
done
ok "All 4 GitHub variables set"

# Confirm VITE_API_BASE_URL looks like an https URL.
API_VAL=$(gh variable list --env "$ENV_NAME" --repo "$REPO" --json name,value \
  -q '.[] | select(.name=="VITE_API_BASE_URL") | .value')
case "$API_VAL" in
  https://*) ok "VITE_API_BASE_URL = $API_VAL" ;;
  *)         fail "VITE_API_BASE_URL is not an https URL: '$API_VAL'" ;;
esac

# 3. Secret
SEC=$(gh secret list --env "$ENV_NAME" --repo "$REPO" --json name -q '.[].name')
echo "$SEC" | grep -qx "AZURE_STATIC_WEB_APPS_API_TOKEN" \
  || fail "Secret 'AZURE_STATIC_WEB_APPS_API_TOKEN' missing on environment '${ENV_NAME}'"
ok "Secret AZURE_STATIC_WEB_APPS_API_TOKEN is present"

echo
echo "==> All checks passed. Ready to deploy:"
echo "    gh workflow run deploy-azure.yml -f environment=${ENV_NAME} --repo $REPO"
