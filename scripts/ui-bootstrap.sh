#!/usr/bin/env bash
# scripts/ui-bootstrap.sh <env>
#
# Generate .env.<env> for the TagPulse UI from the matching backend
# `azd env get-values` output, plus the SWA deployment token via
# scripts/azd-ui-token.sh in the backend repo.
#
# Idempotent: refuses to overwrite an existing target without --force.
# File is written mode 0600 because it contains the deployment token.
#
# Usage:
#   scripts/ui-bootstrap.sh dev
#   scripts/ui-bootstrap.sh staging --force
#   TAGPULSE_REPO=~/ws/TagPulse scripts/ui-bootstrap.sh dev
#
# Mirror of TagPulse/scripts/azd-bootstrap.sh.

set -euo pipefail

FORCE=0
ENV_NAME=""
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    -h|--help)
      sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    -*) echo "unknown flag: $arg" >&2; exit 2 ;;
    *) ENV_NAME="$arg" ;;
  esac
done

if [[ -z "$ENV_NAME" ]]; then
  echo "Usage: $0 <env> [--force]    # env: dev | staging | production" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$REPO_ROOT/.env.${ENV_NAME}"

# Locate the backend repo. Default assumption: sibling checkout.
BACKEND_REPO="${TAGPULSE_REPO:-$REPO_ROOT/../TagPulse}"
if [[ ! -d "$BACKEND_REPO" ]]; then
  cat >&2 <<EOF
error: cannot find backend TagPulse repo at $BACKEND_REPO

Set TAGPULSE_REPO to the path of your TagPulse checkout, e.g.:
    TAGPULSE_REPO=~/work/TagPulse $0 $ENV_NAME
EOF
  exit 1
fi

if [[ -f "$TARGET" && "$FORCE" -ne 1 ]]; then
  cat >&2 <<EOF
error: $TARGET already exists.

To rotate the SWA token in place: re-run this script with --force, or run
    scripts/ui-cicd-setup.sh $ENV_NAME --rotate
to rotate via az + push to the GitHub Environment secret in one step.
EOF
  exit 1
fi

# ── Tooling ──────────────────────────────────────────────────────────────────
command -v azd >/dev/null 2>&1 || { echo "error: azd not on PATH" >&2; exit 1; }
command -v az  >/dev/null 2>&1 || { echo "error: az not on PATH" >&2; exit 1; }

TOKEN_HELPER="$BACKEND_REPO/scripts/azd-ui-token.sh"
if [[ ! -x "$TOKEN_HELPER" ]]; then
  cat >&2 <<EOF
error: $TOKEN_HELPER not found or not executable.

This helper ships from Sprint 24 Phase A1 in the backend repo. Update your
TagPulse checkout (git pull) and ensure scripts/azd-ui-token.sh is +x.
EOF
  exit 1
fi

# ── Pull values from the backend azd env ────────────────────────────────────
echo "==> Reading backend azd env '$ENV_NAME' from $BACKEND_REPO"

# Map UI env name -> backend azd env name. Convention: tagpulse-<env>.
case "$ENV_NAME" in
  production) AZD_ENV="tagpulse-prod" ;;
  *)          AZD_ENV="tagpulse-${ENV_NAME}" ;;
esac

if ! ( cd "$BACKEND_REPO" && azd env list 2>/dev/null | awk '{print $1}' | grep -qx "$AZD_ENV" ); then
  cat >&2 <<EOF
error: backend azd environment '$AZD_ENV' not found.

In the backend repo, run:
    cd $BACKEND_REPO
    scripts/azd-bootstrap.sh $ENV_NAME
    azd up
EOF
  exit 1
fi

VALUES=$( cd "$BACKEND_REPO" && azd env get-values --environment "$AZD_ENV" 2>/dev/null )

# Helper: read KEY out of azd env values (handles "KEY=value" and "KEY=\"value\"")
extract() {
  local key="$1"
  printf '%s\n' "$VALUES" | awk -F= -v k="$key" '
    $1==k {
      sub(/^[^=]*=/, "", $0)
      gsub(/^"|"$/, "", $0)
      print
      exit
    }'
}

API_URL=$(extract SERVICE_API_URI)
TENANT=$(extract AZURE_TENANT_ID)
SUB=$(extract AZURE_SUBSCRIPTION_ID)
SWA_NAME=$(extract AZURE_STATIC_WEB_APPS_NAME)

# Some Bicep templates output the SWA name under a slightly different key.
[[ -z "$SWA_NAME" ]] && SWA_NAME=$(extract STATIC_WEB_APP_NAME)
[[ -z "$SWA_NAME" ]] && SWA_NAME=$(extract AZURE_SWA_NAME)

missing=()
[[ -z "$API_URL"  ]] && missing+=("SERVICE_API_URI")
[[ -z "$TENANT"   ]] && missing+=("AZURE_TENANT_ID")
[[ -z "$SUB"      ]] && missing+=("AZURE_SUBSCRIPTION_ID")
[[ -z "$SWA_NAME" ]] && missing+=("AZURE_STATIC_WEB_APPS_NAME")

if (( ${#missing[@]} > 0 )); then
  cat >&2 <<EOF
error: backend azd env '$AZD_ENV' is missing required outputs:
       ${missing[*]}

Re-run 'azd up' in the backend repo so the Bicep outputs land in the env.
EOF
  exit 1
fi

# ── Pull the SWA deployment token ───────────────────────────────────────────
echo "==> Fetching SWA deployment token via $TOKEN_HELPER"
TOKEN=$( "$TOKEN_HELPER" --env "$ENV_NAME" --print 2>/dev/null || true )
if [[ -z "$TOKEN" ]]; then
  # Fallback: shell out to az directly.
  RG=$( cd "$BACKEND_REPO" && azd env get-values --environment "$AZD_ENV" 2>/dev/null \
        | awk -F= '$1=="AZURE_RESOURCE_GROUP" || $1=="RESOURCE_GROUP" {gsub(/"/,"",$2); print $2; exit}' )
  if [[ -z "$RG" ]]; then
    echo "error: could not determine SWA resource group; check $TOKEN_HELPER" >&2
    exit 1
  fi
  TOKEN=$(az staticwebapp secrets list \
    --name "$SWA_NAME" -g "$RG" \
    --query 'properties.apiKey' -o tsv 2>/dev/null || true)
fi
if [[ -z "$TOKEN" ]]; then
  echo "error: SWA deployment token came back empty" >&2
  exit 1
fi

# ── Render the target .env.<env> ────────────────────────────────────────────
umask 077
cat > "$TARGET" <<EOF
# Generated by scripts/ui-bootstrap.sh on $(date -u +%Y-%m-%dT%H:%M:%SZ)
# DO NOT COMMIT. The deployment token is sensitive.

# --- build-time (baked into dist/) ---------------------------------------
VITE_API_BASE_URL=$API_URL

# --- deploy-time (used by scripts/ui-cicd-setup.sh) ----------------------
AZURE_TENANT_ID=$TENANT
AZURE_SUBSCRIPTION_ID=$SUB
AZURE_STATIC_WEB_APPS_NAME=$SWA_NAME
AZURE_STATIC_WEB_APPS_API_TOKEN=$TOKEN
EOF
chmod 600 "$TARGET"

echo
echo "✓ wrote $TARGET (mode 600)"
echo "  VITE_API_BASE_URL=$API_URL"
echo "  AZURE_STATIC_WEB_APPS_NAME=$SWA_NAME"
echo "  AZURE_STATIC_WEB_APPS_API_TOKEN=*** ($(printf '%s' "$TOKEN" | wc -c | tr -d ' ') chars)"
echo
echo "Next:"
echo "    source scripts/ui-env-load.sh $ENV_NAME"
echo "    npm run build"
echo "    npx @azure/static-web-apps-cli deploy ./dist --deployment-token \"\$AZURE_STATIC_WEB_APPS_API_TOKEN\" --env $ENV_NAME"
