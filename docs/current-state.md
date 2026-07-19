# Current state — TagPulse-UI

> **Snapshot:** 2026-07-19. The single, always-current answer to *"where is this
> project right now?"* — a **supplement to the README**, not a design-doc rollup.
> Lead with a human summary (a short plain-English paragraph a newcomer reads
> top-to-bottom *without* opening links, then a diagram); keep the rest thin —
> one line per area + **links** to the authoritative topic docs. On any conflict,
> the linked topic doc wins. Update this doc and bump the snapshot date as the
> **last step** of any change that moves the current state.

## Summary

TagPulse-UI is the **React 19 + TypeScript admin dashboard** for the TagPulse IoT
platform — a Vite-built single-page app that RFID/asset operators and platform admins
use to manage devices and assets, watch live telemetry, configure rules and
integrations, and run inventory reconciliation. It is a pure **frontend consumer** of
the TagPulse REST API: the backend (a sibling repo, `~/ws/TagPulse`) owns the product
roadmap and the OpenAPI contract, and this repo regenerates a typed client
(`src/api/generated/`) from it. Data fetching goes through TanStack Query hooks, UI is
Ant Design 5, and charts are Recharts.

Where it stands today: this is a **mature, actively-shipped app** (100+ merged PRs,
~20 feature pages under `src/pages/`, 29 hooks, a broad Vitest suite gated by
`npm run check`). Recent sprints focused on Excel-style column sort/filter across the
list tables, server-side facets for Tag Reads/Assets, server-persisted dashboard card
layout, and hardening SPA stale-chunk recovery on Azure Static Web Apps. It has just
adopted the dev-env-setup guardrail toolkit (this snapshot's occasion), so the agent
contract (`AGENTS.md`) and history/execution-log scaffolding are new.

## Diagram

<!-- TODO: a high-level boxes-and-arrows view directly under the summary — the
visual half of the summary layer. Source it in docs/diagrams/ (Mermaid inline, or a
committed .drawio/.excalidraw) so it stays diffable, then link/embed it here.
Example:  ![context](diagrams/context.excalidraw.svg) -->

_No diagram yet — add one under `docs/diagrams/` when the architecture warrants it._

## Current state

One line per area, each linking to the doc that owns the detail. (The prose
summary above already gives the picture; these are drill-down pointers.)

- **App shell & routing** — React Router v7 client-side routes, lazy-loaded pages with
  stale-chunk auto-reload. See `src/lib/routes.ts`, `src/lib/lazyWithReload.ts`.
- **API client** — typed fetch client generated from the backend OpenAPI spec; consumed
  via TanStack Query hooks in `src/hooks/`. Regenerate with `npm run generate-api`.
- **Feature pages** — assets, devices, tags/tag-reads, telemetry, rules, integrations,
  inventory/reconciliation, transfers, categories, admin. See `src/pages/`.
- **Deployment** — Docker/nginx image + Azure Static Web Apps. See
  [`docs/azure-deploy.md`](azure-deploy.md).
- **Backlog / in-flight ideas** — [`docs/backlog.md`](backlog.md); roadmap lives in the
  backend `TagPulse/docs/roadmap.md` (UI items tagged `[UI]`).

## Future state / vision

Where this is heading — the target the current work is closing the gap toward.

- Continue the Excel-style filter/sort rollout and server-side facet coverage across the
  remaining tables (tracked in the backend roadmap).
- Keep the UI in lockstep with the evolving TagPulse OpenAPI contract (shared sprint
  numbers, backend-first merge order).

## Open gaps

The known deltas between current and future state (the remediation backlog).

- No architecture/context diagram yet under `docs/diagrams/` (see the Diagram section).
- `docs/design/`, `docs/guides/`, `docs/reference/` are not yet established — the repo is
  on the **xs** toolkit profile; grow into them (re-run bootstrap at a higher profile) if
  the doc surface warrants.
- Standing in-flight UI ideas live in [`docs/backlog.md`](backlog.md); drain during
  sprint planning.
