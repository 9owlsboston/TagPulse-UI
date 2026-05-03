# Changelog

All notable changes to TagPulse-UI will be documented in this file.

## Unreleased

### Added
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
