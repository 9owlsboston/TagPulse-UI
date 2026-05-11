# Changelog

All notable changes to TagPulse-UI will be documented in this file.

## Unreleased

### Added
- **Sprint 28 G3 — Sites & Zones edit.** [src/pages/assets/SitesZones.tsx](src/pages/assets/SitesZones.tsx) gains a pencil-icon Edit button on every site row and every zone row (admin/editor only). Site edit modal lets the operator change `name`, `address`, and `default_timezone` (IANA helper text). Zone edit modal updates `name`, and for `reader_bound` zones, `fixed_reader_ids`. Polygon/geofence geometry edits remain deferred to the Map page (per audit). Wires `useUpdateSite` / `useUpdateZone` from [src/hooks/useAssets.ts](src/hooks/useAssets.ts) — delete was already shipped in an earlier sprint.
- **Sprint 28 G4 — Device detail edit.** [src/pages/devices/DeviceDetail.tsx](src/pages/devices/DeviceDetail.tsx) header now exposes an Edit button (admin/editor) next to Decommission. The modal edits the actual `DeviceUpdate` schema fields — `name`, `device_type`, `firmware_version`, `status` (active/maintenance/decommissioned), and free-form `metadata` (JSON textarea, validated client-side; empty input clears). Zone assignment is intentionally not in this modal — that lives on Sites & Zones (G3) and the new bulk action on the Devices list (G5), because zone membership is stored on `Zone.fixed_reader_ids` rather than a `Device.zone_id` column.
- **Sprint 28 G5 — Device list bulk re-assign to zone.** [src/pages/devices/DeviceList.tsx](src/pages/devices/DeviceList.tsx) gains a checkbox column and a "Move to zone…" button (admin/editor) that opens a modal with a reader-bound zone picker. On confirm the page fans out `PATCH /zones/{id}` calls (Sprint 27 C6 client-side fan-out pattern): for every selected device id it (a) removes the id from any other reader-bound zone that contains it, and (b) adds it to the target zone. Limited to 50 selections per page (matches existing pagination of 20). Failures are surfaced via `Promise.allSettled` summary toast.
- **Sprint 28 G6 — Telemetry models edit.** [src/pages/telemetry-models/TelemetryModels.tsx](src/pages/telemetry-models/TelemetryModels.tsx) adds an Edit button per row (admin/editor). The modal uses `Form.List` to add/remove/edit metric definitions in place via `PATCH /telemetry-models/{id}` (Sprint 28 G1). `device_type` is rendered disabled — backend enforces it as immutable identity. Editing in place avoids orphaning historical readings (vs. delete + recreate).
- **Sprint 28 G7 — Tenant Settings → Map tab.** [src/pages/admin/TenantSettings.tsx](src/pages/admin/TenantSettings.tsx) now shows a Map tab (admin only). The new `MapConfigTab` component reads `useMapConfig()`, exposes a provider-kind dropdown (OSM default / Mapbox / MapTiler / self-hosted / custom JSON) with kind-specific fields (api key as `Input.Password`, style id, attribution, tile URL template), serializes the appropriate `provider` blob, and PATCHes via the new `useUpdateMapConfig()` hook in [src/hooks/useMapConfig.ts](src/hooks/useMapConfig.ts). A live preview tile re-fetches on save so operators can verify the resolved config visually. Switching to OSM sends `{provider: null}` so the backend reverts to the system default.
- **Sprint 28 G8 — Asset detail edit.** [src/pages/assets/AssetDetail.tsx](src/pages/assets/AssetDetail.tsx) header now offers an Edit button (admin/editor). Modal edits `name`, `asset_type`, `external_ref`, and free-form `metadata` (JSON textarea with parse validation). Status changes still go through the existing Retire button; tag bind/unbind remain in the bindings table. Hierarchy edits (`parent_asset_id`) are intentionally out of scope for this ticket per the G2 audit.
- **Sprint 28 G2 — UI CRUD audit.** [docs/ui-crud-audit-sprint28.md](docs/ui-crud-audit-sprint28.md) is the per-page CRUD audit cross-referencing every route in [src/App.tsx](src/App.tsx) against backend verbs in [openapi.json](openapi.json). Confirms the Phase G ticket scope (G3 sites/zones **edit only** — delete already shipped; G4 device-detail edit; G5 device bulk re-assign; G6 telemetry-models edit; G7 **add** Tenant Settings → Map tab + inline editor — the tab does not exist today; G8 asset-attribute edit — unbind is already wired) and surfaces six additional out-of-Phase-G gaps (Product delete, Lot edit/delete, StockItem edit/delete, TagDataMapping edit) recommended for a Sprint 29 inventory-CRUD mini-phase. Records one deferral with a reason: integration-delivery retry (gated on Sprint 28 C3 `dead_letter_events.source` + Sprint 29 retry routing).

### Changed
- **API client regenerated against TagPulse `openapi.json` @ 2026-05-10.** Picks up Sprint 28 G1 (`PATCH /telemetry-models/{model_id}` + `TelemetryModelUpdate` schema) which unblocks G6, plus minor schema refreshes for assets/integrations/inventory/tag-data-mappings carried since the last regen. `npm run generate-api` produces the same diff.

### Added
- **Sprint 29 — Health gate now detects "API up but database down."** [src/components/ApiHealthGate.tsx](src/components/ApiHealthGate.tsx) still uses `/health/live` as the startup gate (unchanged behavior), but on success now also probes `/health/ready`. When ready returns 503 (e.g. dev Postgres Flex Burstable auto-stopped after ~7 days idle) the new `useHealthStatus()` hook surfaces `{ degraded, degradedReason, degradedDetail }`, and [src/components/Layout.tsx](src/components/Layout.tsx) renders an AntD warning `Alert` above the page content explaining "TagPulse database is unreachable — live data may be stale or missing." Closes the silent-failure mode described in [#13](https://github.com/9owlsboston/TagPulse-UI/issues/13) where TanStack Query calls would just hang with no UI signal.
- **Operator hint on prolonged outage.** When the health gate fails to reach `/health/live` for ≥3 retries (~7 s in), the unreachable banner now includes a second `Alert` pointing operators at the most common cause: check the dev Postgres state in `tagpulse-dev-rg` (server `tpdev-pg-mwig6fst`) and start it if Stopped.
- **Data Explorer — live row-flash on new tag reads.** Mirrors the stock-ticker animation already used on Assets list. [src/pages/telemetry/DataExplorer.tsx](src/pages/telemetry/DataExplorer.tsx) now subscribes to the `tag_read.created` SSE channel (auto-invalidates the `['tag-reads']` query), and tracks read ids across refreshes — newly arrived rows flash green for 900 ms with a `cell-pop` on the Timestamp column. First payload is seeded silently (no strobe on mount), bursts are capped to 12 simultaneous flashes per refresh, and `prefers-reduced-motion` disables the keyframes.

### Fixed
- **Data Explorer row-flash never fired in practice.** SSE-only invalidation was unreliable because browser `EventSource` cannot attach the JWT `Authorization` header, so the `/integrations/stream` connection was silently rejected and the table never refetched. Added a polling fallback: [src/hooks/useTagReads.ts](src/hooks/useTagReads.ts) now accepts an optional `refetchInterval`, and [src/pages/telemetry/DataExplorer.tsx](src/pages/telemetry/DataExplorer.tsx) opts into `REFETCH_INTERVAL` (30 s) — same pattern already used by `useReadsPerHour` on the dashboard and `useAssetsCurrentLocations` on the assets list (whose flash animations were working for exactly this reason).
- **Telemetry chart axis labels.** Both Telemetry views were rendering bare Y axes with no unit, so the value could be misread. Added explicit axis labels and tooltip units: [src/pages/telemetry/TelemetryDashboard.tsx](src/pages/telemetry/TelemetryDashboard.tsx) Y axis is now labeled "Reads / hour" with integer-only ticks and tooltips formatted as `<n> reads`; [src/pages/telemetry/DataExplorer.tsx](src/pages/telemetry/DataExplorer.tsx) Y axis is labeled "Signal strength (dBm)" with tooltips formatted as `<n> dBm`.
- **401 session-expiry interceptor for generated API client.** The generated OpenAPI client (`openapi-typescript-codegen`) threw `ApiError` on HTTP 401 but did not clear the stored JWT or redirect to login — the SPA rendered a loading state indefinitely. Added `QueryCache.onError` + `MutationCache.onError` in [src/App.tsx](src/App.tsx) wired to `handleGlobal401` in [src/lib/auth.tsx](src/lib/auth.tsx) which clears `sessionStorage`, `localStorage`, and `window.__TAGPULSE_TOKEN__` then reloads. Also disables TanStack Query retry on 401 (was retrying 3× before surfacing the error).
- **Sprint 25 follow-up — reject unknown tenant ids at login.** [src/lib/auth.tsx](src/lib/auth.tsx) `loginWithTenantId` now probes `${VITE_API_BASE_URL}/tenant/config` with the supplied id before committing it to storage. Unknown ids (api 401/404) surface "Tenant not found. Check the tenant ID and try again." in the existing [src/components/TenantGuard.tsx](src/components/TenantGuard.tsx) error banner, and the Continue button shows a loading spinner while the probe is in flight. Previously, any UUID was accepted, the user was logged in as a viewer, and the upper-right header showed `Tenant: <unknown-uuid>` because the subsequent `useTenantConfig()` query returned undefined — masking the lookup failure.

### Added
- **Sprint 25 Slice 2 — CI gating & CSP hardening** (UI half of [TagPulse roadmap.md Sprint 25](../TagPulse/docs/roadmap.md), tasks B3, B4, B5).
  - **B3 — Deploy-time api preflight.** [.github/workflows/deploy-azure.yml](.github/workflows/deploy-azure.yml) now curls `${VITE_API_BASE_URL}/health/ready` before uploading the SPA bundle to Azure Static Web Apps. Non-200 → deploy fails with the exact response in the log. Skipped on `pull_request` events (preview deploys) and when `VITE_API_BASE_URL` is empty.
  - **B4 — Post-deploy SPA-vs-api smoke.** Extended the existing post-deploy smoke step to verify SPA-vs-api consistency: curls the api's `/health/ready` and runs a CORS preflight (OPTIONS) to confirm the SWA hostname is in the api's `Access-Control-Allow-Origin`. Emits a warning (not a hard failure) on CORS mismatch to avoid blocking deploys during backend reconfiguration.
  - **B5 — CSP `Content-Security-Policy-Report-Only` header.** [public/staticwebapp.config.json](public/staticwebapp.config.json) now ships a parallel report-only policy stricter than the enforced one: no `'unsafe-inline'` in `style-src`, no `data:` in `font-src`. Both policies add `https://dc.services.visualstudio.com` and `https://*.in.applicationinsights.azure.com` to `connect-src` for App Insights telemetry. After ~4 weeks of stable traffic with zero unexpected violations, the report-only policy will be swapped to enforced (Sprint 26+).
  - `VITE_APP_INSIGHTS_CONNECTION_STRING` now passed as a build-time env var in both `preview` and `deploy` jobs in [deploy-azure.yml](.github/workflows/deploy-azure.yml).
  - 3 new tests for `handleGlobal401` in [src/components/Resilience.test.tsx](src/components/Resilience.test.tsx): 401 with token → clears+reloads, 401 without token → no-op, non-401 → no-op.

- **Sprint 25 Slice 1 — Frontend resilience & telemetry** (UI half of [TagPulse roadmap.md Sprint 25](../TagPulse/docs/roadmap.md), tasks B1, B2, C1, C2).
  - **B1 — Startup health gate.** New [src/components/ApiHealthGate.tsx](src/components/ApiHealthGate.tsx) probes `${VITE_API_BASE_URL}/health/live` on mount with a 5s timeout. On failure renders a full-page `<Result>` banner ("TagPulse is temporarily unavailable. Retrying…") with exponential-backoff retry (1s → 2s → 4s → cap at 30s) and a "Retry now" button. Re-probes on tab focus when last success was >60s ago. Replaces the silent "login spinner forever" UX when the backend is down or CORS is misconfigured.
  - **B2 — Root error boundary.** New [src/components/ErrorBoundary.tsx](src/components/ErrorBoundary.tsx) catches React render errors anywhere below it, forwards `(error.message, error.stack, componentStack, location)` to App Insights via `trackException()`, and renders a recovery card with "Copy error details" (clipboard) + Reload actions. Wrapped around the entire app tree above `<QueryClientProvider>` in [src/App.tsx](src/App.tsx).
  - **C1 — App Insights browser SDK.** New [src/lib/telemetry.ts](src/lib/telemetry.ts) wraps `@microsoft/applicationinsights-web`. Reads `VITE_APP_INSIGHTS_CONNECTION_STRING` at init time; empty string → every export is a no-op (local dev / unconfigured CI). Privacy: `disableCookiesUsage: true`, `isStorageUseDisabled: true`, query strings stripped from page-view URIs to prevent tag-id / lot-code leakage. Initialized from [src/main.tsx](src/main.tsx) before `<App />` mounts.
  - **C2 — Route & dependency tracking.** New [src/components/RouteTracker.tsx](src/components/RouteTracker.tsx) + [src/lib/routes.ts](src/lib/routes.ts) emit `trackPageView()` on every React Router navigation, normalizing UUIDs and numeric ids to `:id` so the App Insights `pages` blade groups dynamic routes (`/devices/:id`, `/inventory/lots/:id`). [src/api/client.ts](src/api/client.ts) now emits `trackDependency()` for every fetch with `(name, url, duration, resultCode, success)` so failing api calls show up in App Insights' `failures` blade.
  - 11 new tests in [src/components/Resilience.test.tsx](src/components/Resilience.test.tsx) cover the health gate (200 / network error / 503), error boundary catch + recovery, route normalization, and the telemetry no-op mode.
  - Backend dependency: requires `/health/live` (already shipped Sprint 22 A6). `VITE_APP_INSIGHTS_CONNECTION_STRING` is read from the backend's `appInsightsConnectionString` Bicep output and will be wired into `scripts/ui-cicd-setup.sh` in a follow-up slice (no-op until then).

### Changed
- **Sprint 24 follow-up — azd env parity fix.** The Phase B scripts assumed Bicep output names that the backend `azd env` does not actually emit. Verified against a live `tagpulse-dev` env and corrected:
  - [scripts/ui-bootstrap.sh](scripts/ui-bootstrap.sh) now reads the real Bicep output names: `apiFqdn` (constructed as `https://${apiFqdn}` for `VITE_API_BASE_URL`), `staticWebAppName`, `staticWebAppHostname`, plus `AZURE_SUBSCRIPTION_ID` / `AZURE_RESOURCE_GROUP`. `AZURE_TENANT_ID` is read from `az account show` because azd does not surface it. The backend `scripts/azd-ui-token.sh` (Phase A1) is now optional with a warning instead of a hard requirement — falls back to `az staticwebapp secrets list` against the SWA name + RG resolved from azd.
  - Generated `.env.<env>` now also carries `AZURE_RESOURCE_GROUP` (needed for `--rotate`) and `AZURE_STATIC_WEB_APPS_HOSTNAME` (the real `<random>.azurestaticapps.net` hostname).
  - [scripts/ui-cicd-setup.sh](scripts/ui-cicd-setup.sh) sets a 5th GitHub variable `AZURE_STATIC_WEB_APPS_HOSTNAME`. [scripts/ui-cicd-verify.sh](scripts/ui-cicd-verify.sh) checks for it.
  - [.github/workflows/deploy-azure.yml](.github/workflows/deploy-azure.yml) reads the hostname from `vars.AZURE_STATIC_WEB_APPS_HOSTNAME` directly instead of guessing from the action's output (which was unreliable).
  - Smoke-tested end-to-end: `scripts/ui-bootstrap.sh dev` against the real `tagpulse-dev` env now produces a complete `.env.dev` with no manual editing.

### Added
- **Sprint 24 Phase B — Frontend Cloud Deployment** (UI repo half of [TagPulse roadmap.md Sprint 24](../TagPulse/docs/roadmap.md), parity with Sprint 22 backend deploy ergonomics).
  - `staticwebapp.config.json` — SPA fallback to `/index.html`, security headers (HSTS 1y w/ preload, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`), and a starter CSP scoped to `*.azurecontainerapps.io` (lock-down deferred per ADR-018 §5).
  - `.env.example` — build-time-only template documenting `VITE_API_BASE_URL`. Wired into [src/api/client.ts](src/api/client.ts) + [src/api/configureGenerated.ts](src/api/configureGenerated.ts) so the deployed bundle hits the matching api origin (empty in dev → Vite proxy continues to work).
  - Deployment scripts mirroring `TagPulse/scripts/azd-*.sh`:
    - [scripts/ui-bootstrap.sh](scripts/ui-bootstrap.sh) — pulls `SERVICE_API_URI`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AZURE_STATIC_WEB_APPS_NAME` from the backend `azd env get-values` plus the SWA token via the backend's `scripts/azd-ui-token.sh` (Phase A1), writes `.env.<env>` mode 0600, refuses to overwrite without `--force`.
    - [scripts/ui-env-load.sh](scripts/ui-env-load.sh) — `source`-able exporter; warns when executed instead of sourced.
    - [scripts/ui-preflight.sh](scripts/ui-preflight.sh) — `node ≥20`, `npm ≥10`, `gh` signed in, `az` signed in to the tenant matching `.env.<env>`.
    - [scripts/ui-cicd-setup.sh](scripts/ui-cicd-setup.sh) — idempotent. Creates the GitHub Environment, sets 4 variables, uploads `AZURE_STATIC_WEB_APPS_API_TOKEN` as a secret. `--rotate` resets the SWA api key + re-uploads.
    - [scripts/ui-cicd-verify.sh](scripts/ui-cicd-verify.sh) — read-only drift check; exit 0 = ready to deploy.
  - GitHub workflows:
    - [.github/workflows/deploy-azure.yml](.github/workflows/deploy-azure.yml) — push to `main` → `dev`, `v*` tag → `staging`, `workflow_dispatch` → manual any env (production gated by GitHub Environment reviewer rules). PR events trigger the SWA action's built-in preview deploy + auto-teardown on PR close. Resolves the deployed hostname from the action's `static_web_app_url` output, then smoke-tests HTTP 200 + the asset hash from `dist/index.html` is present in the served response.
    - [.github/workflows/build-and-test.yml](.github/workflows/build-and-test.yml) — PR + push-to-`main` lint + typecheck + vitest + bundle build (replaces the prior `ci.yml`).
  - [docs/azure-deploy.md](docs/azure-deploy.md) — 5-command quick-start, links back to the backend's canonical `docs/runbooks/ui-first-deploy.md` (Phase C1).
  - `.gitignore` ignores `.env.dev` / `.env.staging` / `.env.production` (mode-600 files contain the SWA deploy token).

- **Sprint 21 — Subject-Scoped Telemetry: UI** (closes the seven UI items deferred from Sprint 20 per [TagPulse roadmap.md L377](../TagPulse/docs/roadmap.md#L377)).
  - Regenerated typed API client from the live backend `openapi.json` (Sprint 19/20/21 surface). New models: `LatestTelemetryEntry`, `TenantConfig.telemetry_subject_kinds`, `TenantConfigUpdate.telemetry_subject_kinds`, `AssetResponse.latest_telemetry`, `LotResponse.latest_telemetry`, `TelemetryReadingResponse` (subject-scoped). New service methods: `TelemetryService.listTelemetryReadingsTelemetryReadingsGet`, `…Aggregates…`, `…IngestPost`; `RulesService.listRuleTemplatesRuleTemplatesGet`, `…getRuleTemplate…`.
  - **Tenant Settings — subject-scoped telemetry opt-in card** ([src/pages/admin/TenantSettings.tsx](src/pages/admin/TenantSettings.tsx)). New "Subject-scoped telemetry" card with switches for `asset` / `lot` / `stock_item` / `zone` (`device` is implicit and always saved). Drives the gating for every other Sprint 21 surface.
  - **Asset detail — Telemetry tab** ([src/pages/assets/AssetDetail.tsx](src/pages/assets/AssetDetail.tsx)). New tab consuming the shared `<SubjectTelemetryTab subjectKind="asset" />`. Shows the metric picker (driven by the embedded `latest_telemetry`), a time-range picker, and a Recharts line chart of `GET /telemetry/readings?subject_kind=asset&subject_id=…`. Renders an opt-in warning when the tenant hasn't enabled `asset` in subject-scoped telemetry.
  - **Assets list — opt-in Temperature column** ([src/pages/assets/AssetList.tsx](src/pages/assets/AssetList.tsx)). Column appears only when `asset` is in `tenant.telemetry_subject_kinds`; pulls `temperature_c` from the embedded `latest_telemetry` on each row (forward-compatible — renders `—` if the row doesn't carry it).
  - **Lot detail page** ([src/pages/inventory/LotDetail.tsx](src/pages/inventory/LotDetail.tsx)) — new route `/inventory/lots/:id`. Overview tab with descriptions + **Cold-chain card** (`Statistic` showing latest `temperature_c` against an 8 °C threshold, BREACH/OK badge, error alert + nudge to the rule-template gallery on breach). Telemetry tab reuses `<SubjectTelemetryTab subjectKind="lot" />`. Lot Expiry Queue rows now link to the new detail page via `lot_code`.
  - **Devices → Telemetry — `subject_kind` filter** ([src/pages/devices/DeviceTelemetryTab.tsx](src/pages/devices/DeviceTelemetryTab.tsx)). New `Select` narrows the device-scoped telemetry view by `metadata.subject_kind`: `all` / `device (self)` / `asset` / `lot` / `stock_item` (treats missing `metadata.subject_kind` as `device` for legacy rows).
  - **Rules editor — subject-scoped telemetry condition + template gallery** ([src/pages/rules/RuleEditor.tsx](src/pages/rules/RuleEditor.tsx)). New condition type `telemetry.threshold` with a `subject_kind` selector (filtered against the tenant's `telemetry_subject_kinds` opt-ins), metric / operator / value / cooldown fields. New "Start from template" button opens a modal driven by `GET /rule-templates`; templates whose `requires_subject_kind` isn't enabled are disabled with an orange tag. Selecting a template pre-fills the form. New `useRuleTemplates` hook in [src/hooks/useRules.ts](src/hooks/useRules.ts).
  - **Alert history — subject context** ([src/pages/rules/AlertHistory.tsx](src/pages/rules/AlertHistory.tsx)). New **Subject** column reads `context.subject_kind` + `context.subject_id` and links to the matching detail page (`/assets/:id`, `/inventory/lots/:id`, or `/devices/:id`). Every alert row is now expandable and renders the full `context` JSON, satisfying the Sprint 21 "alert detail subject context" deliverable.
  - Shared `<SubjectTelemetryTab>` component ([src/components/SubjectTelemetryTab.tsx](src/components/SubjectTelemetryTab.tsx)) and `useSubjectTelemetry` hook ([src/hooks/useTelemetry.ts](src/hooks/useTelemetry.ts)) to avoid duplicating the chart wiring across asset and lot details.
  - `useLot(lotId)` hook added to [src/hooks/useInventory.ts](src/hooks/useInventory.ts).
  - Tests: new [src/pages/inventory/LotDetail.test.tsx](src/pages/inventory/LotDetail.test.tsx) (2 cases — lot/product render, cold-chain breach badge); existing `RuleEditor.test.tsx` extended with mocks for `useRuleTemplates` and `useTenantConfig`. **44 tests passing total** (was 42).

- **Sprint 16 mitigation — Admin Audit Log page**:
  - New `/admin/audit-logs` route (admin-only) — `src/pages/admin/AuditLog.tsx`. AntD `Table` of tenant audit entries (timestamp, action tag, resource, user, JSON-changes peek with hover-to-expand tooltip).
  - `Segmented` preset selector with **All**, **Device security events** (filters server-side via `actions=device.token_rotated,device.cert_attached,device.approved,device.rejected` per design [identity-device-provisioning.md §7](../TagPulse/docs/design/identity-device-provisioning.md)), **Tenant config**, **User management**.
  - New `useAuditLogs` hook (`src/hooks/useAuditLogs.ts`) + `auditLogsApi` in `src/api/client.ts` + sidebar `Audit Log` entry under admin tier.
  - Regenerated typed API client picks up the new `?actions=` query param on `AdminService.listAuditLogsAdminAuditLogsGet`.
  - Tests: `AuditLog.test.tsx` (3 cases — default preset, preset switch comma-joins actions, action tag renders). **42 tests passing total.**

- **Sprint 17 — Geofencing & Map UI + mTLS cert attach (UI)**
  - Regenerated typed API client — adds `MapConfigResponse`, `TileProviderUpdate`, `DeviceCertAttach`, `DeviceCertResponse` models, plus `TenantService.getMapConfig*` / `updateMapConfig*` and `DeviceRegistryService.attachDeviceCert*` methods. `ZoneResponse` exposes `polygon_geojson` + denormalized bbox columns.
  - **Map page** (`/map`, viewer+, gated by tracking_modes `asset`): provider-agnostic Leaflet map driven by `GET /tenant/map-config` (falls back to OSM). Live asset markers (24h-old positions when the time-slider is dragged), geofence polygons rendered from `polygon_geojson`, layer toggles for assets/zones, and a 24h time-slider that resolves each visible asset's position via `GET /assets/{id}/path`. Markers click through to asset detail; mobile-mobility assets get a colored ring (proxy for the carriers spec). Footer always renders the resolver `attribution`; OSM-default footer renders the dev-only warning per [geofencing-and-map.md §11 Q4](../TagPulse/docs/design/geofencing-and-map.md).
  - **Zone editor — polygon draw**: `src/components/PolygonDraw.tsx` — click-to-add vertex, undo, clear; emits valid GeoJSON `Polygon` (auto-closes the ring; server validates the rest). Wired into the **Sites & Zones** zone-create modal so picking `kind=geofence` swaps the readers picker for a draw map. (No `leaflet-draw` dependency — pure react-leaflet event handlers.)
  - **Rule wizard — geofence step**: adds three new condition types (`zone.entered`, `zone.exited`, `zone.dwell_exceeded`) with zone picker, `subject_kinds` multi-select (asset / stock_item / device), optional `cooldown_s`, and (for dwell) a required `dwell_minutes` input. `src/types.ts` `ConditionType` union extended.
  - **Device detail — Security tab (Sprint 17b)**: shows `cert_thumbprint` (copy-on-click) and `cert_subject` alongside the existing token info. Admin-only **Attach cert** / **Replace cert** modal accepts a PEM-encoded X.509 certificate, validates the `BEGIN CERTIFICATE` marker client-side, and posts to `/device-registry/{id}/cert`. UI surfaces the ADR-012 promise that the backend stores only the SHA-256 thumbprint + RFC 4514 subject and discards the PEM. `useAttachDeviceCert` hook added.
  - **Sidebar**: new **Map** entry (viewer+, requires tracking_mode `asset`).
  - `src/hooks/useMapConfig.ts` with an `OSM_FALLBACK` constant for offline-dev rendering.
  - **Map page — stock-density layer**: third layer toggle ("Stock density") aggregates `GET /inventory/stock-levels` quantities per `zone_id` and overlays geofence polygons with fill opacity scaled to total quantity (red shading + qty label tooltip). Per design [geofencing-and-map.md §6](../TagPulse/docs/design/geofencing-and-map.md).
  - **Map page — carrier manifest pop-out**: every asset popup gets a "View manifest →" link that opens an AntD `Tree` modal of the recursive `GET /assets/{id}/manifest` response, satisfying [mobile-carriers-and-manifests.md](../TagPulse/docs/design/mobile-carriers-and-manifests.md) §4. Empty children render a graceful "not carrying any child assets" state. New `useAssetManifest` hook in `src/hooks/useAssets.ts`.
  - Tests: `MapPage.test.tsx` mocks `react-leaflet` + `leaflet` (incl. `Tooltip`) plus the new `useAssetManifest` and `useStockLevels` hooks; `DeviceDetail.test.tsx` mock extended with `useAttachDeviceCert`. **39 passing total.**

- **Sprint 16 — Edge Contract & Identity Hardening (UI)**
  - Regenerated typed API client from backend `openapi.json` — adds `DeviceTokenResponse` model and `DeviceRegistryService.rotateDeviceToken*` method.
  - Hand-written `devicesApi.rotateToken` (POST `/device-registry/{id}/rotate-token`) and `useRotateDeviceToken` mutation hook (invalidates the device + device-list caches on success).
  - **Device detail — Security tab**: shows `token_prefix` and `token_rotated_at` (per ADR-011 Phase 1). Admin-gated **Rotate token** button opens a confirm dialog warning that the current token is invalidated immediately, then displays the new plaintext token in a copy-once modal with a clipboard-copy button. Modal cannot be reopened — the warning makes clear the value cannot be retrieved again (backend stores SHA-256 only).
  - **Device detail — Heartbeat tab**: connection state, firmware version, last-seen, mobility, and the device's MQTT-published configuration JSON.
  - **Device list — admin "Last Rotated" column**: visible only when the current user has the `admin` role; renders `token_rotated_at` or `never` per [edge-device-contract.md §7](../TagPulse/docs/design/edge-device-contract.md).
  - `DeviceResponse` extended in `src/types.ts` with `token_prefix`, `token_rotated_at`, `mobility`.
  - Tests updated — `DeviceDetail.test.tsx` mocks `useRotateDeviceToken`, asserts the new tab labels (Heartbeat, Security), and verifies the **Rotate token** button renders for admins. **37 passing total.**

- **Sprint 15 — Phase F: Assets, Sites & Zones UI**
  - New hook module `src/hooks/useAssets.ts` — `useAssets`, `useAsset`, `useCreateAsset`, `useUpdateAsset`, `useRetireAsset`, `useAssetBindings`, `useBindTag`, `useUnbindTag`, `useAssetExternalPositions`, `useTagReadsForBinding` (legacy fallback), `useAssetCurrentLocation`, `useAssetPath`, `useAssetsInZone`, `useSites`, `useSite`, `useCreateSite`, `useUpdateSite`, `useDeleteSite`, `useZones`, `useCreateZone`, `useUpdateZone`, `useDeleteZone`. All wrap the generated `AssetsService` / `SitesZonesService` with consistent react-query cache keys.
  - **Pages**:
    - `pages/assets/AssetList.tsx` — searchable list (name / external_ref / tag), status filter, "Register Asset" modal (editor+).
    - `pages/assets/AssetDetail.tsx` — Overview (descriptions + current-location card now driven by `useAssetCurrentLocation`), Bindings tab (active + history with bind / unbind, editor+), Recent Path tab — prefers the server-merged `useAssetPath` (RFID + external in one query) and falls back to the legacy client-side merge. Sources are **badged** (RFID vs `latest_position_source` external) per [mobile-carriers-and-manifests.md §10 Q5](../TagPulse/docs/design/mobile-carriers-and-manifests.md).
    - `pages/assets/SitesZones.tsx` — collapsible site list (admin), per-site zone table with multi-select reader picker from the device registry, create / delete site & zone modals. New per-zone **Occupants** modal backed by `useAssetsInZone` showing assets currently in the zone.
  - **Device detail** — new "Covers Zones" panel listing zones whose `fixed_reader_ids` include this device.
  - **Dashboard** — new **Active Assets** KPI tile (gated by `tenants.tracking_modes` containing `asset`).
  - **Sidebar** — new **Assets** + **Sites & Zones** entries (gated by `tracking_modes` containing `asset`); Sites & Zones writes are admin-only.
  - **Routes** — `/assets`, `/assets/:id`, `/sites`.
  - Regenerated typed API client (new `AssetCurrentLocation`, `AssetPathPoint`, `AssetInZoneSummary` models; new `getAssetCurrentLocation*`, `getAssetPath*`, `listAssetsInZone*` methods).
  - Smoke tests in `src/pages/assets/Assets.test.tsx` for `AssetList` and `SitesZones` — updated mocks for `useAssetsInZone`. **36 passing total.**


  - New hook `src/hooks/useTenantConfig.ts` — `useTenantConfig` + `useUpdateTenantConfig` wrap `GET/PATCH /tenant/config`.
  - New page `pages/admin/TenantSettings.tsx` — tabbed admin surface (General toggles `tracking_modes`, Sensor metrics embeds `TelemetryModels`, Tag-data fields embeds `TagDataMappings` and is hidden when inventory mode is off). Routed at `/admin/tenant`.
  - New page `pages/inventory/LotExpiryQueue.tsx` — cross-product lot list (default 7-day window, expandable to 24h/30d/90d/all) backed by the new `GET /lots` endpoint and `useAllLots` hook. Sorted by soonest expiry, status tags (expired/orange/gold/green), product name links to `ProductDetail`. Routed at `/inventory/lots`.
  - **Sidebar gating** — `Layout.tsx` now reads `tenant.tracking_modes` and hides inventory entries (Products / Lot Expiry / Stock Levels / Stock Movements) when inventory mode is disabled. Replaced standalone "Tag-data Mappings" item with "Tenant Settings" (admin).
  - Regenerated typed API client (`TenantService`, `InventoryService.listAllLotsLotsGet`, `TenantConfig*` models).
  - **34 passing tests retained.**

- **Sprint 15b — Phase F: Inventory UI**
  - Regenerated typed API client from backend `openapi.json` — adds `InventoryService`, `SitesZonesService`, `AssetsService`, plus `Product*`, `Lot*`, `StockItem*`, `StockLevelRow`, `StockMovementResponse`, `TagDataMapping*` models.
  - New hook module `src/hooks/useInventory.ts` — `useProducts`, `useProduct`, `useCreateProduct`, `useUpdateProduct`, `useDeleteProduct`, `useLots`, `useCreateLot`, `useStockLevels`, `useStockMovements`, `useTagDataMappings`, `useCreateTagDataMapping`, `useDeleteTagDataMapping`. All wrap the generated `InventoryService` with consistent react-query cache keys.
  - **Pages**:
    - `pages/inventory/ProductList.tsx` — searchable catalog table, click-through to detail, "New Product" modal (editor+).
    - `pages/inventory/ProductDetail.tsx` — header descriptions, **stock-by-zone bar chart** (Recharts), Lots sub-section with expiry colour-coding (red < today, orange < 7 d) and "New Lot" modal.
    - `pages/inventory/StockLevels.tsx` — pivot grid (product × zone × total) with `unassigned` bucket for nulls, **CSV export** (`stock-levels.csv`).
    - `pages/inventory/StockMovements.tsx` — chronological ledger filtered by product/zone/time range, movement-type colour tags (enter/exit/transfer/consume).
    - `pages/inventory/TagDataMappings.tsx` (admin) — list, scope-aware create modal (tenant vs product), delete with confirm.
  - **Rule wizard extension** (`pages/rules/RuleEditor.tsx`) — new condition steps for `stock.below_threshold`, `stock.expiring_within`, `stock.unexpected_in_zone` with product/zone selectors backed by inventory + zones APIs.
  - **Sidebar** — Products, Stock Levels, Stock Movements (viewer+) and Tag-data Mappings (admin) menu entries.
  - **Routes** — `/inventory/products`, `/inventory/products/:id`, `/inventory/stock-levels`, `/inventory/stock-movements`, `/admin/tag-data-mappings`.
  - `ConditionType` union extended with the three `stock.*` literals.
  - Smoke tests in `src/pages/inventory/Inventory.test.tsx` for `ProductList` rendering and `StockLevels` pivot aggregation. **34 passing total.**

- **Sprint 14 (1/2) — Device detail: Telemetry & Location tabs**
  - Type extensions for migration 016: `TagReadResponse` gains optional `latitude`, `longitude`, `location_accuracy_m`, `location_source`, `epc`, `epc_hex`, `epc_scheme`, `epc_decoded`, `tid`, `user_memory_hex`, `tag_data`, `reader_antenna`. New `Location`, `Identity`, `LocationSource`, `DeviceTelemetryReading`, `TelemetryReadingCreate`, `TelemetryBatch` types.
  - New API surface: `telemetryApi.list()` → `GET /telemetry` (filterable by device + metric + time range) and `useDeviceTelemetry()` hook.
  - Device detail **Overview tab — "Last Read" panel**: surfaces `tag_id`, `timestamp`, `epc`, `epc_scheme` (badge), `tid`, `reader_antenna`, `signal_strength`, `latitude/longitude (source)`. Conditionally renders `epc_decoded` and `tag_data` JSON blocks.
  - Device detail **Telemetry tab — rebuilt**: per-`metric_name` selector populated from the device's telemetry model; time-range picker; unit-aware Y-axis label; model min/max applied to Y domain; "source: tag" badge with count when readings carry `metadata.source='tag'` (per [rfid-tag-data-model.md §7](../TagPulse/docs/design/rfid-tag-data-model.md)). Empty-state when no model is defined for the device type.
  - Device detail **new Location tab**: last-known lat/lon descriptions panel; Leaflet mini-map with OSM tiles (provider-agnostic resolver lands in Sprint 17a per [geofencing-and-map.md §11 Q4](../TagPulse/docs/design/geofencing-and-map.md)); marker popup + accuracy radius `Circle` when `location_accuracy_m` is present; default Leaflet marker icon paths rewired to imported assets (Vite-safe).
  - New deps: `leaflet`, `react-leaflet`, `@types/leaflet` (~40 KB gzip per ADR-007).
- **Sprint 14 (2/2) — Data Explorer / Dashboard / Quarantine / Rule wizard**
  - New `QuarantineReason` literal type (`unknown_metric` | `out_of_range` | `unit_mismatch` | `stale_timestamp`) for the filter UI; the wire shape now comes from the **generated** client (`TelemetryQuarantineResponse`) — first consumer of the regenerated typed client.
  - Bootstrap: `src/api/configureGenerated.ts` wires `OpenAPI.TOKEN`/`OpenAPI.HEADERS` resolvers to the same `__TAGPULSE_TOKEN__`/`__TAGPULSE_TENANT_ID__` window globals the hand-written client uses, imported once from `main.tsx`.
  - `useTelemetryQuarantine()` calls `TelemetryService.listTelemetryQuarantineTelemetryQuarantineGet()` (replaces the hand-written `telemetryApi.quarantine`, which is removed).
  - `src/api/generated/` is now committed (un-ignored) because app code imports from it; CI does not run `generate-api`. Regeneration remains reproducible from `../TagPulse/openapi.json`.
  - **Data Explorer** surfaces the new tag fields:
    - New columns: `EPC`, `Scheme`, `TID`, `Latitude`, `Longitude` (lat/lon to 5 decimals).
    - New filters: **"Has location"** checkbox (client-side), **EPC Scheme** selector (sgtin-96/198, sscc-96, giai-96/202, grai-96/170, raw).
    - CSV export now includes `epc`, `epc_scheme`, `tid`, `latitude`, `longitude`, `location_accuracy_m`, `location_source` and quotes fields containing commas/quotes/newlines.
  - **Overview dashboard KPI tile** — "Devices reporting location (24h)": distinct device IDs with at least one geotagged read in the last 24 h, computed client-side from `/tag-reads?start=…` (limit 1000). Ready for server-side promotion when cardinality grows.
  - **Telemetry Models — quarantine panel** (admin-only per design Decision #3):
    - Tag chips show counts per reason.
    - Reason filter selector.
    - Expandable rows reveal the raw payload JSON.
  - **Rule wizard — threshold field hints**: "Field" input is now an `AutoComplete` populated with `signal_strength`, every `metric_name` from every telemetry model (with unit + device_type), and a `tag_data.<key>` placeholder (per [rfid-tag-data-model.md §7](../TagPulse/docs/design/rfid-tag-data-model.md)).

### Fixed
- **CI quality gates green again.** `npm run check` (lint + typecheck + test) was red on `main` after the Sprint 13 merge.
  - `eslint.config.js`: added missing browser globals (`localStorage`, `sessionStorage`, `atob`, `setInterval`, etc.) so the auth code in `lib/auth.tsx` and the polling code in `components/KpiTile.tsx` lint cleanly.
  - `pages/admin/UserCreatePage.tsx`: renamed component `UserCreate` → `UserCreatePage` to remove the name clash with the imported `UserCreate` type. Updated the route registration in `App.tsx`.
  - `components/RoleGuard.tsx`: split `useCanPerform` into its own file (`components/useCanPerform.ts`) so the component file no longer mixes hook + component exports (clears the `react-refresh/only-export-components` warning). Updated the four import sites.
  - `lib/auth.tsx`: `useAuth()` now returns a safe unauthenticated default (`role: 'viewer'`, `isAuthenticated: false`) when called outside an `AuthProvider` instead of throwing. This restores the test-isolation pattern most page tests rely on; tests needing a specific role can still `vi.mock('@/lib/auth')`.
  - `Dashboard.test.tsx`: added the missing `useReadsPerHour` export to the `useTagReads` mock.
  - `DeviceDetail.test.tsx`: mocked `@/lib/auth` to return an admin user so the role-gated Decommission button renders. Result: 13 test files / 31 tests passing.

### Added
- **Generated API client wiring.** `npm run generate-api` now reads `../TagPulse/openapi.json` (committed in the backend repo via its new `make export-openapi` target). A second script `npm run generate-api:live` still hits a running backend at `http://localhost:8000/openapi.json` for ad-hoc regeneration. The generated client lives at `src/api/generated/` (38 models, 14 services) and is gitignored — regeneration is reproducible from the spec.
  - Existing hand-written `src/api/client.ts` (auth/tenant header injection) and `src/types.ts` are kept; new Sprint 14+ hooks should consume the generated types directly. Existing hooks migrate opportunistically.
  - Fixed the script binary name: `openapi-typescript-codegen` ships a binary named `openapi`, not `openapi-typescript-codegen`. Both scripts now use `openapi`.

### Added
- Project bootstrapped with React 19 + TypeScript + Vite
- Dashboard placeholder page
- Vite proxy config for TagPulse API
- CI pipeline (lint + typecheck + test)
- copilot-instructions.md with React/TypeScript conventions
- **Sprint 9 — Admin UI**
  - Auth context with tenant ID (React context, not localStorage)
  - TenantGuard login gate
  - App layout with sidebar navigation (Ant Design)
  - Overview dashboard with KPI tiles (devices, reads, alerts, anomalies)
  - Drag-and-drop dashboard layout (react-grid-layout)
  - Live event counter via SSE on Dashboard and Telemetry pages
  - Device management: fleet table, detail view with telemetry chart, register form, decommission
  - Telemetry dashboard: multi-device reads/hour chart with time range picker and SSE live updates
  - Data Explorer: form-based query builder with signal strength range filter, table/chart toggle, CSV export
  - Telemetry Models: list, create, delete per-device-type metric schemas
  - Rules management: list with enable toggle, step-based wizard (condition → action → scope → review)
  - Alert history: filterable table with acknowledge action
  - Integration management: list, create with type-specific config (webhook URL, SSE max connections, export schedule/format), enable/disable, delivery log
  - Usage & billing dashboard: daily usage bar chart, quota progress bars, summary table
  - SSE utility for real-time query cache invalidation (wired into Dashboard + Telemetry)
  - API client module with typed wrappers for all backend endpoints
  - TanStack Query hooks for all domains (devices, tag reads, rules, alerts, integrations, analytics, usage, telemetry models, device health)
  - Shared components: KpiTile, DeviceHealthCard, TimeRangePicker
  - Test files for all pages and components (13 test files, 31 tests)
  - Dockerfile + nginx.conf for production deployment
