import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/api/client';
import { REFETCH_INTERVAL } from '@/lib/constants';

/**
 * Single-fetch hook for the operator landing page (Sprint 54.4).
 *
 * Backed by `GET /dashboard/summary` — one tenant-scoped aggregate
 * powering the eight KPI tiles. The endpoint is point-in-time at
 * `generated_at`; we surface that so tiles can show staleness when
 * the auto-refetch ever pauses (tab backgrounded etc.).
 */
export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardApi.summary(),
    refetchInterval: REFETCH_INTERVAL,
  });
}
