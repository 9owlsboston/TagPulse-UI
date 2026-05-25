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

- [2026-05-25] Sprint proposal: **simulation data + device simulators**. End-to-end UI walkthroughs (find asset by EPC, triage open alert, debug offline reader) are blocked by empty/sparse demo data. Need a seeded multi-tenant fixture (assets, tags, sites/zones, devices, reads, alerts, audit logs) **and** a runnable reader/heartbeat simulator that produces live telemetry + occasional offline events. Promote to backend `docs/roadmap.md` as `[backend]` (seed fixture + simulator service) with `[UI]` companion task (a dev-only "Reset demo data" button or doc snippet). [idea]
- [2026-05-25] Re-run Sprint 55 §55.C measurement (5-task stopwatch + Lighthouse Perf≥90/A11y≥95 on Dashboard/Assets/Devices/Alerts in light+dark) once realistic tenant data + a continuously-running tag/device simulator are available. Deferred from PR #69 because (a) the sprint-54 kickoff baseline was never captured per PR #66's `TBD` placeholders, and (b) stopwatch + Lighthouse Perf are low-signal on empty dev data. When data is ready: capture baseline at `sprint-54/ui-overhaul-foundation` kickoff SHA, after-numbers on the merged sprint-55 commit, record both in a follow-up doc. [perf]
