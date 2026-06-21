import { useQuery } from '@tanstack/react-query';
import { TagsService } from '@/api/generated/services/TagsService';

export type ReconciliationView =
  | 'registered-unread'
  | 'unregistered-reading'
  | 'bindings-on-retired';

/**
 * Sprint 47 Phase E — reconciliation views (ADR 028 §Governance #5).
 *
 * Read-only exception views over the tag registry. The backend returns a
 * bare array of view-specific rows (`RegisteredUnreadRow`,
 * `UnregisteredReadingRow`, `BindingOnRetiredRow`) — the generated client
 * types the response as `any` because the FastAPI handler is a union, so
 * the hook leaves typing to the caller via a generic.
 *
 * `days` is ignored by the `bindings-on-retired` view per the Sprint 50
 * Phase E contract; the hook still forwards it (server tolerates it) so we
 * don't need a branch here.
 */
export const RECONCILIATION_QUERY_KEY = 'tag-reconciliation' as const;

export interface ReconciliationParams {
  view: ReconciliationView;
  days?: number;
  q?: string;
  limit?: number;
  offset?: number;
}

export function useReconciliation<TRow>(params: ReconciliationParams) {
  const { view, days, q, limit, offset } = params;
  return useQuery<TRow[]>({
    queryKey: [RECONCILIATION_QUERY_KEY, view, days ?? 30, q ?? '', limit ?? 100, offset ?? 0],
    queryFn: () =>
      TagsService.getReconciliationViewTagsReconciliationViewGet(
        view,
        days ?? 30,
        limit ?? 100,
        offset ?? 0,
        q ?? null,
      ) as unknown as Promise<TRow[]>,
    refetchInterval: 60_000,
    staleTime: 45_000,
  });
}
