# Sprint 57 — Telemetry & charting + minor renames

> **Status:** planning (draft PR [#68](https://github.com/9owlsboston/TagPulse-UI/pull/68))
> **Branch:** `sprint-57/telemetry-charting`
> **Backend coordination:** TBD, locked during Phase A
> **Roadmap home:** to be added to `TagPulse/docs/roadmap.md` as Sprint 57 once Phase A finishes (Sprints 55 + 56 ship in between)

## Goal

Make the **telemetry surfaces** (Data Explorer, Telemetry Dashboard, asset/device telemetry tabs, dashboard KPI tiles) a coherent, accessible, exportable, operator-grade charting experience — and along the way clean up two information-architecture rough edges from the Sprint 54 nav.

This sprint is paired with the Sprint 54/55 UI-overhaul arc: 54 established design tokens + sectioned nav + the list-page pattern; 55 finishes the list-page conversion; **57 completes the operator UI by giving the telemetry surfaces the same quality bar.**

## Primary users

- Warehouse/floor operator (live telemetry on tablet)
- Inventory/asset manager (historical telemetry on desk)
- Ops/support engineer (Data Explorer for incident triage)

## Phases (proposed)

> Phase **A is mandatory and must finish before any other phase**. It locks library choice + rename plan + backend scope, which all other phases depend on.

### A — 57.1 Charting foundation + rename plan `[UI]`

- **Chart library evaluation.** Build a 1-page comparison of Recharts (current) vs candidates (visx, ECharts, uPlot, AntD Charts). Criteria: bundle size, a11y (keyboard nav, screen-reader summaries, focus rings), perf on 10k-point time series, theming hook (must respect our design tokens), export-to-PNG support, license. **Decision recorded in this doc.**
- **Time-range picker UX audit.** Catalog current `<TimeRangePicker>` usages, draft the unified presets (Last 15m / 1h / 24h / 7d / 30d / Custom) + timezone-display behaviour.
- **Rename plan.**
  - Nav: **"Devices & Connections" → "Devices & Telemetry"** (`src/lib/nav.tsx` line 114).
  - Page: **"Alerts History" → "Alerts"** (page title; also retire the redundant top-level "Alerts" if it duplicates).
  - Document any callers that hardcode these strings (tests, docs).
- **Backend scope lock.** Decide if telemetry phases need new aggregate endpoints (e.g. `/devices/{id}/telemetry/summary`, sparkline-friendly downsampled series) or can fan-out from existing endpoints. Open the paired backend planning issue if yes.
- **Pass bar:** library decision committed; rename inventory in this doc lists every file/test/doc to touch; backend coordination shape decided + recorded in PR #68 `## Cross-repo plan`.

### B — 57.2 Renames `[UI]`

Smallest, lowest-risk phase — ships first so the new names are stable before chart work lands on top.

- Apply the two renames from Phase A; update tests + screenshots + CHANGELOG.
- Add deep-link redirects for any URL paths that move (likely none; both are label-only).
- **Pass bar:** `npm run check` clean; nav screenshot in PR body shows new label; alert-history page title updated; no broken test labels.

### C — 57.3 Time-range picker + chart primitives `[UI]`

- Unified `<TimeRangePicker>` per Phase A spec (presets + custom + tz display).
- Shared chart wrappers: `<TpLineChart>`, `<TpSparkline>`, `<TpAreaChart>` (or equivalent in the chosen library). Respects design tokens for axis/grid/series colours; built-in empty/loading/error states.
- Chart export utility (PNG + CSV) factored out for reuse.
- Chart accessibility primitives: keyboard nav on data points, screen-reader summary (`<figcaption>` style data summary), color-blind safe palette default.
- **Pass bar:** primitives have Storybook-style demo route under `/dev/`; a11y axe-core check passes; export emits valid PNG + CSV.

### D — 57.4 Data Explorer revamp `[UI]`

- Apply chart primitives + new time-range picker.
- Add chart export (PNG + CSV); CSV already exists, factor through new util.
- Refine table↔chart `<Segmented>` toggle.
- Performance: virtualize at >500 rows.
- **Pass bar:** existing tests pass; new export tests; tablet visual review.

### E — 57.5 Telemetry Dashboard + asset/device telemetry tabs `[UI]`

- Telemetry Dashboard: rework aggregate cards (reads/hour trend, device-mix donut, geographic distribution) using new primitives.
- Asset telemetry tab: signal history + dwell-time chart.
- Device telemetry tab: reads/hour + signal distribution + uptime sparkline.
- **Pass bar:** all three surfaces match design tokens + a11y bar; tablet review; export works on each.

### F — 57.6 Dashboard KPI tile sparklines `[UI]`

- Add inline `<TpSparkline>` (7-day trend) to each of the 8 dashboard tiles, fed by a new lightweight downsampled-series endpoint **or** client-side from existing data (decided in Phase A).
- **Pass bar:** 8 tiles render sparklines in both themes; no perceptible Dashboard-load regression (Lighthouse Perf still ≥90).

### G — 57.7 Polish + measurement + roadmap update `[UI]`

- Tablet sweep across all touched surfaces.
- Lighthouse Perf ≥90 / A11y ≥95 on Data Explorer + Telemetry Dashboard + Asset telemetry + Device telemetry, both themes.
- Promote Sprint 57 entry from this doc → backend `docs/roadmap.md` as shipped.
- **Pass bar:** Lighthouse numbers recorded in PR #68 body; CHANGELOG entries land under `## Unreleased`.

## Out of scope

- Non-time-series chart types (treemaps, sankey, network graphs) — open a backlog item if a use case emerges.
- Phone responsive (<768 px).
- New telemetry data sources / new device types.
- Rule-engine changes; alert-rule UI changes beyond the page title rename.
- Internationalisation; RTL.
- Any backend-only work not strictly required to support the UI changes (defer to a backend-led sprint).
- The 14 admin list pages — those remain Sprint 56's scope.

## Sequencing risk

This sprint **deliberately depends on Sprints 55 + 56 having shipped first** so the list-page pattern + admin pages are stable. If 55/56 slip, defer telemetry-charting kickoff rather than rebasing across two unstable surfaces.

## Cross-repo plan

Locked in Phase A; until then, [PR #68](https://github.com/9owlsboston/TagPulse-UI/pull/68) `## Cross-repo plan` reads `TBD — pending Phase A scope lock`.

If new endpoints are required, the backend ships them first under `sprint-57/telemetry-charting` in `TagPulse`, and this PR records the backend SHA + regenerates `src/api/generated/` before merging.
