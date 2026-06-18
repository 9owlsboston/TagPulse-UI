/**
 * Floor placement canvas (Sprint 64 Phase 1).
 *
 * Renders a site's floor as an SVG grid sized by its `coord_system` extent.
 * Select a fixed reader, then click the grid to drop it — this writes the
 * reader's **port-0** antenna (its nominal location, per the port-0 model).
 * Already-placed readers render as labelled dots. The optional floorplan
 * *image* behind the grid is a deferred follow-up (needs a backend field).
 */
import { useMemo, useRef, useState } from 'react';
import App from 'antd/es/app';
import Select from 'antd/es/select';
import Space from 'antd/es/space';
import Typography from 'antd/es/typography';
import { useAntennas, useUpsertAntenna } from '@/hooks/useAntennas';
import { useUpdateDevice } from '@/hooks/useDevices';
import { CoordSystem } from '@/api/generated/models/CoordSystem';
import type { DeviceResponse } from '@/api/generated/models/DeviceResponse';
import type { SiteResponse } from '@/api/generated/models/SiteResponse';
import { useThemeMode } from '@/theme/ThemeProvider';
import { tokens } from '@/theme/tokens';
import { floorToSvg, gridLines, pixelToFloor } from './floorMath';

const { Text } = Typography;

function ReaderDot({
  device,
  extentY,
  originAnchor,
  radius,
  fill,
  ringColor,
}: {
  device: DeviceResponse;
  extentY: number;
  originAnchor: CoordSystem.origin_anchor;
  radius: number;
  fill: string;
  ringColor: string;
}) {
  const { data: antennas } = useAntennas(device.id);
  const port0 = antennas?.find((a) => a.port === 0);
  if (!port0 || port0.x == null || port0.y == null) return null;
  const { x, y } = floorToSvg({ x: port0.x, y: port0.y }, extentY, originAnchor);
  return (
    <g data-testid={`floor-reader-${device.id}`} pointerEvents="none">
      <circle cx={x} cy={y} r={radius} fill={fill} stroke={ringColor} strokeWidth={radius * 0.25} />
      <text x={x + radius * 1.4} y={y + radius * 0.5} fontSize={radius * 1.6} fill="currentColor">
        {device.name}
      </text>
    </g>
  );
}

export function FloorPlacement({
  site,
  devices,
}: {
  site: SiteResponse;
  devices: DeviceResponse[];
}) {
  const { message } = App.useApp();
  const { mode } = useThemeMode();
  const t = tokens[mode];
  const upsert = useUpsertAntenna();
  const updateDevice = useUpdateDevice();
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>();

  const cs = site.coord_system;
  const fixedReaders = useMemo(() => devices.filter((d) => d.mobility === 'fixed'), [devices]);

  if (!cs) {
    return <Text type="secondary">Define a floor coordinate system first.</Text>;
  }

  const extentX = cs.extent_x;
  const extentY = cs.extent_y;
  const originAnchor = cs.origin_anchor ?? CoordSystem.origin_anchor.NW_CORNER;
  const dotRadius = Math.max(extentX, extentY) * 0.012;

  const handleClick = async (e: React.MouseEvent<SVGSVGElement>) => {
    if (!selectedDeviceId) {
      message.info('Select a reader to place first');
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const p = pixelToFloor(e.clientX, e.clientY, rect, extentX, extentY, originAnchor);
    try {
      await upsert.mutateAsync({
        deviceId: selectedDeviceId,
        port: 0,
        data: { x: p.x, y: p.y },
      });
      // Implicit assignment: placing a reader on this site's floor assigns it to
      // the site if it isn't already (enables floor-zone resolution).
      const placed = fixedReaders.find((d) => d.id === selectedDeviceId);
      if (placed && placed.site_id !== site.id) {
        await updateDevice.mutateAsync({ id: selectedDeviceId, data: { site_id: site.id } });
      }
      message.success(`Placed at (${p.x}, ${p.y})`);
    } catch {
      message.error('Failed to place reader');
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Space wrap>
        <Text>Place reader:</Text>
        <Select
          allowClear
          placeholder="Select a fixed reader"
          style={{ width: 240 }}
          value={selectedDeviceId}
          onChange={setSelectedDeviceId}
          options={fixedReaders.map((d) => ({ label: d.name, value: d.id }))}
          data-testid="floor-reader-select"
        />
        <Text type="secondary">then click the floor to drop its port-0 location.</Text>
      </Space>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${extentX} ${extentY}`}
        preserveAspectRatio="none"
        onClick={handleClick}
        data-testid="floor-canvas"
        style={{
          width: '100%',
          aspectRatio: `${extentX} / ${extentY}`,
          border: `1px solid ${t.colorBorder}`,
          cursor: selectedDeviceId ? 'crosshair' : 'default',
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
          <ReaderDot
            key={d.id}
            device={d}
            extentY={extentY}
            originAnchor={originAnchor}
            radius={dotRadius}
            fill={d.id === selectedDeviceId ? t.colorSuccess : t.colorAccent}
            ringColor={t.colorSurface}
          />
        ))}
      </svg>
    </Space>
  );
}
