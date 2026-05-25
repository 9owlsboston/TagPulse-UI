# Project: TagPulse-UI

## Overview
React SPA admin dashboard for the TagPulse IoT platform. Provides device management, telemetry dashboards, rule/alert configuration, integration management, and usage analytics. Consumes the TagPulse REST API.

## Tech Stack
- Language: TypeScript (strict mode)
- Framework: React 19
- Build: Vite
- Routing: React Router v7
- Data fetching: TanStack Query
- Components: Ant Design 5
- Charts: Recharts
- API client: auto-generated from OpenAPI spec (openapi-typescript-codegen)
- Testing: Vitest + React Testing Library
- Linting: ESLint + Prettier

## Code Conventions
- Use TypeScript strict mode — no `any`, no implicit returns
- Use functional components with hooks — no class components
- Use TanStack Query for all API data — no manual fetch + useState
- Colocate hooks with pages: `hooks/useDevices.ts` for device API calls
- Use Ant Design components for all UI elements — no custom CSS for layout/forms
- Keep pages thin — extract logic to custom hooks, keep JSX declarative

## Testing Expectations
- Every new component/page must have a test file
- Use React Testing Library — test behavior, not implementation
- Mock API calls via TanStack Query's test utilities
- Run `npm run check` before every PR

## Naming
- Files: PascalCase for components (`DeviceList.tsx`), camelCase for hooks/utilities (`useDevices.ts`)
- Components: PascalCase (`<DeviceList />`)
- Hooks: `use` prefix (`useDevices`, `useTagReads`)
- Types/interfaces: PascalCase (`Device`, `TagRead`)
- Constants: UPPER_SNAKE_CASE
- CSS classes: kebab-case (when needed)

## Do NOT
- Do not use `any` type — use proper types from generated API client
- Do not store auth tokens in localStorage — use React context only
- Do not make raw fetch calls — use generated API client + TanStack Query
- Do not install CSS frameworks — Ant Design handles all styling
- Do not put business logic in components — extract to hooks or utilities
- Do commit `src/api/generated/` (regenerated via `npm run generate-api` from `../TagPulse/openapi.json`; CI does not run codegen, so app code that imports from it requires the files to be in-tree). See `.gitignore` for the canonical note.

## Process & Artifacts
- **Starting a new sprint:** run `scripts/start-sprint.sh <NN> <topic-slug> ["PR title"]`. This is the canonical workflow — it enforces branch naming (`sprint-NN/topic-slug`), creates the draft PR with the standard checklist, and verifies a clean tree. Do not branch + open PRs manually.
- Check TagPulse `docs/design/admin-ui.md` for page specs
- Every PR must update `CHANGELOG.md` under `## Unreleased`
- Run `npm run check` before marking work complete

## Key Docs
- Backend API: http://localhost:8000/docs (FastAPI auto-generated)
- Design: TagPulse/docs/design/admin-ui.md
- Architecture: TagPulse/docs/architecture.md

## Cross-Repo Workflow

TagPulse ships as **two repos**: the backend (`TagPulse` at
`$TAGPULSE_PATH`, default `~/ws/TagPulse`) and this React SPA. The
**backend owns the product roadmap**; this repo consumes the OpenAPI
contract. Both repos share sprint numbers but ship independent PRs.

### Roadmap lives in the backend, not here
- All planning lives in `$TAGPULSE_PATH/docs/roadmap.md`. UI-only items
  are listed there too, tagged `[UI]`.
- This repo has **no** `docs/roadmap.md`. Don't create one.
- `CHANGELOG.md` here is for UI release notes only.
- Sprint numbers are **shared**. "Sprint 54" means the same theme in
  both repos. Each participating repo gets its own `sprint-NN/<topic>`
  branch.

### Three work shapes — route each differently
| Shape | What | Branch |
|---|---|---|
| **Sprint** | Themed multi-day effort tracked in backend `docs/roadmap.md` | `sprint-NN/<topic>` (use `scripts/start-sprint.sh`) |
| **Chore** | Standalone tooling/cleanup, ≤ ~half day, no roadmap impact | `chore/<topic>` (manual branch) |
| **In-flight follow-up** | Mid-sprint discovery that the other repo is missing a piece | `sprint-NN/<topic>-ui-followup` (small focused PR) |

The in-flight follow-up shape is the key. When mid-sprint you discover
the backend needs a change (new endpoint, schema tweak), **don't derail
the active UI branch**: commit/stash what you have, switch to the
backend repo, ship a small focused follow-up PR with the same sprint
number, then resume.

### OpenAPI is the contract handoff
- The generated client under `src/api/generated/` is regenerated from
  `$TAGPULSE_PATH/openapi.json` via `npm run generate-api`.
- When a UI PR consumes new API surface, **record the backend commit
  SHA** the `openapi.json` was regenerated against in the PR
  description (`backend SHA: <sha>`).
- **Merge order** when both repos are involved: backend PR merges
  first (so the contract is live), this UI PR rebases onto the updated
  `openapi.json` before merging.
- Per the existing convention above, do commit `src/api/generated/`
  (CI doesn't regenerate).

### Sprint kickoff — declare cross-repo plan upfront
`scripts/start-sprint.sh` injects a `## Cross-repo plan` section into
the draft PR body. Fill it in even when the answer is "UI only" or
"pending backend SHA" — explicit beats implicit.

The backend's `scripts/start-sprint.sh --with-ui` can drive both branches
in one call when starting a paired sprint from the backend side.

### Backlog
`docs/backlog.md` is the lightweight scratch list for in-flight UI
ideas you don't want to lose but won't pull into the active sprint.
Drain it during sprint planning: promote items to the backend
`docs/roadmap.md` (tagged `[UI]`) or delete.

### Chores are not sprints
Chores branch directly off `main` as `chore/<topic>`. No sprint
number, no roadmap entry, no kickoff script. Open a normal PR with a
CHANGELOG entry and call it done.
