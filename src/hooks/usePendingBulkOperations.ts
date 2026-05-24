/**
 * Pending bulk-operations hooks (Sprint 48 Phase F — surfaces ADR 028
 * §Governance #4).
 *
 * Backs the admin inbox at `/admin/pending-bulk-operations` plus the
 * Approve / Reject mutations on each queued row. Wraps the generated
 * `BulkOperationsService` so the page stays declarative.
 *
 * Approve/reject invalidate both the inbox list and the tag-registry list
 * because a successful `approve` executes the queued op (typically a CSV
 * import) and inserts/updates registry rows in the same request.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BulkOperationsService } from '@/api/generated/services/BulkOperationsService';
import { TAGS_QUERY_KEY } from '@/hooks/useTags';

export const PENDING_BULK_OPS_QUERY_KEY = 'pending-bulk-operations' as const;

export interface PendingBulkOpsListParams {
  status?: string;
  operation?: string;
  limit?: number;
  offset?: number;
}

export function usePendingBulkOperations(params?: PendingBulkOpsListParams) {
  return useQuery({
    queryKey: [PENDING_BULK_OPS_QUERY_KEY, 'list', params],
    queryFn: () =>
      BulkOperationsService.listPendingBulkOperationsBulkOperationsGet(
        params?.status ?? null,
        params?.operation ?? null,
        params?.limit ?? 100,
        params?.offset ?? 0,
      ),
    // Operator B sits on this page waiting for queued requests to land —
    // poll at the same cadence as the transfer queue so a fresh row from
    // a teammate appears within 30s without a manual refresh.
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
}

export function usePendingBulkOperation(pendingId: string | null) {
  return useQuery({
    queryKey: [PENDING_BULK_OPS_QUERY_KEY, 'detail', pendingId],
    queryFn: () =>
      BulkOperationsService.getPendingBulkOperationBulkOperationsPendingIdGet(
        pendingId as string,
      ),
    enabled: pendingId !== null,
    staleTime: 20_000,
  });
}

export function useApprovePendingBulkOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pendingId: string) =>
      BulkOperationsService.approvePendingBulkOperationBulkOperationsPendingIdApprovePost(
        pendingId,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PENDING_BULK_OPS_QUERY_KEY] });
      // Approving usually executes a CSV import, which mutates the
      // tag registry — refresh the tags cache too.
      qc.invalidateQueries({ queryKey: [TAGS_QUERY_KEY] });
    },
  });
}

export function useRejectPendingBulkOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pendingId: string) =>
      BulkOperationsService.rejectPendingBulkOperationBulkOperationsPendingIdRejectPost(
        pendingId,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PENDING_BULK_OPS_QUERY_KEY] });
    },
  });
}
