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
  - Device management: fleet table, detail view with telemetry chart, register form, decommission
  - Telemetry dashboard: multi-device reads/hour chart with time range picker
  - Data Explorer: form-based query builder with CSV export
  - Telemetry Models: list, create, delete per-device-type metric schemas
  - Rules management: list with enable toggle, step-based editor (threshold/absence/rate_change)
  - Alert history: filterable table with acknowledge action
  - Integration management: list, create, enable/disable, delivery log
  - Usage & billing dashboard: daily usage bar chart, quota progress bars, summary table
  - SSE utility for real-time query cache invalidation
  - API client module with typed wrappers for all backend endpoints
  - TanStack Query hooks for all domains (devices, tag reads, rules, alerts, integrations, analytics, usage, telemetry models, device health)
  - Shared components: KpiTile, DeviceHealthCard, TimeRangePicker
  - Test files for all pages using React Testing Library
