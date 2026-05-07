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
- Do not commit generated API client files (`src/api/generated/`)

## Process & Artifacts
- **Starting a new sprint:** run `scripts/start-sprint.sh <NN> <topic-slug> ["PR title"]`. This is the canonical workflow — it enforces branch naming (`sprint-NN/topic-slug`), creates the draft PR with the standard checklist, and verifies a clean tree. Do not branch + open PRs manually.
- Check TagPulse `docs/design/admin-ui.md` for page specs
- Every PR must update `CHANGELOG.md` under `## Unreleased`
- Run `npm run check` before marking work complete

## Key Docs
- Backend API: http://localhost:8000/docs (FastAPI auto-generated)
- Design: TagPulse/docs/design/admin-ui.md
- Architecture: TagPulse/docs/architecture.md
