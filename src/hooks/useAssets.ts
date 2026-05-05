/**
 * Assets / sites / zones hooks (Sprint 15 Phase F UI).
 *
 * Wraps the generated `AssetsService` + `SitesZonesService` so call-sites
 * stay short and react-query cache keys stay consistent across pages.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AssetsService } from '@/api/generated/services/AssetsService';
import { SitesZonesService } from '@/api/generated/services/SitesZonesService';
import { QueryService } from '@/api/generated/services/QueryService';
import type { AssetCreate } from '@/api/generated/models/AssetCreate';
import type { AssetUpdate } from '@/api/generated/models/AssetUpdate';
import type { AssetTagBindingCreate } from '@/api/generated/models/AssetTagBindingCreate';
import type { SiteCreate } from '@/api/generated/models/SiteCreate';
import type { SiteUpdate } from '@/api/generated/models/SiteUpdate';
import type { ZoneCreate } from '@/api/generated/models/ZoneCreate';
import type { ZoneUpdate } from '@/api/generated/models/ZoneUpdate';

// ── Assets ──────────────────────────────────────────────────────────────────

export function useAssets(params?: {
  asset_type?: string;
  status?: string;
  q?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['assets', params],
    queryFn: () =>
      AssetsService.listAssetsAssetsGet(
        params?.asset_type ?? undefined,
        params?.status ?? undefined,
        params?.q ?? undefined,
        params?.limit ?? 100,
        params?.offset ?? 0,
      ),
  });
}

export function useAsset(id: string | undefined) {
  return useQuery({
    queryKey: ['assets', id],
    queryFn: () => AssetsService.getAssetAssetsAssetIdGet(id!),
    enabled: Boolean(id),
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AssetCreate) => AssetsService.createAssetAssetsPost(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssetUpdate }) =>
      AssetsService.updateAssetAssetsAssetIdPatch(id, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['assets', vars.id] });
    },
  });
}

export function useRetireAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => AssetsService.retireAssetAssetsAssetIdDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  });
}

// ── Bindings ────────────────────────────────────────────────────────────────

export function useAssetBindings(assetId: string | undefined, activeOnly = false) {
  return useQuery({
    queryKey: ['assets', assetId, 'bindings', { activeOnly }],
    queryFn: () =>
      AssetsService.listBindingsAssetsAssetIdBindingsGet(assetId!, activeOnly),
    enabled: Boolean(assetId),
  });
}

export function useBindTag(assetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AssetTagBindingCreate) =>
      AssetsService.bindTagAssetsAssetIdBindingsPost(assetId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets', assetId, 'bindings'] });
    },
  });
}

export function useUnbindTag(assetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bindingValue: string) =>
      AssetsService.unbindTagAssetsAssetIdBindingsBindingValueDelete(
        assetId,
        bindingValue,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets', assetId, 'bindings'] });
    },
  });
}

// ── External positions ──────────────────────────────────────────────────────

export function useAssetExternalPositions(
  assetId: string | undefined,
  limit = 100,
) {
  return useQuery({
    queryKey: ['assets', assetId, 'external-positions', { limit }],
    queryFn: () =>
      AssetsService.listExternalPositionsAssetsAssetIdExternalPositionsGet(
        assetId!,
        limit,
        0,
      ),
    enabled: Boolean(assetId),
  });
}

// ── Reader-hop path (via tag-reads filtered by binding tag) ─────────────────
// `/assets/{id}/path` is roadmap-deferred; for now we approximate it by
// querying tag-reads for the asset's active binding value.
export function useTagReadsForBinding(
  tagId: string | undefined,
  params?: { since?: string; limit?: number },
) {
  return useQuery({
    queryKey: ['tag-reads', 'by-tag', tagId, params],
    queryFn: () =>
      QueryService.queryTagReadsTagReadsGet(
        undefined,
        tagId!,
        params?.since ?? undefined,
        undefined,
        undefined,
        undefined,
        params?.limit ?? 100,
        0,
      ),
    enabled: Boolean(tagId),
  });
}

// ── Sites ───────────────────────────────────────────────────────────────────

export function useSites() {
  return useQuery({
    queryKey: ['sites'],
    queryFn: () => SitesZonesService.listSitesSitesGet(),
  });
}

export function useSite(id: string | undefined) {
  return useQuery({
    queryKey: ['sites', id],
    queryFn: () => SitesZonesService.getSiteSitesSiteIdGet(id!),
    enabled: Boolean(id),
  });
}

export function useCreateSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SiteCreate) => SitesZonesService.createSiteSitesPost(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sites'] }),
  });
}

export function useUpdateSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SiteUpdate }) =>
      SitesZonesService.updateSiteSitesSiteIdPatch(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sites'] }),
  });
}

export function useDeleteSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => SitesZonesService.deleteSiteSitesSiteIdDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sites'] });
      qc.invalidateQueries({ queryKey: ['zones'] });
    },
  });
}

// ── Zones ───────────────────────────────────────────────────────────────────

export function useZones(siteId?: string) {
  return useQuery({
    queryKey: ['zones', { siteId }],
    queryFn: () => SitesZonesService.listZonesZonesGet(siteId ?? undefined),
  });
}

export function useCreateZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ZoneCreate) => SitesZonesService.createZoneZonesPost(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zones'] }),
  });
}

export function useUpdateZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ZoneUpdate }) =>
      SitesZonesService.updateZoneZonesZoneIdPatch(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zones'] }),
  });
}

export function useDeleteZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => SitesZonesService.deleteZoneZonesZoneIdDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zones'] }),
  });
}

// ── Location & path (Sprint 15 — view + path API) ───────────────────────────

export function useAssetCurrentLocation(assetId: string | undefined) {
  return useQuery({
    queryKey: ['assets', assetId, 'current-location'],
    queryFn: () =>
      AssetsService.getAssetCurrentLocationAssetsAssetIdCurrentLocationGet(
        assetId!,
      ),
    enabled: Boolean(assetId),
    // 404 when no fix yet — surface as `null` rather than a thrown error so
    // pages can render an empty state without try/catch noise.
    retry: false,
    // Live polling so Map markers track moving assets. The Sprint 17a Map
    // page assumes ~5s freshness; staleTime keeps re-renders quiet between
    // background refetches.
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
    staleTime: 4_000,
  });
}

export function useAssetPath(
  assetId: string | undefined,
  range: { since: string; until: string; limit?: number },
) {
  return useQuery({
    queryKey: ['assets', assetId, 'path', range],
    queryFn: () =>
      AssetsService.getAssetPathAssetsAssetIdPathGet(
        assetId!,
        range.since,
        range.until,
        range.limit ?? 1000,
      ),
    enabled: Boolean(assetId && range.since && range.until),
  });
}

export function useAssetsInZone(
  zoneId: string | undefined,
  params?: { limit?: number; offset?: number },
) {
  return useQuery({
    queryKey: ['zones', zoneId, 'assets', params],
    queryFn: () =>
      SitesZonesService.listAssetsInZoneZonesZoneIdAssetsGet(
        zoneId!,
        params?.limit ?? 200,
        params?.offset ?? 0,
      ),
    enabled: Boolean(zoneId),
  });
}

/** Sprint 17a — recursive carrier manifest for the Map pop-out. */
export function useAssetManifest(assetId: string | undefined) {
  return useQuery({
    queryKey: ['assets', assetId, 'manifest'],
    queryFn: () => AssetsService.getManifestAssetsAssetIdManifestGet(assetId!),
    enabled: Boolean(assetId),
    retry: false,
  });
}
