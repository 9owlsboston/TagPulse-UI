#!/usr/bin/env bash
# scripts/ui-cicd-setup.sh <env> [--rotate]
#
# Wire the GitHub Environment that .github/workflows/deploy-azure.yml
# uses to deploy this SPA to the matching Azure Static Web App.
#
# - Creates the GitHub Environment if missing (dev | staging | production)
# - Sets 4 environment VARIABLES (non-secret):
#     AZURE_TENANT_ID
#     AZURE_SUBSCRIPTION_ID
#     AZURE_STATIC_WEB_APPS_NAME
#     VITE_API_BASE_URL
# - Uploads 1 environment SECRET:
#     AZURE_STATIC_WEB_APPS_API_TOKEN  (the SWA deploy token)
#
# Idempotent. With --rotate, regenerates the SWA token via
# `az staticwebapp secrets reset-api-key` and re-uploads it.
#
# Mirror of TagPulse/scripts/azd-cicd-setup.sh (without OIDC: SWA only
# accepts a deployment token from the action, not a federated identity).

set -euo pipefail

ENV_NAME=""
ROTATE=0
for arg in "$@"; do
  case "$arg" in
    --rotate) ROTATE=1 ;;
    -h|--help)
      sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    -*) echo "unknown flag: $arg" >&2; exit 2 ;;
    *) ENV_NAME="$arg" ;;
  esac
done

if [[ -z "$ENV_NAME" ]]; then
  echo "Usage: $0 <env> [--rotate]   # dev | staging | production" >&2
  exit 1
fi

REPO="9owlsboston/TagPulse-UI"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env.${ENV_NAME}"

if [[ ! -f "$ENV_FILE" ]]; then
  cat >&2 <<EOF
error: $ENV_FILE not found.

Generate it first:
    scripts/ui-bootstrap.sh $ENV_NAME
EOF
  exit 1
fi

command -v az >/dev/null || { echo "az CLI not found" >&2; exit 1; }
command -v gh >/dev/null || { echo "gh CLI not found" >&2; exit 1; }
az account show >/dev/null 2>&1 || { echo "Run 'az login' first" >&2; exit 1; }
gh auth status >/dev/null 2>&1   || { echo "Run 'gh auth login' first" >&2; exit 1; }

extract() {
  awk -F= -v k="$1" '$1==k {gsub(/"/,"",$2); print $2; exit}' "$ENV_FILE"
}

TENANT=$(extract AZURE_TENANT_ID)
SUB=$(extract AZURE_SUBSCRIPTION_ID)
SWA_NAME=$(extract AZURE_STATIC_WEB_APPS_NAME)
API_BASE=$(extract VITE_API_BASE_URL)
TOKEN=$(extract AZURE_STATIC_WEB_APPS_API_TOKEN)

missing=()
[[ -z "$TENANT"   ]] && missing+=(AZURE_TENANT_ID)
[[ -z "$SUB"      ]] && missing+=(AZURE_SUBSCRIPTION_ID)
[[ -z "$SWA_NAME" ]] && missing+=(AZURE_STATIC_WEB_APPS_NAME)
[[ -z "$API_BASE" ]] && missing+=(VITE_API_BASE_URL)
if (( ${#missing[@]} > 0 )); then
  echo "error: $ENV_FILE missing required keys: ${missing[*]}" >&2
  exit 1
fi

echo "==> Configuring CI/CD for environment '${ENV_NAME}'"
echo "    Repo:  $REPO"
echo "    SWA:   $SWA_NAME"
echo "    API:   $API_BASE"
echo

# --- 1. Optional rotate ----------------------------------------------------
if (( ROTATE )); then
  echo "==> [rotate] Resolving SWA resource group"
  RG=$(az staticwebapp list --query "[?name=='$SWA_NAME'].resourceGroup | [0]" -o tsv)
  if [[ -z "$RG" ]]; then
    echo "error: cannot find resource group for SWA '$SWA_NAME' in subscription $SUB" >&2
    exit 1
  fi
  echo "    RG: $RG"
  echo "==> [rotate] Resetting SWA API key"
  az staticwebapp secrets reset-api-key --name "$SWA_NAME" -g "$RG" >/dev/null
  TOKEN=$(az staticwebapp secrets list --name "$SWA_NAME" -g "$RG" --query 'properties.apiKey' -o tsv)
  if [[ -z "$TOKEN" ]]; then
    echo "error: token came back empty after reset" >&2
    exit 1
  fi
  # Re-write .env.<env> with the new token (preserve all other keys).
  tmp=$(mktemp)
  awk -F= -v new="$TOKEN" '
    BEGIN { OFS="=" }
    $1=="AZURE_STATIC_WEB_APPS_API_TOKEN" { print $1, new; next }
    { print }
  ' "$ENV_FILE" > "$tmp"
  mv "$tmp" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "    rotated and saved to $ENV_FILE"
fi

if [[ -z "$TOKEN" ]]; then
  echo "error: AZURE_STATIC_WEB_APPS_API_TOKEN missing in $ENV_FILE (re-run scripts/ui-bootstrap.sh $ENV_NAME --force)" >&2
  exit 1
fi

# --- 2. GitHub Environment -------------------------------------------------
echo "==> [1/3] GitHub Environment"
gh api -X PUT "/repos/${REPO}/environments/${ENV_NAME}" --silent
echo "    created/updated environment '${ENV_NAME}'"

# --- 3. Variables (non-secret) --------------------------------------------
echo "==> [2/3] Variables"
gh variable set AZURE_TENANT_ID            --env "$ENV_NAME" --body "$TENANT"   --repo "$REPO"
gh variable set AZURE_SUBSCRIPTION_ID      --env "$ENV_NAME" --body "$SUB"      --repo "$REPO"
gh variable set AZURE_STATIC_WEB_APPS_NAME --env "$ENV_NAME" --body "$SWA_NAME" --repo "$REPO"
gh variable set VITE_API_BASE_URL          --env "$ENV_NAME" --body "$API_BASE" --repo "$REPO"
echo "    set 4 variables on environment '${ENV_NAME}'"

# --- 4. Secret (the deploy token) -----------------------------------------
echo "==> [3/3] Secret"
gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN \
  --env "$ENV_NAME" --repo "$REPO" --body "$TOKEN"
echo "    set 1 secret on environment '${ENV_NAME}'"

echo
echo "==> Done. Verify with:"
echo "    scripts/ui-cicd-verify.sh ${ENV_NAME}"
echo
echo "==> Trigger a deploy:"
echo "    gh workflow run deploy-azure.yml -f environment=${ENV_NAME} --repo $REPO"
