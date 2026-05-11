/**
 * Tile-provider config hook (Sprint 17a).
 *
 * Wraps `GET /tenant/map-config` so the Map page can configure Leaflet's
 * `<TileLayer>` without baking in vendor-specific URLs. Falls back to OSM
 * default when the call fails (e.g., dev backend without the endpoint yet).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TenantService } from '@/api/generated/services/TenantService';
import type { MapConfigResponse } from '@/api/generated/models/MapConfigResponse';
import type { TileProviderUpdate } from '@/api/generated/models/TileProviderUpdate';

export const OSM_FALLBACK: MapConfigResponse = {
  kind: 'osm',
  tile_url_template: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; OpenStreetMap contributors',
  max_zoom: 19,
  subdomains: ['a', 'b', 'c'],
};

export function useMapConfig() {
  return useQuery({
    queryKey: ['tenant', 'map-config'],
    queryFn: () => TenantService.getMapConfigTenantMapConfigGet(),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

// Sprint 28 G7 — admin update of tile provider blob.
export function useUpdateMapConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TileProviderUpdate) =>
      TenantService.updateMapConfigTenantMapConfigPatch(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant', 'map-config'] }),
  });
}
