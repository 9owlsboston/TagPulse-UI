// Sprint 25 C2 — route pattern normalization (separated from RouteTracker.tsx
// to satisfy `react-refresh/only-export-components`).

const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const NUMERIC_ID_RE = /\/(\d{3,})(?=\/|$)/g;

export function normalizeRoutePattern(pathname: string): string {
  return pathname.replace(UUID_RE, ':id').replace(NUMERIC_ID_RE, '/:id');
}
