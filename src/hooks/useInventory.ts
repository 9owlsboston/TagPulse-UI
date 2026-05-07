/**
 * Inventory hooks (Sprint 15b Phase F UI).
 *
 * Wraps the generated `InventoryService` so call-sites stay short and
 * react-query cache keys stay consistent across pages.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { InventoryService } from '@/api/generated/services/InventoryService';
import type { ProductCreate } from '@/api/generated/models/ProductCreate';
import type { ProductUpdate } from '@/api/generated/models/ProductUpdate';
import type { LotCreate } from '@/api/generated/models/LotCreate';
import type { TagDataMappingCreate } from '@/api/generated/models/TagDataMappingCreate';
import { REFETCH_INTERVAL } from '@/lib/constants';

// ── Products ────────────────────────────────────────────────────────────────

export function useProducts(params?: { category?: string; q?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['inventory', 'products', params],
    queryFn: () =>
      InventoryService.listProductsProductsGet(
        params?.category ?? undefined,
        params?.q ?? undefined,
        params?.limit ?? 100,
        params?.offset ?? 0,
      ),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['inventory', 'products', id],
    queryFn: () => InventoryService.getProductProductsProductIdGet(id),
    enabled: Boolean(id),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ProductCreate) => InventoryService.createProductProductsPost(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory', 'products'] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductUpdate }) =>
      InventoryService.updateProductProductsProductIdPatch(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory', 'products'] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => InventoryService.deleteProductProductsProductIdDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory', 'products'] }),
  });
}

// ── Lots ────────────────────────────────────────────────────────────────────

export function useLots(productId: string) {
  return useQuery({
    queryKey: ['inventory', 'lots', productId],
    queryFn: () => InventoryService.listLotsProductsProductIdLotsGet(productId),
    enabled: Boolean(productId),
  });
}

export function useAllLots(params?: { expiringWithinDays?: number; limit?: number }) {
  return useQuery({
    queryKey: ['inventory', 'lots', 'all', params],
    queryFn: () =>
      InventoryService.listAllLotsLotsGet(
        params?.expiringWithinDays ?? undefined,
        params?.limit ?? 200,
      ),
  });
}

export function useLot(lotId: string | undefined) {
  return useQuery({
    queryKey: ['inventory', 'lot', lotId],
    queryFn: () => InventoryService.getLotLotsLotIdGet(lotId!),
    enabled: Boolean(lotId),
  });
}

export function useCreateLot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: LotCreate }) =>
      InventoryService.createLotProductsProductIdLotsPost(productId, data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ['inventory', 'lots', vars.productId] }),
  });
}

// ── Stock levels & movements ────────────────────────────────────────────────

export function useStockLevels(params?: { product_id?: string; zone_id?: string }) {
  return useQuery({
    queryKey: ['inventory', 'stock-levels', params],
    queryFn: () =>
      InventoryService.stockLevelsStockLevelsGet(
        params?.product_id ?? undefined,
        params?.zone_id ?? undefined,
      ),
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useStockMovements(params?: {
  product_id?: string;
  stock_item_id?: string;
  zone_id?: string;
  since?: string;
  until?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['inventory', 'stock-movements', params],
    queryFn: () =>
      InventoryService.stockMovementsStockMovementsGet(
        params?.stock_item_id ?? undefined,
        params?.product_id ?? undefined,
        params?.zone_id ?? undefined,
        params?.since ?? undefined,
        params?.until ?? undefined,
        params?.limit ?? 200,
      ),
  });
}

// ── Tag-data mappings (admin) ───────────────────────────────────────────────

export function useTagDataMappings() {
  return useQuery({
    queryKey: ['inventory', 'tag-data-mappings'],
    queryFn: () => InventoryService.listTagDataMappingsTagDataMappingsGet(),
  });
}

export function useCreateTagDataMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TagDataMappingCreate) =>
      InventoryService.createTagDataMappingTagDataMappingsPost(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory', 'tag-data-mappings'] }),
  });
}

export function useDeleteTagDataMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      InventoryService.deleteTagDataMappingTagDataMappingsMappingIdDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory', 'tag-data-mappings'] }),
  });
}
