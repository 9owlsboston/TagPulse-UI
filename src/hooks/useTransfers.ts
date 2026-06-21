/**
 * Tag-transfer hooks (Sprint 46 Phase D — surfaces ADR 028 §Transfers).
 *
 * The transfer endpoints live on `TagsService` server-side
 * (`/tag-transfers`), but cache them under a separate key root so
 * invalidating after a status PATCH on a tag doesn't gratuitously
 * refetch the transfer history and vice versa.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TagsService } from '@/api/generated/services/TagsService';
import type { TagTransferRequest } from '@/api/generated/models/TagTransferRequest';
import type { TagTransferResponse } from '@/api/generated/models/TagTransferResponse';
import { TAGS_QUERY_KEY } from '@/hooks/useTags';

export const TRANSFERS_QUERY_KEY = 'tag-transfers' as const;

export interface TransferListParams {
  direction?: 'inbound' | 'outbound';
  status?: TagTransferResponse.status | string;
  statuses?: string[];
  epc_q?: string;
  sort?: string;
  order?: string;
  limit?: number;
  offset?: number;
}

// Backend accepts the short wire values `in` / `out` (regex
// `^(in|out)$`); the UI uses the more readable `inbound` / `outbound`
// in state and labels. Translate at the call site only.
const DIRECTION_WIRE: Record<'inbound' | 'outbound', 'in' | 'out'> = {
  inbound: 'in',
  outbound: 'out',
};

export function useTransfers(params?: TransferListParams) {
  return useQuery({
    queryKey: [TRANSFERS_QUERY_KEY, 'list', params],
    queryFn: () =>
      TagsService.listTagTransfersTagTransfersGet(
        params?.direction ? DIRECTION_WIRE[params.direction] : null,
        params?.status ?? null,
        params?.statuses ?? null,
        params?.epc_q ?? null,
        params?.sort ?? null,
        params?.order ?? 'desc',
        params?.limit ?? 100,
        params?.offset ?? 0,
      ),
    // Transfers are operator-initiated and counterparty-completed; the
    // receiving-tenant ack flips status from `requested` → `completed`
    // out of band, so we poll on a modest cadence to surface that flip
    // without a manual refresh.
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
}

export function useCreateTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TagTransferRequest) =>
      TagsService.createTagTransferTagTransfersPost(body),
    onSuccess: () => {
      // A new transfer-out row is invisible in the registry until the
      // counterparty acks, but the source tag's audit metadata may
      // refresh — invalidate both caches to be safe.
      qc.invalidateQueries({ queryKey: [TRANSFERS_QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [TAGS_QUERY_KEY] });
    },
  });
}
