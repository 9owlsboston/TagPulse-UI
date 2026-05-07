import { useMemo } from 'react';
import { Descriptions, Empty, Spin, Tag, Typography } from 'antd';
import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { useRecentReads } from '@/hooks/useTagReads';

const { Title } = Typography;

// Leaflet's default icon paths break under bundlers; rewire to imported assets.
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

interface Props {
  deviceId: string;
}

export function DeviceLocationTab({ deviceId }: Props) {
  const { data: reads, isLoading } = useRecentReads(deviceId, 100);

  const lastWithLocation = useMemo(
    () => (reads ?? []).find((r) => r.latitude != null && r.longitude != null),
    [reads],
  );

  if (isLoading) return <Spin />;

  if (!lastWithLocation) {
    return <Empty description="No reads with location yet for this device" />;
  }

  const lat = lastWithLocation.latitude!;
  const lon = lastWithLocation.longitude!;
  const accuracy = lastWithLocation.location_accuracy_m ?? null;

  return (
    <div>
      <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Latitude">{lat.toFixed(5)}</Descriptions.Item>
        <Descriptions.Item label="Longitude">{lon.toFixed(5)}</Descriptions.Item>
        <Descriptions.Item label="Accuracy">
          {accuracy != null ? `${accuracy.toFixed(1)} m` : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Source">
          {lastWithLocation.location_source ? <Tag>{lastWithLocation.location_source}</Tag> : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Timestamp" span={2}>
          {new Date(lastWithLocation.timestamp).toLocaleString()}
        </Descriptions.Item>
      </Descriptions>
      <Title level={5}>Last Known Position</Title>
      <div style={{ height: 360, width: '100%', border: '1px solid #f0f0f0', borderRadius: 4 }}>
        <MapContainer
          center={[lat, lon]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[lat, lon]}>
            <Popup>
              {lat.toFixed(5)}, {lon.toFixed(5)}
              <br />
              {new Date(lastWithLocation.timestamp).toLocaleString()}
            </Popup>
          </Marker>
          {accuracy != null && accuracy > 0 && (
            <Circle center={[lat, lon]} radius={accuracy} pathOptions={{ color: '#1890ff' }} />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
