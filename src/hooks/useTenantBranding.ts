/**
 * Tenant branding hook (Sprint 33 QW6).
 *
 * Thin TanStack Query wrappers around `TenantService` for:
 *   • `GET /tenant/branding` — authenticated admin/editor/viewer read.
 *   • `PATCH /tenant/branding` — admin-only update.
 *   • `GET /branding/{slug}` — unauth login-page lookup.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TenantService } from '@/api/generated/services/TenantService';
import type { TenantBrandingUpdate } from '@/api/generated/models/TenantBrandingUpdate';

const TENANT_BRANDING_KEY = ['tenant', 'branding'] as const;

export function useTenantBranding(enabled: boolean = true) {
  return useQuery({
    queryKey: TENANT_BRANDING_KEY,
    queryFn: () => TenantService.getTenantBrandingTenantBrandingGet(),
    staleTime: 60_000,
    enabled,
    retry: false,
  });
}

export function useUpdateTenantBranding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TenantBrandingUpdate) =>
      TenantService.updateTenantBrandingTenantBrandingPatch(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: TENANT_BRANDING_KEY }),
  });
}

export function usePublicBranding(slug: string | null) {
  return useQuery({
    queryKey: ['public-branding', slug],
    queryFn: () => TenantService.getPublicBrandingBrandingSlugGet(slug!),
    enabled: !!slug,
    retry: false,
    staleTime: 5 * 60_000,
  });
}
