import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/api/client';
import { REFETCH_INTERVAL } from '@/lib/constants';

/**
 * Sprint 57 Phase F — companion to `useDashboardSummary`.
 *
 * Single-fetch hook backing the inline `<TpSparkline>` chips on each
 * Dashboard KPI tile. Backed by `GET /dashboard/sparklines` (backend
 * Phase 57.6); `tiles` is keyed by the same tile `id` strings used in
 * `src/pages/Dashboard.tsx` so the client wire-up is a direct lookup.
 *
 * Defaults (7 days × 6h buckets → 28 points) match the backend defaults
 * and the spec in `docs/sprint-57-telemetry-charting.md`.
 */
export function useDashboardSparklines(days = 7, bucketHours = 6) {
  return useQuery({
    queryKey: ['dashboard', 'sparklines', days, bucketHours],
    queryFn: () => dashboardApi.sparklines(days, bucketHours),
    refetchInterval: REFETCH_INTERVAL,
  });
}
