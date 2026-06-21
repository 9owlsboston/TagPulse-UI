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
import type { AssetResponse } from '@/api/generated/models/AssetResponse';
import type { AssetTagBindingCreate } from '@/api/generated/models/AssetTagBindingCreate';
import type { SiteCreate } from '@/api/generated/models/SiteCreate';
import type { SiteResponse } from '@/api/generated/models/SiteResponse';
import type { SiteUpdate } from '@/api/generated/models/SiteUpdate';
import type { ZoneCreate } from '@/api/generated/models/ZoneCreate';
import type { ZoneResponse } from '@/api/generated/models/ZoneResponse';
import type { ZoneUpdate } from '@/api/generated/models/ZoneUpdate';
import { request } from '@/api/client';
import { encodeLabelFilter, isEmptyLabelFilter, type LabelFilter } from '@/lib/labelFilter';

// ── Assets ──────────────────────────────────────────────────────────────────

export function useAssets(params?: {
  status?: string;
  /** Legacy single-category filter (Sprint 37). Kept for source compat. */
  category_id?: string;
  /** Sprint 42 — multi-category OR filter; emitted as repeated `?category_ids=`. */
  category_ids?: string[];
  q?: string;
  limit?: number;
  offset?: number;
  labels?: LabelFilter;
}) {
  return useQuery({
    queryKey: ['assets', params],
    queryFn: () => {
      const categoryIds = params?.category_ids?.filter(Boolean) ?? [];
      // When a label filter is set, the generated client can't model the
      // deep-object query so fall back to the raw `request()` helper.
      // We also use this path when category_ids is set, since the generated
      // fetch client serialises `categoryIds` as a single CSV value rather
      // than the FastAPI-default repeated `?category_ids=…&category_ids=…`.
      const useRawRequest =
        !isEmptyLabelFilter(params?.labels) || categoryIds.length > 0;
      if (useRawRequest) {
        const extra: string[] = [];
        if (params?.status) extra.push(`status=${encodeURIComponent(params.status)}`);
        if (params?.category_id) extra.push(`category_id=${encodeURIComponent(params.category_id)}`);
        for (const cid of categoryIds) {
          extra.push(`category_ids=${encodeURIComponent(cid)}`);
        }
        if (params?.q) extra.push(`q=${encodeURIComponent(params.q)}`);
        extra.push(`limit=${params?.limit ?? 100}`);
        extra.push(`offset=${params?.offset ?? 0}`);
        if (!isEmptyLabelFilter(params?.labels)) {
          extra.push(encodeLabelFilter(params?.labels));
        }
        return request<AssetResponse[]>(`/assets?${extra.filter(Boolean).join('&')}`);
      }
      return AssetsService.listAssetsAssetsGet(
        params?.status ?? undefined,
        params?.category_id ?? undefined,
        undefined,
        params?.q ?? undefined,
        undefined,
        undefined,
        'desc',
        params?.limit ?? 100,
        params?.offset ?? 0,
      );
    },
    // Asset rows themselves rarely change, but the list page also displays
    // live "Last seen" / "Location" columns sourced from
    // `useAssetsCurrentLocations`. Polling here keeps the binding-derived
    // columns (status changes, retire/load) fresh without a manual refresh.
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
}

/**
 * Bulk current-location feed for the Assets list page. One row per asset
 * that has *any* known position (RFID or external), newest-first. Polled
 * every 5 s to power the live Last-seen / Location columns without N+1
 * per-row fetches.
 */
export function useAssetsCurrentLocations(params?: {
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['assets', 'current-locations', params],
    queryFn: () =>
      AssetsService.listAssetsCurrentLocationsAssetsCurrentLocationsGet(
        params?.limit ?? 200,
        params?.offset ?? 0,
      ),
    refetchInterval: 5_000,
    staleTime: 4_000,
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
        undefined,
        undefined,
        params?.since ?? undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'desc',
        params?.limit ?? 100,
        0,
      ),
    enabled: Boolean(tagId),
  });
}

// ── Sites ───────────────────────────────────────────────────────────────────

export function useSites(params?: { labels?: LabelFilter }) {
  return useQuery({
    queryKey: ['sites', params ?? null],
    queryFn: () => {
      if (!isEmptyLabelFilter(params?.labels)) {
        return request<SiteResponse[]>(`/sites?${encodeLabelFilter(params?.labels)}`);
      }
      return SitesZonesService.listSitesSitesGet();
    },
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

export function useZones(params?: { siteId?: string; labels?: LabelFilter }) {
  const siteId = params?.siteId;
  return useQuery({
    queryKey: ['zones', { siteId: siteId ?? null, labels: params?.labels ?? null }],
    queryFn: () => {
      if (!isEmptyLabelFilter(params?.labels)) {
        const extra: string[] = [];
        if (siteId) extra.push(`site_id=${encodeURIComponent(siteId)}`);
        extra.push(encodeLabelFilter(params?.labels));
        return request<ZoneResponse[]>(`/zones?${extra.filter(Boolean).join('&')}`);
      }
      return SitesZonesService.listZonesZonesGet(siteId ?? undefined);
    },
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

/**
 * Sprint 71 (ADR-034) — fused asset-state "Current" snapshot.
 *
 * Wraps `GET /assets/{id}/state`: the consolidation worker's `read_count ×
 * recency`-weighted fusion of the asset's bound-tag reads into one zone +
 * environment answer. Returns `null` when no snapshot exists yet (consolidation
 * gated off, or no recent reads). Polled for freshness like current-location.
 */
export function useAssetState(assetId: string | undefined) {
  return useQuery({
    queryKey: ['assets', assetId, 'state'],
    queryFn: () => AssetsService.getAssetStateAssetsAssetIdStateGet(assetId!),
    enabled: Boolean(assetId),
    retry: false,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
    staleTime: 8_000,
  });
}

/**
 * Sprint 71 (ADR-034) — fused asset-state history (the "was" timeline).
 *
 * Wraps `GET /assets/{id}/state/history` (newest-first). Drives the custody /
 * environment mini-history on the asset "Current" card.
 */
export function useAssetStateHistory(
  assetId: string | undefined,
  params?: { since?: string; limit?: number },
) {
  return useQuery({
    queryKey: ['assets', assetId, 'state-history', params ?? {}],
    queryFn: () =>
      AssetsService.getAssetStateHistoryAssetsAssetIdStateHistoryGet(
        assetId!,
        params?.since,
        params?.limit ?? 200,
      ),
    enabled: Boolean(assetId),
  });
}

/**
 * Sprint 72 (ADR-034 Phase 2) — transit legs for an asset.
 *
 * Wraps `GET /assets/{id}/legs` (newest-first). Each leg is the `geo`-frame
 * interval between two facilities, with duration, origin/destination, and the
 * cold-chain env envelope + SLA (computed on close). Drives the Journey timeline.
 */
export function useAssetLegs(
  assetId: string | undefined,
  params?: { status?: string; limit?: number },
) {
  return useQuery({
    queryKey: ['assets', assetId, 'legs', params ?? {}],
    queryFn: () =>
      AssetsService.getAssetLegsAssetsAssetIdLegsGet(
        assetId!,
        params?.status,
        params?.limit ?? 100,
      ),
    enabled: Boolean(assetId),
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
}

/**
 * Sprint 65/66 — floor-frame `(x, y)` trail for an asset.
 *
 * Wraps `GET /assets/{id}/floor-path` (ascending time). With no `source`
 * filter it returns **all** fixes — both `computed` (Sprint 66 estimator)
 * and `precomputed` (Sprint 65 BYO ingest) — merged in ascending time. Pass
 * `source` to narrow to one writer. Points are in the site `coord_system`
 * floor units.
 */
export function useFloorPath(
  assetId: string | undefined,
  params?: { since?: string; until?: string; source?: string; limit?: number },
) {
  return useQuery({
    queryKey: ['assets', assetId, 'floor-path', params ?? {}],
    queryFn: () =>
      AssetsService.listFloorPathAssetsAssetIdFloorPathGet(
        assetId!,
        params?.since,
        params?.until,
        params?.source,
        params?.limit ?? 500,
      ),
    enabled: Boolean(assetId),
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
