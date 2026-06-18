/**
 * Read-only warehouse floor map (Sprint 64 Phase 2).
 *
 * Renders a floor site as an SVG grid (sized by its `coord_system` extent),
 * with fixed-reader markers at their **port-0** positions and asset markers
 * **snapped to the reader that last heard them** (D2 — the estimator is
 * deferred, so we snap to the triggering reader rather than a computed
 * position). Implemented in SVG (floor-local units) — the floor analogue of
 * Leaflet `CRS.Simple`, sharing the placement view's `floorMath`.
 */
import { useMemo } from 'react';
import Empty from 'antd/es/empty';
import { useAntennas } from '@/hooks/useAntennas';
import { useAssetCurrentLocation } from '@/hooks/useAssets';
import { CoordSystem } from '@/api/generated/models/CoordSystem';
import type { AssetResponse } from '@/api/generated/models/AssetResponse';
import type { DeviceResponse } from '@/api/generated/models/DeviceResponse';
import type { SiteResponse } from '@/api/generated/models/SiteResponse';
import { useThemeMode } from '@/theme/ThemeProvider';
import { tokens } from '@/theme/tokens';
import { floorToSvg, gridLines } from './floorMath';

function ReaderMarker({
  device,
  extentY,
  originAnchor,
  radius,
  color,
  ring,
}: {
  device: DeviceResponse;
  extentY: number;
  originAnchor: CoordSystem.origin_anchor;
  radius: number;
  color: string;
  ring: string;
}) {
  const { data: antennas } = useAntennas(device.id);
  const port0 = antennas?.find((a) => a.port === 0);
  if (!port0 || port0.x == null || port0.y == null) return null;
  const { x, y } = floorToSvg({ x: port0.x, y: port0.y }, extentY, originAnchor);
  return (
    <g data-testid={`floormap-reader-${device.id}`} pointerEvents="none">
      <circle cx={x} cy={y} r={radius} fill={color} stroke={ring} strokeWidth={radius * 0.25} />
      <text x={x + radius * 1.4} y={y + radius * 0.5} fontSize={radius * 1.5} fill="currentColor">
        {device.name}
      </text>
    </g>
  );
}

function AssetFloorMarker({
  asset,
  extentY,
  originAnchor,
  radius,
  color,
  ring,
}: {
  asset: AssetResponse;
  extentY: number;
  originAnchor: CoordSystem.origin_anchor;
  radius: number;
  color: string;
  ring: string;
}) {
  const { data: location } = useAssetCurrentLocation(asset.id);
  const deviceId = location?.device_id ?? undefined;
  const { data: antennas } = useAntennas(deviceId);
  if (!deviceId) return null;
  const port0 = antennas?.find((a) => a.port === 0);
  if (!port0 || port0.x == null || port0.y == null) return null;
  const { x, y } = floorToSvg({ x: port0.x, y: port0.y }, extentY, originAnchor);
  // Offset above the reader dot so the asset (diamond) stays distinguishable.
  const cy = y - radius * 2.4;
  return (
    <g data-testid={`floormap-asset-${asset.id}`} pointerEvents="none">
      <rect
        x={x - radius}
        y={cy - radius}
        width={radius * 2}
        height={radius * 2}
        transform={`rotate(45 ${x} ${cy})`}
        fill={color}
        stroke={ring}
        strokeWidth={radius * 0.2}
      />
      <text x={x + radius * 1.4} y={cy + radius * 0.5} fontSize={radius * 1.4} fill="currentColor">
        {asset.name}
      </text>
    </g>
  );
}

export function FloorMap({
  site,
  devices,
  assets,
  showAssets = true,
}: {
  site: SiteResponse;
  devices: DeviceResponse[];
  assets: AssetResponse[];
  showAssets?: boolean;
}) {
  const { mode } = useThemeMode();
  const t = tokens[mode];
  const cs = site.coord_system;
  const fixedReaders = useMemo(() => devices.filter((d) => d.mobility === 'fixed'), [devices]);

  if (!cs) {
    return <Empty description="This site has no floor plan" />;
  }

  const extentX = cs.extent_x;
  const extentY = cs.extent_y;
  const originAnchor = cs.origin_anchor ?? CoordSystem.origin_anchor.NW_CORNER;
  const radius = Math.max(extentX, extentY) * 0.012;

  return (
    <svg
      viewBox={`0 0 ${extentX} ${extentY}`}
      preserveAspectRatio="none"
      data-testid="floormap-canvas"
      style={{
        width: '100%',
        aspectRatio: `${extentX} / ${extentY}`,
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
        <line key={`vx-${gx}`} x1={gx} y1={0} x2={gx} y2={extentY} stroke={t.colorBorder} strokeWidth={extentX * 0.001} />
      ))}
      {gridLines(extentY).map((gy) => (
        <line key={`hy-${gy}`} x1={0} y1={gy} x2={extentX} y2={gy} stroke={t.colorBorder} strokeWidth={extentY * 0.001} />
      ))}
      {fixedReaders.map((d) => (
        <ReaderMarker
          key={d.id}
          device={d}
          extentY={extentY}
          originAnchor={originAnchor}
          radius={radius}
          color={t.colorAccent}
          ring={t.colorSurface}
        />
      ))}
      {showAssets &&
        assets.map((a) => (
          <AssetFloorMarker
            key={a.id}
            asset={a}
            extentY={extentY}
            originAnchor={originAnchor}
            radius={radius}
            color={t.colorSuccess}
            ring={t.colorSurface}
          />
        ))}
    </svg>
  );
}
