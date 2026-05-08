# Deploying TagPulse-UI to Azure

Quick-start (5 commands). The canonical operator runbook lives in the backend
repo: [TagPulse/docs/runbooks/ui-first-deploy.md](https://github.com/9owlsboston/TagPulse/blob/main/docs/runbooks/ui-first-deploy.md).

## Prerequisites

- Backend already deployed to the same environment via `azd up` in the
  [TagPulse](https://github.com/9owlsboston/TagPulse) repo (the Static Web App
  resource is provisioned there, but never deployed into).
- Local tools: `node ≥20`, `npm ≥10`, `gh` signed in to `9owlsboston`,
  `az` signed in to the same tenant as the backend `.env.<env>`.
- Sibling checkout of TagPulse at `../TagPulse` (or set `TAGPULSE_REPO=<path>`).

## Quick Start

```bash
# 1. Verify local tooling + auth
scripts/ui-preflight.sh

# 2. Pull api URL + SWA token from the backend azd env into .env.<env>
scripts/ui-bootstrap.sh dev          # → .env.dev (mode 600)

# 3. Wire the GitHub Environment (variables + secret)
scripts/ui-cicd-setup.sh dev
scripts/ui-cicd-verify.sh dev        # exit 0 = ready to deploy

# 4. First deploy: push to main (auto → dev) or trigger manually
gh workflow run deploy-azure.yml -f environment=dev --repo 9owlsboston/TagPulse-UI
```

## Triggers

| Trigger                       | Target environment                                  |
| ----------------------------- | --------------------------------------------------- |
| `push` to `main`              | `dev`                                               |
| Tag `v*`                      | `staging`                                           |
| `workflow_dispatch`           | Manual choice (`production` gated by reviewer rules) |

## Manual deploy (skip CI)

For first-time wiring or troubleshooting, you can deploy from your laptop:

```bash
source scripts/ui-env-load.sh dev
npm ci
npm run build
npx @azure/static-web-apps-cli deploy ./dist \
  --deployment-token "$AZURE_STATIC_WEB_APPS_API_TOKEN" \
  --env dev
```

## Token rotation

```bash
scripts/ui-cicd-setup.sh dev --rotate
```

Calls `az staticwebapp secrets reset-api-key`, rewrites `.env.dev`, and
re-uploads the secret to the GitHub Environment.

## Build-time configuration

Only one variable is baked into the bundle: `VITE_API_BASE_URL`. It must
be set to the deployed api origin (e.g.
`https://tpdev-api.<random>.<region>.azurecontainerapps.io`).

The deployment token (`AZURE_STATIC_WEB_APPS_API_TOKEN`) is **never** a
build-time variable — it lives only as a GitHub Environment secret.

## Source of truth: backend azd env

`scripts/ui-bootstrap.sh` reads the following Bicep outputs from the
backend's azd env (`tagpulse-<env>`):

| azd key                  | Used as                              |
| ------------------------ | ------------------------------------ |
| `apiFqdn`                | `https://${apiFqdn}` → `VITE_API_BASE_URL` |
| `staticWebAppName`       | `AZURE_STATIC_WEB_APPS_NAME`         |
| `staticWebAppHostname`   | `AZURE_STATIC_WEB_APPS_HOSTNAME`     |
| `AZURE_SUBSCRIPTION_ID`  | `AZURE_SUBSCRIPTION_ID`              |
| `AZURE_RESOURCE_GROUP`   | `AZURE_RESOURCE_GROUP` (for `--rotate`) |

`AZURE_TENANT_ID` is read from `az account show` (azd does not surface
it). The SWA deploy token is fetched via `az staticwebapp secrets list`
(or `TagPulse/scripts/azd-ui-token.sh` once Phase A1 ships).

## Common failures

| Symptom                                       | Likely cause                                                                                  |
| --------------------------------------------- | --------------------------------------------------------------------------------------------- |
| SPA loads but every API call → CORS error     | Backend `CORS_ALLOW_ORIGINS` doesn't include the SWA hostname. Re-provision api after deploy. |
| `404` on every route                          | `staticwebapp.config.json` syntax error or missing `navigationFallback`.                      |
| `npm run build` fails with `VITE_API_BASE_URL undefined` | Run `source scripts/ui-env-load.sh <env>` first, or set the variable inline.       |
| `gh workflow run` returns 422                 | Environment variables / secrets not yet wired — run `scripts/ui-cicd-setup.sh <env>`.         |
| SWA token rejected (401)                      | Token rotated out-of-band; re-run with `--rotate`.                                            |

## Related documents

- Backend runbook: [TagPulse/docs/runbooks/ui-first-deploy.md](https://github.com/9owlsboston/TagPulse/blob/main/docs/runbooks/ui-first-deploy.md)
- ADR: [ADR-018 frontend cloud deployment](https://github.com/9owlsboston/TagPulse/blob/main/docs/adr/018-frontend-cloud-deployment.md)
- Design: [frontend-deployment.md](https://github.com/9owlsboston/TagPulse/blob/main/docs/design/frontend-deployment.md)
