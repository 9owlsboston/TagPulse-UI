/**
 * Tag registry hooks (Sprint 44 Phase B — surfaces the ADR 028 backend).
 *
 * Wraps the generated `TagsService` so call-sites stay short and
 * react-query cache keys stay consistent across the tag-registry pages.
 *
 * The TagsService also owns transfers (`/tag-transfers`) and the bulk
 * import/patch/retire endpoints — those hooks land in Phases C/D/F. This
 * module covers Phase B only: list + single-row read + PATCH.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TagsService } from '@/api/generated/services/TagsService';
import type { TagResponse } from '@/api/generated/models/TagResponse';
import type { TagUpdate } from '@/api/generated/models/TagUpdate';

/** Cache-key root for everything tag-registry related. */
export const TAGS_QUERY_KEY = 'tags' as const;

export interface TagListParams {
  status?: string;
  epc_prefix?: string;
  bound?: boolean;
  q?: string;
  limit?: number;
  offset?: number;
}

export function useTags(params?: TagListParams) {
  return useQuery({
    queryKey: [TAGS_QUERY_KEY, 'list', params],
    queryFn: () =>
      TagsService.listTagsTagsGet(
        params?.status ?? undefined,
        params?.epc_prefix ?? undefined,
        params?.bound ?? undefined,
        params?.q ?? undefined,
        params?.limit ?? 100,
        params?.offset ?? 0,
      ),
    // Operator-driven page — registry rows change on import/patch/retire,
    // which trigger explicit invalidation. A 30 s background poll catches
    // the `registered → active` flips the registrar worker emits.
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
}

export function useTag(epcHex: string | undefined) {
  return useQuery({
    queryKey: [TAGS_QUERY_KEY, 'detail', epcHex],
    queryFn: () => TagsService.getTagByEpcTagsEpcHexGet(epcHex as string),
    enabled: Boolean(epcHex),
    staleTime: 10_000,
  });
}

export function useUpdateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { tagId: string; body: TagUpdate }): Promise<TagResponse> => {
      return TagsService.updateTagTagsTagIdPatch(args.tagId, args.body);
    },
    onSuccess: (updated) => {
      // Invalidate the list (cheap — single fetch) and surgically update
      // the detail cache so the drawer reflects the new status without a
      // round-trip flicker.
      qc.invalidateQueries({ queryKey: [TAGS_QUERY_KEY, 'list'] });
      qc.setQueryData([TAGS_QUERY_KEY, 'detail', updated.epc_hex], updated);
    },
  });
}
