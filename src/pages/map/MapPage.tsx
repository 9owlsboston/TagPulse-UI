/**
 * Sprint 17a — Map page.
 *
 * Provider-agnostic Leaflet map showing live asset markers + zone polygons,
 * with a 24h time-slider that replays each visible asset's `/assets/{id}/path`.
 *
 * Tile config comes from `GET /tenant/map-config` (falls back to OSM); the
 * footer always renders the resolver's `attribution` string.
 */
import { useMemo, useState } from 'react';
import {
  Card,
  Checkbox,
  Empty,
  Modal,
  Slider,
  Space,
  Spin,
  Tag,
  Tree,
  Typography,
} from 'antd';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polygon, Popup, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { useAssets, useAssetCurrentLocation, useAssetManifest, useAssetPath, useZones } from '@/hooks/useAssets';
import { useStockLevels } from '@/hooks/useInventory';
import { useMapConfig, OSM_FALLBACK } from '@/hooks/useMapConfig';
import type { AssetResponse } from '@/api/generated/models/AssetResponse';
import type { ManifestEntry } from '@/api/generated/models/ManifestEntry';

const { Title, Text } = Typography;

// Default Leaflet marker icon path uses bundler-relative URLs that break under
// Vite. Re-point to the upstream CDN once at module load.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface PolygonGeoJSON {
  type?: string;
  coordinates?: number[][][];
}

function polygonLatLngs(polygon: PolygonGeoJSON | null | undefined): [number, number][] | null {
  if (!polygon || !polygon.coordinates || polygon.coordinates.length === 0) return null;
  const ring = polygon.coordinates[0];
  if (!ring) return null;
  // GeoJSON coords are [lng, lat].
  return ring.map((pt) => [pt[1], pt[0]] as [number, number]);
}

const PATH_COLORS = ['#1677ff', '#52c41a', '#fa8c16', '#eb2f96', '#722ed1', '#13c2c2'];

export function MapPage() {
  const { data: assets, isLoading: assetsLoading } = useAssets({ status: 'active', limit: 500 });
  const { data: zones, isLoading: zonesLoading } = useZones();
  const { data: stockLevels } = useStockLevels();
  const { data: mapConfigData } = useMapConfig();
  const mapConfig = mapConfigData ?? OSM_FALLBACK;

  const [showZones, setShowZones] = useState(true);
  const [showAssets, setShowAssets] = useState(true);
  const [showStockDensity, setShowStockDensity] = useState(false);
  const [replayMinutesAgo, setReplayMinutesAgo] = useState(0); // 0 = live, max 1440 (24h)
  const [manifestAsset, setManifestAsset] = useState<AssetResponse | null>(null);

  const polygonZones = useMemo(
    () =>
      (zones ?? []).filter(
        (z) => z.kind === 'geofence' && polygonLatLngs(z.polygon_geojson),
      ),
    [zones],
  );

  // Stock-density: aggregate `quantity` per `zone_id`, then map to polygon
  // overlay opacity. Density layer only renders for geofence zones (the ones
  // we can actually paint as polygons).
  const stockByZone = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of stockLevels ?? []) {
      if (row.zone_id) m.set(row.zone_id, (m.get(row.zone_id) ?? 0) + row.quantity);
    }
    return m;
  }, [stockLevels]);
  const stockMax = useMemo(
    () => Math.max(0, ...Array.from(stockByZone.values())),
    [stockByZone],
  );

  // Pick a default center: first zone bbox centroid, else a nominal start.
  const defaultCenter: [number, number] = useMemo(() => {
    const z = polygonZones[0];
    if (z && z.bbox_min_lat != null && z.bbox_max_lat != null && z.bbox_min_lon != null && z.bbox_max_lon != null) {
      return [(z.bbox_min_lat + z.bbox_max_lat) / 2, (z.bbox_min_lon + z.bbox_max_lon) / 2];
    }
    return [37.7749, -122.4194];
  }, [polygonZones]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Map</Title>
        <Space>
          <Checkbox checked={showAssets} onChange={(e) => setShowAssets(e.target.checked)}>Assets</Checkbox>
          <Checkbox checked={showZones} onChange={(e) => setShowZones(e.target.checked)}>Zones</Checkbox>
          <Checkbox checked={showStockDensity} onChange={(e) => setShowStockDensity(e.target.checked)}>Stock density</Checkbox>
        </Space>
      </div>

      <Card>
        {(assetsLoading || zonesLoading) ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : (
          <>
            <div style={{ height: 560, width: '100%' }}>
              <MapContainer center={defaultCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  url={mapConfig.tile_url_template}
                  attribution={mapConfig.attribution}
                  maxZoom={mapConfig.max_zoom ?? 19}
                  subdomains={mapConfig.subdomains ?? undefined}
                />
                {showZones && polygonZones.map((z) => {
                  const latlngs = polygonLatLngs(z.polygon_geojson)!;
                  const qty = stockByZone.get(z.id) ?? 0;
                  const densityFill = showStockDensity && stockMax > 0
                    ? Math.min(0.65, 0.1 + 0.55 * (qty / stockMax))
                    : 0.15;
                  const densityColor = showStockDensity && qty > 0 ? '#fa541c' : '#1677ff';
                  return (
                    <Polygon
                      key={z.id}
                      positions={latlngs}
                      pathOptions={{ color: densityColor, fillOpacity: densityFill }}
                    >
                      <Popup>
                        <strong>{z.name}</strong><br />
                        <Tag>{z.kind}</Tag>
                        {showStockDensity && (
                          <div style={{ marginTop: 4 }}>
                            <Text>Stock units: <strong>{qty.toLocaleString()}</strong></Text>
                          </div>
                        )}
                      </Popup>
                      {showStockDensity && qty > 0 && (
                        <Tooltip permanent direction="center" className="stock-density-label">
                          {qty.toLocaleString()}
                        </Tooltip>
                      )}
                    </Polygon>
                  );
                })}
                {showAssets && (assets ?? []).map((a, idx) => (
                  <AssetMarker
                    key={a.id}
                    asset={a}
                    replayMinutesAgo={replayMinutesAgo}
                    pathColor={PATH_COLORS[idx % PATH_COLORS.length] ?? '#1677ff'}
                    onOpenManifest={() => setManifestAsset(a)}
                  />
                ))}
              </MapContainer>
            </div>

            <div style={{ marginTop: 16 }}>
              <Text strong>Time replay</Text>
              <Slider
                min={0}
                max={1440}
                step={5}
                value={replayMinutesAgo}
                onChange={(v) => setReplayMinutesAgo(v as number)}
                marks={{ 0: 'Live', 60: '1h', 360: '6h', 720: '12h', 1440: '24h' }}
                tooltip={{ formatter: (v) => (v === 0 ? 'Live' : `${v} min ago`) }}
              />
            </div>

            <div style={{ marginTop: 12, fontSize: 12, color: '#888' }}>
              <span dangerouslySetInnerHTML={{ __html: mapConfig.attribution }} />
              {mapConfig.kind === 'osm' && (
                <div style={{ marginTop: 4 }}>
                  Default tiles intended for development; configure a production provider before public deployment.
                </div>
              )}
            </div>

            {(assets ?? []).length === 0 && polygonZones.length === 0 && (
              <Empty description="No active assets or geofence zones yet" style={{ marginTop: 24 }} />
            )}
          </>
        )}
      </Card>

      <ManifestPopout asset={manifestAsset} onClose={() => setManifestAsset(null)} />
    </div>
  );
}

interface AssetMarkerProps {
  asset: AssetResponse;
  replayMinutesAgo: number;
  pathColor: string;
  onOpenManifest: () => void;
}

function AssetMarker({ asset, replayMinutesAgo, pathColor, onOpenManifest }: AssetMarkerProps) {
  const { data: location } = useAssetCurrentLocation(asset.id);

  // For replay mode, fetch the last 24h path and pick the point closest to
  // (now - replayMinutesAgo). Keeps things lightweight — no animation loop.
  const range = useMemo(() => {
    const until = new Date();
    const since = new Date(until.getTime() - 24 * 60 * 60_000);
    return { since: since.toISOString(), until: until.toISOString(), limit: 1000 };
  }, []);
  const { data: path } = useAssetPath(replayMinutesAgo > 0 ? asset.id : undefined, range);

  const [lat, lng] = useMemo<[number | null, number | null]>(() => {
    if (replayMinutesAgo === 0) {
      return location ? [location.latitude, location.longitude] : [null, null];
    }
    if (!path || path.length === 0) return [null, null];
    const targetMs = Date.now() - replayMinutesAgo * 60_000;
    let closest = path[0]!;
    let bestDiff = Math.abs(new Date(closest.recorded_at).getTime() - targetMs);
    for (const p of path) {
      const diff = Math.abs(new Date(p.recorded_at).getTime() - targetMs);
      if (diff < bestDiff) { bestDiff = diff; closest = p; }
    }
    return [closest.latitude, closest.longitude];
  }, [location, path, replayMinutesAgo]);

  if (lat == null || lng == null) return null;

  return (
    <>
      <Marker position={[lat, lng]}>
        <Popup>
          <strong>{asset.name}</strong>
          <div><Tag>{asset.asset_type}</Tag></div>
          <div style={{ marginTop: 4 }}>
            <Link to={`/assets/${asset.id}`}>Open detail →</Link>
          </div>
          <div style={{ marginTop: 4 }}>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onOpenManifest();
              }}
            >
              View manifest →
            </a>
          </div>
          {replayMinutesAgo > 0 && (
            <div style={{ marginTop: 4, fontSize: 11, color: '#888' }}>
              Position at ~{replayMinutesAgo} min ago
            </div>
          )}
        </Popup>
      </Marker>
      {/* Mobility hint: draw a small ring for mobile assets so trucks/forklifts
          stand out from fixed-tagged inventory. */}
      {asset.metadata && (asset.metadata as Record<string, unknown>).mobility === 'mobile' && (
        <CircleMarker
          center={[lat, lng]}
          radius={12}
          pathOptions={{ color: pathColor, weight: 2, fillOpacity: 0 }}
        />
      )}
    </>
  );
}


interface ManifestPopoutProps {
  asset: AssetResponse | null;
  onClose: () => void;
}

function manifestToTreeData(entry: ManifestEntry): { title: React.ReactNode; key: string; children?: ReturnType<typeof manifestToTreeData>[] } {
  return {
    key: entry.asset_id,
    title: (
      <Space size="small">
        <Link to={`/assets/${entry.asset_id}`}>{entry.name}</Link>
        <Tag>{entry.asset_type}</Tag>
      </Space>
    ),
    children: (entry.children ?? []).map(manifestToTreeData),
  };
}

function ManifestPopout({ asset, onClose }: ManifestPopoutProps) {
  const { data, isLoading, error } = useAssetManifest(asset?.id);

  const tree = useMemo(() => {
    if (!data) return [];
    return [
      {
        key: data.asset_id,
        title: (
          <Space>
            <strong><Link to={`/assets/${data.asset_id}`}>{data.name}</Link></strong>
            <Tag color="blue">{data.asset_type}</Tag>
          </Space>
        ),
        children: (data.children ?? []).map(manifestToTreeData),
      },
    ];
  }, [data]);

  const childCount = useMemo(() => {
    if (!data?.children) return 0;
    let n = 0;
    const walk = (entries: ManifestEntry[]) => {
      for (const e of entries) {
        n += 1;
        if (e.children) walk(e.children);
      }
    };
    walk(data.children);
    return n;
  }, [data]);

  return (
    <Modal
      open={asset !== null}
      onCancel={onClose}
      footer={null}
      width={520}
      title={asset ? `Manifest — ${asset.name}` : 'Manifest'}
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
      ) : error ? (
        <Empty description="No manifest available for this asset" />
      ) : !data || (data.children ?? []).length === 0 ? (
        <Empty description="This asset is not carrying any child assets" />
      ) : (
        <>
          <Text type="secondary">{childCount} child asset{childCount === 1 ? '' : 's'}</Text>
          <Tree treeData={tree} defaultExpandAll showLine style={{ marginTop: 12 }} />
        </>
      )}
    </Modal>
  );
}
