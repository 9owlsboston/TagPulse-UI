/**
 * Categories hooks (Sprint 34 gap 3.3).
 *
 * Thin TanStack Query wrapper around the generated `CategoriesService`
 * so call-sites stay short and cache keys stay consistent.
 *
 * RBAC (enforced server-side):
 *   - viewer+         → list / get
 *   - editor / admin  → create / update
 *   - admin           → delete (409 if any asset still references it;
 *                       the body includes `asset_count` so the page can
 *                       surface a guarded confirmation flow).
 *
 * `category_type` is immutable per ADR 019 — the generated `CategoryUpdate`
 * type doesn't include it, so attempts to patch it are simply impossible
 * from the typed call site.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CategoriesService } from '@/api/generated/services/CategoriesService';
import type { CategoryCreate } from '@/api/generated/models/CategoryCreate';
import type { CategoryUpdate } from '@/api/generated/models/CategoryUpdate';

export function useCategories(params?: {
  category_type?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['categories', params],
    queryFn: () =>
      CategoriesService.listCategoriesCategoriesGet(
        params?.category_type ?? undefined,
        params?.limit ?? 100,
        params?.offset ?? 0,
      ),
  });
}

export function useCategory(id: string | undefined) {
  return useQuery({
    queryKey: ['categories', id],
    queryFn: () => CategoriesService.getCategoryCategoriesCategoryIdGet(id!),
    enabled: Boolean(id),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CategoryCreate) =>
      CategoriesService.createCategoryCategoriesPost(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CategoryUpdate }) =>
      CategoriesService.updateCategoryCategoriesCategoryIdPatch(id, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['categories', vars.id] });
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      CategoriesService.deleteCategoryCategoriesCategoryIdDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}
