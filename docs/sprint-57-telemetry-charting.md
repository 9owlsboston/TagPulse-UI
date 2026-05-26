# Sprint 57 — Telemetry & charting + minor renames

> **Status:** Phase A complete; Phase B next (draft PR [#68](https://github.com/9owlsboston/TagPulse-UI/pull/68))
> **Branch:** `sprint-57/telemetry-charting`
> **Backend coordination:** **single small backend PR required before Phase F** (new `/dashboard/sparklines` endpoint). Phases B–E are UI-only. See "Phase A — outcomes" below.
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

---

## Phase A — outcomes

_Recorded 2026-05-25 during PR #68 rebase + kickoff. Phase B is unblocked._

### A.1 — Chart library decision: **stay on Recharts**

Surveyed callers (`grep "from 'recharts'"`):

| File | Charts used |
|---|---|
| [src/pages/telemetry/DataExplorer.tsx](src/pages/telemetry/DataExplorer.tsx) | LineChart |
| [src/pages/telemetry/TelemetryDashboard.tsx](src/pages/telemetry/TelemetryDashboard.tsx) | LineChart |
| [src/pages/devices/DeviceTelemetryTab.tsx](src/pages/devices/DeviceTelemetryTab.tsx) | LineChart |
| [src/components/SubjectTelemetryTab.tsx](src/components/SubjectTelemetryTab.tsx) | LineChart |
| [src/pages/inventory/ProductDetail.tsx](src/pages/inventory/ProductDetail.tsx) | BarChart |
| [src/pages/admin/UsageDashboard.tsx](src/pages/admin/UsageDashboard.tsx) | BarChart |

Recharts is already isolated in [vite.config.ts](vite.config.ts) `manualChunks` (Sprint 36 / #24); pinned at `^2.14` in [package.json](package.json).

**Rationale for staying:**

- **Switching cost is real, current pain is hypothetical.** Six call sites to rewrite, chunk strategy to retune, snapshot/component tests to redo, and we have no current bug, perf complaint, or a11y audit failure attributable to Recharts. The criteria in §A (bundle, perf @ 10k points, a11y, theming hook, PNG export, license) are all _potential_ asks against future use cases — every candidate (visx, ECharts, uPlot, AntD Charts) wins on at least one axis and loses on others; no clear dominator.
- **The wrapper layer is the actual sprint deliverable.** `<TpLineChart>`, `<TpSparkline>`, `<TpAreaChart>` give us the contract (token-respecting palette, a11y description, empty/loading/error, export hook). Behind the contract we can swap libraries in a future sprint at the cost of one PR if a real driver appears (e.g. >10k-point series triggering jank — uPlot would be the obvious answer).
- **Accessibility gap is addressable in-place.** Recharts ships ARIA props on `<LineChart>` / `<Bar>` (`accessibilityLayer`, `role`, `aria-label`) in 2.13+; we'll add a sibling `<figcaption>`-style data summary in the wrapper for SR users regardless of underlying library.

**Decision:** retain Recharts. Phase C ships wrappers; revisit library choice only if a measured driver emerges.

#### A.1.1 — Amendment (2026-05-25, post-review)

User compared the current Telemetry page (cluttered date axis, every-device-as-legend-row at the bottom, no time-window navigation) to Azure Monitor's metric chart (hierarchical "6 PM / May 24 / 6 AM / 12 PM / `UTC-07:00`" axis, side arrows to step the window, chip filter up top). Three concrete asks:

1. Cleaner axis labels (breadcrumb style; don't repeat the date on every tick).
2. Prev/next arrows around the time window.
3. Filter UI at the top that scales to thousands of devices (current bottom legend doesn't).

**Honest read:** none of these force a library swap — all three are wrapper / chrome work on top of Recharts. But they are real UX gaps in current code, so they get pulled into the wrapper contract here rather than discovered ad-hoc in Phase C:

| Ask | Recharts mechanism | Goes in |
|---|---|---|
| Hierarchical axis | `tickFormatter` + custom `interval` that emits time-of-day for intra-day ticks and date-only on day boundaries; static `UTC±HH:MM` label in chart corner | `<TpLineChart>` axis preset |
| Prev/next time stepper | `<TimeRangePicker>` chrome — buttons shift `(start, end)` by the active window width; disabled when stepping past "now" | A.2 spec (added below) |
| High-cardinality device filter | Replace `<Legend>` with a top-of-chart AntD `Select mode="multiple"` (virtualized, searchable). Chart renders only selected series; small "+N more" overflow chip in chart corner shows hidden series count | `<TpLineChart>` `seriesFilter` prop |

**Performance budget added to Phase C.** Before merging wrappers, run a Phase C spike with synthetic data at **50 visible series × 720 points (15-min buckets × 7 days)** and require sustained 60fps on hover/pan in Chrome on the dev laptop. If Recharts (SVG) fails this budget, swap to **uPlot** (canvas, ~50× faster on multi-series) behind the same wrapper contract before Phase D starts. This makes the library decision _measurable_ instead of speculative — and we still pay the swap cost only if real data demands it.

**Out of scope for this sprint** (parked for a future sprint, not a library issue either): drag-to-zoom brush selection (`dataZoom`-style) and shared-crosshair "hover-anywhere-see-all-values" tooltips. Both are doable on Recharts but expand Phase C beyond what the sprint window absorbs. Filed in [docs/backlog.md](docs/backlog.md) when Phase C lands.

### A.2 — Time-range picker spec

Current [src/components/TimeRangePicker.tsx](src/components/TimeRangePicker.tsx) has 4 callers, all using the same `(start: string, end: string) => void` ISO callback:

- [src/pages/telemetry/DataExplorer.tsx](src/pages/telemetry/DataExplorer.tsx)
- [src/pages/telemetry/TelemetryDashboard.tsx](src/pages/telemetry/TelemetryDashboard.tsx)
- [src/pages/devices/DeviceTelemetryTab.tsx](src/pages/devices/DeviceTelemetryTab.tsx)
- [src/components/SubjectTelemetryTab.tsx](src/components/SubjectTelemetryTab.tsx)

Current presets: `1h, 6h, 24h, 7d, Custom`. New unified presets per planning doc:

| Value | Label |
|---|---|
| `15m` | Last 15 minutes |
| `1h` | Last hour |
| `24h` | Last 24 hours |
| `7d` | Last 7 days |
| `30d` | Last 30 days |
| `custom` | Custom |

Changes in Phase C:

- Add `15m` and `30d`, drop `6h` (low signal; covered by 1h / 24h).
- Display the active timezone next to the picker (e.g. `(UTC-05:00)`) sourced from `Intl.DateTimeFormat().resolvedOptions().timeZone`. ISO strings on the wire are unchanged.
- Default preset stays `24h`.
- Callback signature is unchanged → all 4 callers compile without edits.
- Move presets into an exported constant so Storybook-style demo + tests share the source of truth.
- **Prev/next stepper buttons** (added per A.1.1): two arrow buttons flanking the preset selector that shift the active window by its own width (e.g. on 24h, jump back / forward 24h). Disabled forward arrow when stepping would cross `now`. Custom range steps by `(end - start)`. Emits the same `(start, end)` callback; no new prop on the callback contract.

### A.3 — Rename inventory (Phase B input)

**Nav: "Devices & Connections" → "Devices & Telemetry"**

| File | Line | Change |
|---|---|---|
| [src/lib/nav.tsx](src/lib/nav.tsx) | 114 | `label: 'Devices & Connections'` → `'Devices & Telemetry'` |
| [src/components/Layout.test.tsx](src/components/Layout.test.tsx) | 115 | `getByText('Devices & Connections')` → `'Devices & Telemetry'` |
| [src/components/Layout.tsx](src/components/Layout.tsx) | 35 | doc comment — update for consistency |
| [src/components/Layout.test.tsx](src/components/Layout.test.tsx) | 8 | doc comment — update for consistency |

Section key `sec-devices-connections` is internal (URL-invisible) — left as-is to avoid touching `defaultOpenKeys` localStorage lookups in `<Layout>`. No deep-link redirect needed (label-only change).

**Page: "Alert History" → "Alerts"**

| File | Line | Change |
|---|---|---|
| [src/pages/rules/AlertHistory.tsx](src/pages/rules/AlertHistory.tsx) | 202 | `title="Alert History"` → `title="Alerts"` |
| [src/pages/rules/AlertHistory.test.tsx](src/pages/rules/AlertHistory.test.tsx) | 29 | `getByText('Alert History')` → `'Alerts'` |

The nav already shows "Alerts" ([src/lib/nav.tsx](src/lib/nav.tsx) L71); the page title was the only mismatch. `countTestId="alert-history-title-count"` and the component/file name `AlertHistory` stay (internal identifiers; renaming the file would inflate the diff with no operator-visible benefit). Route `/alerts` is unchanged.

### A.4 — Backend scope lock

| Phase | Endpoints needed | Backend PR? |
|---|---|---|
| B (renames) | none | no |
| C (TimeRangePicker + chart primitives) | none | no |
| D (Data Explorer revamp) | existing `/telemetry/readings`, `/telemetry/aggregates`, `/tag-reads/reads-per-hour` | no |
| E (Telemetry Dashboard + asset/device tabs) | existing `/telemetry/aggregates`, `/telemetry/{device_id}/recent-reads`, `/device-health/{device_id}` | no |
| **F (Dashboard KPI sparklines)** | **new** `GET /dashboard/sparklines?days=7` | **yes — small backend PR** |
| G (polish) | none | no |

**Phase F endpoint shape (proposed; finalise in backend sprint-57 PR):**

```
GET /dashboard/sparklines?days=7
→ {
    "devices_online":   { "series": [{ "t": "ISO8601", "v": int }, ...], "trend": "up"|"down"|"flat" },
    "open_alerts":      { "series": [...], "trend": "..." },
    "reads_per_hour":   { "series": [...], "trend": "..." },
    "assets":           { ... },
    "tags":             { ... },
    "locations":        { ... },
    "low_stock":        { ... },
    "integrations":     { ... }
  }
```

Each series is downsampled to ~24 points (4-hour buckets × 7 days). One round-trip per Dashboard load, cacheable backend-side for ~5 min. Tile keys exactly match the existing [src/pages/Dashboard.tsx](src/pages/Dashboard.tsx) `TILES` ids so the client wire-up is trivial.

**Why not fan-out client-side from existing endpoints:** would mean 8 concurrent queries on Dashboard mount (`/tag-reads/reads-per-hour` for 7-day windows × 8 tiles, with different aggregation shapes per tile). Heavier on the network, harder to cache, and `low_stock_count` / `integrations_active` have no time-series endpoint at all — they'd require new backend work either way.

**Coordination:** when Phase F starts, open paired backend PR `sprint-57/telemetry-charting` in `TagPulse`. Backend merges first; this PR records the backend SHA in PR #68 description and regenerates `src/api/generated/`.

### A.5 — Phase B unblocked

Phase B (renames) ships immediately as a small focused commit on this branch. Then Phase C (chart primitives) lands without backend dependency. Phase F waits on the backend PR.
