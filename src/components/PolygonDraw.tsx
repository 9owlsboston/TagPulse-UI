/**
 * Sprint 17a — minimal click-to-draw polygon editor for the Zone create modal.
 *
 * Uses pure react-leaflet event handlers (no leaflet-draw dependency) — each
 * click adds a vertex; the polygon auto-closes for preview. Outputs a GeoJSON
 * Polygon (`{type: 'Polygon', coordinates: [[[lng, lat], …, [lng, lat]]]}`)
 * via `onChange`. Server validates ring closure / vertex limits.
 */
import { useState } from 'react';
import { MapContainer, TileLayer, Polygon, CircleMarker, useMapEvents } from 'react-leaflet';
import Button from 'antd/es/button';
import Space from 'antd/es/space';
import Typography from 'antd/es/typography';
import { DeleteOutlined, UndoOutlined } from '@ant-design/icons';
import 'leaflet/dist/leaflet.css';

import { useMapConfig, OSM_FALLBACK } from '@/hooks/useMapConfig';

const { Text } = Typography;

interface PolygonGeoJSON {
  type: 'Polygon';
  coordinates: number[][][];
}

interface PolygonDrawProps {
  value?: PolygonGeoJSON | null;
  onChange?: (geojson: PolygonGeoJSON | null) => void;
  height?: number;
  center?: [number, number];
}

function ClickCapture({ onAdd }: { onAdd: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onAdd(e.latlng.lat, e.latlng.lng) });
  return null;
}

export function PolygonDraw({ value, onChange, height = 320, center = [37.7749, -122.4194] }: PolygonDrawProps) {
  const { data: mapConfigData } = useMapConfig();
  const mapConfig = mapConfigData ?? OSM_FALLBACK;

  // GeoJSON coords are [lng, lat]. Convert to Leaflet [lat, lng].
  const initialVertices: [number, number][] =
    value?.coordinates?.[0]?.slice(0, -1).map((pt) => [pt[1], pt[0]] as [number, number]) ?? [];
  const [vertices, setVertices] = useState<[number, number][]>(initialVertices);

  const emit = (next: [number, number][]) => {
    if (next.length < 3) {
      onChange?.(null);
      return;
    }
    const ring: number[][] = next.map(([lat, lng]) => [lng, lat]);
    ring.push(ring[0]!); // close
    onChange?.({ type: 'Polygon', coordinates: [ring] });
  };

  const addVertex = (lat: number, lng: number) => {
    const next = [...vertices, [lat, lng] as [number, number]];
    setVertices(next);
    emit(next);
  };

  const undoVertex = () => {
    const next = vertices.slice(0, -1);
    setVertices(next);
    emit(next);
  };

  const clearAll = () => {
    setVertices([]);
    onChange?.(null);
  };

  return (
    <div>
      <Space style={{ marginBottom: 8 }}>
        <Text type="secondary">Click on the map to add vertices ({vertices.length}/500)</Text>
        <Button size="small" icon={<UndoOutlined />} onClick={undoVertex} disabled={vertices.length === 0}>
          Undo
        </Button>
        <Button size="small" icon={<DeleteOutlined />} onClick={clearAll} disabled={vertices.length === 0} danger>
          Clear
        </Button>
      </Space>
      <div style={{ height, width: '100%', border: '1px solid #d9d9d9' }}>
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url={mapConfig.tile_url_template}
            attribution={mapConfig.attribution}
            maxZoom={mapConfig.max_zoom ?? 19}
            subdomains={mapConfig.subdomains ?? undefined}
          />
          <ClickCapture onAdd={addVertex} />
          {vertices.map((v, i) => (
            <CircleMarker key={i} center={v} radius={4} pathOptions={{ color: '#1677ff' }} />
          ))}
          {vertices.length >= 3 && (
            <Polygon positions={vertices} pathOptions={{ color: '#1677ff', fillOpacity: 0.15 }} />
          )}
        </MapContainer>
      </div>
      {vertices.length > 0 && vertices.length < 3 && (
        <Text type="warning" style={{ display: 'block', marginTop: 6 }}>
          A polygon needs at least 3 vertices.
        </Text>
      )}
    </div>
  );
}
