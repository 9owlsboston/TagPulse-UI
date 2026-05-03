# Changelog

All notable changes to TagPulse-UI will be documented in this file.

## Unreleased

### Added
- **Sprint 14 (1/2) — Device detail: Telemetry & Location tabs**
  - Type extensions for migration 016: `TagReadResponse` gains optional `latitude`, `longitude`, `location_accuracy_m`, `location_source`, `epc`, `epc_hex`, `epc_scheme`, `epc_decoded`, `tid`, `user_memory_hex`, `tag_data`, `reader_antenna`. New `Location`, `Identity`, `LocationSource`, `DeviceTelemetryReading`, `TelemetryReadingCreate`, `TelemetryBatch` types.
  - New API surface: `telemetryApi.list()` → `GET /telemetry` (filterable by device + metric + time range) and `useDeviceTelemetry()` hook.
  - Device detail **Overview tab — "Last Read" panel**: surfaces `tag_id`, `timestamp`, `epc`, `epc_scheme` (badge), `tid`, `reader_antenna`, `signal_strength`, `latitude/longitude (source)`. Conditionally renders `epc_decoded` and `tag_data` JSON blocks.
  - Device detail **Telemetry tab — rebuilt**: per-`metric_name` selector populated from the device's telemetry model; time-range picker; unit-aware Y-axis label; model min/max applied to Y domain; "source: tag" badge with count when readings carry `metadata.source='tag'` (per [rfid-tag-data-model.md §7](../TagPulse/docs/design/rfid-tag-data-model.md)). Empty-state when no model is defined for the device type.
  - Device detail **new Location tab**: last-known lat/lon descriptions panel; Leaflet mini-map with OSM tiles (provider-agnostic resolver lands in Sprint 17a per [geofencing-and-map.md §11 Q4](../TagPulse/docs/design/geofencing-and-map.md)); marker popup + accuracy radius `Circle` when `location_accuracy_m` is present; default Leaflet marker icon paths rewired to imported assets (Vite-safe).
  - New deps: `leaflet`, `react-leaflet`, `@types/leaflet` (~40 KB gzip per ADR-007).

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
