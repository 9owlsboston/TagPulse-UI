# TagPulse-UI

React SPA admin dashboard for the [TagPulse](https://github.com/9owlsboston/TagPulse) IoT platform.

## Quick Start

```bash
npm install
npm run dev          # http://localhost:5173
```

Requires the TagPulse API running on `http://localhost:8000`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (port 5173, proxies API to :8000) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript strict check |
| `npm run test` | Vitest unit tests |
| `npm run check` | lint + typecheck + test |
| `npm run generate-api` | Regenerate typed API client from backend OpenAPI spec |

## Tech Stack

- React 19, TypeScript, Vite
- TanStack Query (data fetching)
- React Router v7 (client-side routing)
- Recharts (charts)
- Ant Design 5 (component library)
- openapi-typescript-codegen (typed API client)

## Architecture

See [TagPulse design doc](https://github.com/9owlsboston/TagPulse/blob/main/docs/design/admin-ui.md).
