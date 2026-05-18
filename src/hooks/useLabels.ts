/**
 * Labels hooks (Sprint 36 / remediation row 2.2 + 3.9).
 *
 * Thin TanStack Query wrapper around the generated `LabelsService` for
 * two surfaces:
 *   1. The per-tenant **label catalog** (`/labels`, `/labels/{id}`):
 *      list / create / update / delete by admin from the
 *      `<LabelManagement>` admin page.
 *   2. The per-entity **label associations** (`/{entity_segment}/{id}/labels`,
 *      `/{entity_segment}/{id}/labels/{label_id}`): list / attach /
 *      detach, exercised by the reusable `<LabelChips>` component.
 *
 * RBAC (enforced server-side):
 *   - viewer+ → list / get
 *   - editor / admin → create catalog row, associate/disassociate on an entity
 *   - admin → update / delete catalog row (409 if any entity references it;
 *             body includes `association_count`).
 *
 * `entity_type` is immutable on a catalog row per ADR 020 — the generated
 * `LabelUpdate` type omits it, so attempts to patch it are impossible from
 * the typed call site.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LabelsService } from '@/api/generated/services/LabelsService';
import type { LabelAssociationCreate } from '@/api/generated/models/LabelAssociationCreate';
import type { LabelCreate } from '@/api/generated/models/LabelCreate';
import type { LabelUpdate } from '@/api/generated/models/LabelUpdate';

export type LabelEntityType = 'asset' | 'site' | 'zone' | 'device' | 'category';

/** Catalog list. Optional filter to a single entity_type. */
export function useLabels(params?: {
  entity_type?: LabelEntityType;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['labels', params ?? null],
    queryFn: () =>
      LabelsService.listLabelsLabelsGet(
        params?.entity_type,
        params?.limit ?? 200,
        params?.offset ?? 0,
      ),
  });
}

export function useCreateLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: LabelCreate) => LabelsService.createLabelLabelsPost(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['labels'] }),
  });
}

export function useUpdateLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: LabelUpdate }) =>
      LabelsService.updateLabelLabelsLabelIdPatch(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['labels'] }),
  });
}

export function useDeleteLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => LabelsService.deleteLabelLabelsLabelIdDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['labels'] }),
  });
}

/**
 * Map an entity_type to its URL segment as accepted by the backend.
 * Kept centralized so the chips component and any future filter wiring
 * agree on the spelling.
 */
export function entitySegmentFor(entityType: LabelEntityType): string {
  switch (entityType) {
    case 'asset':
      return 'assets';
    case 'site':
      return 'sites';
    case 'zone':
      return 'zones';
    case 'device':
      return 'devices';
    case 'category':
      return 'categories';
  }
}

/** Associations attached to one entity. */
export function useEntityLabels(
  entityType: LabelEntityType | undefined,
  entityId: string | undefined,
) {
  return useQuery({
    queryKey: ['entity-labels', entityType, entityId],
    queryFn: () =>
      LabelsService.listEntityLabelsEntitySegmentEntityIdLabelsGet(
        entitySegmentFor(entityType!),
        entityId!,
      ),
    enabled: Boolean(entityType && entityId),
  });
}

export function useAssociateLabel(
  entityType: LabelEntityType,
  entityId: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: LabelAssociationCreate) =>
      LabelsService.associateLabelEntitySegmentEntityIdLabelsPost(
        entitySegmentFor(entityType),
        entityId,
        data,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['entity-labels', entityType, entityId] }),
  });
}

export function useDisassociateLabel(
  entityType: LabelEntityType,
  entityId: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (labelId: string) =>
      LabelsService.disassociateLabelEntitySegmentEntityIdLabelsLabelIdDelete(
        entitySegmentFor(entityType),
        entityId,
        labelId,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['entity-labels', entityType, entityId] }),
  });
}
