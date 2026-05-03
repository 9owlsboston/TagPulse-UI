/**
 * Tenant config hook (Sprint 15b Phase F).
 *
 * Wraps `GET/PATCH /tenant/config`. Used by the sidebar to gate inventory
 * pages and by the Tenant Settings page to flip `tracking_modes`.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TenantService } from '@/api/generated/services/TenantService';
import type { TenantConfigUpdate } from '@/api/generated/models/TenantConfigUpdate';

const KEY = ['tenant', 'config'] as const;

export function useTenantConfig() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => TenantService.getTenantConfigTenantConfigGet(),
    staleTime: 60_000,
  });
}

export function useUpdateTenantConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TenantConfigUpdate) =>
      TenantService.updateTenantConfigTenantConfigPatch(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
