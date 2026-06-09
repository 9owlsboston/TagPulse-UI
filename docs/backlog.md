# Backlog (UI)

Lightweight scratch list for **in-flight UI ideas** you don't want to
lose but won't pull into the active sprint. See
`.github/copilot-instructions.md` § Cross-Repo Workflow for the model.

## How to use this file

- Add a line whenever you notice something mid-work that's out of scope.
- Don't edit existing sprints/PRs to absorb the idea.
- Drain this file during sprint planning: each item either
  - gets promoted to the **backend** `docs/roadmap.md` (tagged `[UI]`,
    since that file is the cross-repo source of truth), or
  - gets a `chore/<topic>` branch (small standalone PR), or
  - gets deleted (was a fleeting thought).

Format per entry: `- [YYYY-MM-DD] <one-line description> [tag]`
Tags: `[ui]`, `[ux]`, `[a11y]`, `[perf]`, `[deps]`, `[idea]`.

## Open items

<!-- Add new items above this line. Oldest at bottom; remove when drained. -->

- [2026-06-09] **Sprint 58 chart wrapper Phase C follow-ups — synced cursor + threshold reference lines + brush.** Items 5–7 from the Sprint 58 Recharts tip review, deliberately deferred so they can ship as a focused follow-up sprint instead of bloating the visual-polish PR. (5) Plumb `syncId` through `<TpLineChart>` / `<TpAreaChart>` so multiple charts on the Telemetry Dashboard share a Power-BI-style hover cursor — needs a sync-key convention and an opt-out story for unrelated charts on the same page. (6) Add `referenceLines?: TpReferenceLine[]` prop (`{value, label, severity: 'danger'|'warning'|'neutral'}`) backed by semantic colour tokens — for alert thresholds, MACC quota lines, capacity caps. Need both axis variants (horizontal y-value and vertical timestamp) and dashed-stroke styling that survives the new `axisLine={false}` axis cleanup. (7) Add `enableBrush?: boolean` (Recharts `<Brush>`) for high-cardinality time-range zoom on Tag Reads + Telemetry Dashboard — main consumer ask is "drag-select a 10-minute slice from the 24h view without rebuilding the URL state". Each item wants its own design + consumer-driven validation; promote as a single Sprint 5X to backend `docs/roadmap.md` (tagged `[UI]`) when planning. [ui]
- [2026-05-25] **Sprint 57 §57.G re-run — Lighthouse + tablet sweep.** Deferred from PR #68 Phase G with the same rationale as §55.C: realistic tenant data + continuously-running tag/device simulators aren't available, so Lighthouse Perf ≥90 / A11y ≥95 numbers and operator-task tablet timings are noise-dominated and not comparable to a baseline that was never captured at the Sprint 54 kickoff SHA. Fold into the §55.C / §56.B re-run when the simulator sprint above lands: capture Lighthouse Perf + A11y on Data Explorer / Tag Reads + Telemetry Dashboard + Asset telemetry tab + Device telemetry tab in both themes, plus an operator tablet sweep across the Phase D/E/F surfaces. Record numbers on PR #68 in a follow-up doc. [perf]

- [2026-05-25] **Sprint 57 Phase E follow-up — non-time-series chart primitives.** The Phase E spec named aspirational visuals (device-mix donut, signal-strength histogram, dwell-time distribution, uptime sparkline, geographic distribution) that need primitives the wrapper layer doesn't have yet: `<TpDonut>`, `<TpHistogram>`/`<TpBarChart>`, `<TpGeoMap>`. "Non-time-series charts" is also in the Sprint 57 out-of-scope list, so PR #68 deliberately ships Phase E narrow (just wires existing `<TpLineChart>` export on the three telemetry tabs). When operator demand surfaces for any of these visuals: scope each as its own primitive sprint (one wrapper at a time, axe-tested, playground entry, palette via `tokens[mode].chartSeries`) and only then build the consumer pages. Promote to backend `docs/roadmap.md` as `[UI]` when planning. [ui]

- [2026-05-25] **Sprint 57 follow-up — `<TpLineChart>` uPlot swap (Phase C.6.1).** PR #68's Phase C.6 perf harness at `/dev/charts` (50 series × 720 points, 3s programmatic mousemove sweep) measured **Avg 53.4 fps / Min 2.7 fps** against the §A.1.1 swap-trigger budget (Avg ≥60, Min ≥30). Recharts misses both gates — Min especially (single ~370ms jank frame during the sweep). Swap `<TpLineChart>` internals to uPlot behind the unchanged wrapper contract (props, exports, a11y, series filter, hierarchical axis all stay) so no consumer migrations are needed; re-run the harness and confirm Avg ≥60 / Min ≥30. Ship as its own focused PR so the perf swap is independently reviewable and revertable. Promote to backend `docs/roadmap.md` as `[UI]` when planning the next sprint. [perf]
- [2026-05-25] Sprint proposal: **simulation data + device simulators**. End-to-end UI walkthroughs (find asset by EPC, triage open alert, debug offline reader) are blocked by empty/sparse demo data. Need a seeded multi-tenant fixture (assets, tags, sites/zones, devices, reads, alerts, audit logs) **and** a runnable reader/heartbeat simulator that produces live telemetry + occasional offline events. Promote to backend `docs/roadmap.md` as `[backend]` (seed fixture + simulator service) with `[UI]` companion task (a dev-only "Reset demo data" button or doc snippet). [idea]
- [2026-05-25] Re-run Sprint 55 §55.C measurement (5-task stopwatch + Lighthouse Perf≥90/A11y≥95 on Dashboard/Assets/Devices/Alerts in light+dark) once realistic tenant data + a continuously-running tag/device simulator are available. Deferred from PR #69 because (a) the sprint-54 kickoff baseline was never captured per PR #66's `TBD` placeholders, and (b) stopwatch + Lighthouse Perf are low-signal on empty dev data. When data is ready: capture baseline at `sprint-54/ui-overhaul-foundation` kickoff SHA, after-numbers on the merged sprint-55 commit, record both in a follow-up doc. [perf]
