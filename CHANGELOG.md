# Changelog

All notable changes to TagPulse-UI will be documented in this file.

## Unreleased

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
