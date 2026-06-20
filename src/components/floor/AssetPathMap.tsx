/**
 * <AssetPathMap> — frame-aware "where is X / where was X" map for one asset.
 *
 * Sprint 68. Answers the operator question the reader-hop table cannot: the
 * actual path an asset traversed over a time range, drawn on a map.
 *
 * Frame is auto-selected from the data (single-frame v1):
 *   - **floor** — the asset has floor `(x, y)` fixes (computed or precomputed);
 *     drawn on the site `coord_system` grid (floorplan backdrop when uploaded,
 *     else a plain grid).
 *   - **geo** — no floor fixes but a geographic lat/lon path exists; drawn on a
 *     Leaflet tile map.
 *   - **empty** — neither; honest empty state.
 *
 * A mixed geo+floor history (toggle) is a deferred seam — assets are
 * effectively single-frame per site.
 */
import { useMemo } from 'react';
import Empty from 'antd/es/empty';
import Spin from 'antd/es/spin';
import Tag from 'antd/es/tag';
import Typography from 'antd/es/typography';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { useAssetPath, useFloorPath, useSite } from '@/hooks/useAssets';
import { useMapConfig, OSM_FALLBACK } from '@/hooks/useMapConfig';
import { CoordSystem } from '@/api/generated/models/CoordSystem';
import type { AssetResponse } from '@/api/generated/models/AssetResponse';
import type { FloorPositionResponse } from '@/api/generated/models/FloorPositionResponse';
import type { AssetPathPoint } from '@/api/generated/models/AssetPathPoint';
import { useThemeMode } from '@/theme/ThemeProvider';
import { tokens } from '@/theme/tokens';
import { floorToSvg, gridLines } from './floorMath';

const { Text } = Typography;

// Leaflet's default icon paths break under bundlers; rewire to imported assets.
// Idempotent — other map surfaces register the same options.
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

interface AssetPathMapProps {
  asset: AssetResponse;
  /** ISO timestamps bounding the path window (from <TimeRangePicker>). */
  since: string;
  until: string;
  /** SVG/Leaflet container height in px. */
  height?: number;
}

export function AssetPathMap({ asset, since, until, height = 420 }: AssetPathMapProps) {
  // Both frames are fetched; the one with data wins (floor preferred).
  const { data: floorPath, isLoading: floorLoading } = useFloorPath(asset.id, {
    since,
    until,
    limit: 2000,
  });
  const { data: geoPath, isLoading: geoLoading } = useAssetPath(asset.id, {
    since,
    until,
    limit: 2000,
  });

  const hasFloor = (floorPath?.length ?? 0) > 0;
  const hasGeo = (geoPath?.length ?? 0) > 0;

  // Floor fixes carry their own site_id; resolve it for the coord_system grid.
  const floorSiteId = hasFloor ? floorPath![0]!.site_id : undefined;
  const { data: site, isLoading: siteLoading } = useSite(floorSiteId);

  if (floorLoading || geoLoading) return <Spin />;

  if (hasFloor) {
    if (siteLoading) return <Spin />;
    if (!site?.coord_system) {
      return <Empty description="This asset has floor fixes but its site has no floor plan" />;
    }
    return (
      <FloorTrailCanvas
        cs={site.coord_system}
        points={floorPath!}
        assetName={asset.name}
        height={height}
      />
    );
  }

  if (hasGeo) {
    return <GeoTrailMap points={geoPath!} assetName={asset.name} height={height} />;
  }

  return <Empty description="No position fixes for this asset in the selected time range" />;
}

// ── floor frame ────────────────────────────────────────────────────────────

function FloorTrailCanvas({
  cs,
  points,
  assetName,
  height,
}: {
  cs: CoordSystem;
  points: FloorPositionResponse[];
  assetName: string;
  height: number;
}) {
  const { mode } = useThemeMode();
  const t = tokens[mode];
  const extentX = cs.extent_x;
  const extentY = cs.extent_y;
  const originAnchor = cs.origin_anchor ?? CoordSystem.origin_anchor.NW_CORNER;
  const radius = Math.max(extentX, extentY) * 0.012;

  const trail = useMemo(
    () =>
      points.map((p) => ({
        ...floorToSvg({ x: p.x, y: p.y }, extentY, originAnchor),
        confidence: p.confidence,
      })),
    [points, extentY, originAnchor],
  );

  const latestPoint = points[points.length - 1]!;
  const latest = trail[trail.length - 1]!;
  const polyPoints = trail.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div>
      <Text type="secondary">
        <strong>Where:</strong> Floor @ ({latestPoint.x.toFixed(1)}, {latestPoint.y.toFixed(1)})
        {'  '}
        <Tag color="geekblue" style={{ marginInlineStart: 8 }}>
          {latestPoint.source}
        </Tag>
        conf {(latestPoint.confidence * 100).toFixed(0)}% · last seen{' '}
        {new Date(latestPoint.recorded_at).toLocaleString()} · {points.length} fix
        {points.length === 1 ? '' : 'es'}
      </Text>
      <svg
        viewBox={`0 0 ${extentX} ${extentY}`}
        preserveAspectRatio="none"
        data-testid="asset-path-floor-canvas"
        style={{
          width: '100%',
          height,
          marginTop: 8,
          border: `1px solid ${t.colorBorder}`,
          background: t.colorSurface,
        }}
      >
        {cs.floorplan_image && (
          <image
            href={cs.floorplan_image}
            x={0}
            y={0}
            width={extentX}
            height={extentY}
            preserveAspectRatio="none"
          />
        )}
        {gridLines(extentX).map((gx) => (
          <line
            key={`vx-${gx}`}
            x1={gx}
            y1={0}
            x2={gx}
            y2={extentY}
            stroke={t.colorBorder}
            strokeWidth={extentX * 0.001}
          />
        ))}
        {gridLines(extentY).map((gy) => (
          <line
            key={`hy-${gy}`}
            x1={0}
            y1={gy}
            x2={extentX}
            y2={gy}
            stroke={t.colorBorder}
            strokeWidth={extentY * 0.001}
          />
        ))}
        {trail.length > 1 && (
          <polyline
            data-testid="asset-path-trail"
            points={polyPoints}
            fill="none"
            stroke={t.colorAccent}
            strokeWidth={radius * 0.35}
            strokeOpacity={0.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {trail.slice(0, -1).map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={radius * 0.45}
            fill={t.colorAccent}
            fillOpacity={Math.max(0.25, Math.min(1, p.confidence))}
          />
        ))}
        <rect
          data-testid="asset-path-latest"
          x={latest.x - radius}
          y={latest.y - radius}
          width={radius * 2}
          height={radius * 2}
          transform={`rotate(45 ${latest.x} ${latest.y})`}
          fill={t.colorAccent}
          stroke={t.colorSurface}
          strokeWidth={radius * 0.2}
        />
        <text
          x={latest.x + radius * 1.4}
          y={latest.y + radius * 0.5}
          fontSize={radius * 1.4}
          fill="currentColor"
        >
          {assetName}
        </text>
      </svg>
    </div>
  );
}

// ── geo frame ──────────────────────────────────────────────────────────────

function GeoTrailMap({
  points,
  assetName,
  height,
}: {
  points: AssetPathPoint[];
  assetName: string;
  height: number;
}) {
  const { data: mapConfig } = useMapConfig();
  const cfg = mapConfig ?? OSM_FALLBACK;
  const positions = useMemo<[number, number][]>(
    () => points.map((p) => [p.latitude, p.longitude]),
    [points],
  );
  const latest = points[points.length - 1]!;
  const center: [number, number] = [latest.latitude, latest.longitude];

  return (
    <div>
      <Text type="secondary">
        <strong>Where:</strong> {latest.latitude.toFixed(5)}, {latest.longitude.toFixed(5)}
        {'  '}
        <Tag color="purple" style={{ marginInlineStart: 8 }}>
          {latest.source}
        </Tag>
        last seen {new Date(latest.recorded_at).toLocaleString()} · {points.length} fix
        {points.length === 1 ? '' : 'es'}
      </Text>
      <div
        data-testid="asset-path-geo-map"
        style={{ height, width: '100%', marginTop: 8, border: '1px solid var(--color-border)', borderRadius: 4 }}
      >
        <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
          <TileLayer
            attribution={cfg.attribution ?? OSM_FALLBACK.attribution}
            url={cfg.tile_url_template ?? OSM_FALLBACK.tile_url_template}
          />
          {positions.length > 1 && <Polyline positions={positions} />}
          <Marker position={center}>
            <Popup>
              {assetName}
              <br />
              {latest.latitude.toFixed(5)}, {latest.longitude.toFixed(5)}
              <br />
              {new Date(latest.recorded_at).toLocaleString()}
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
}
