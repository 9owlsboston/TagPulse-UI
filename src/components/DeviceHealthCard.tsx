import { Card, Tag, Typography } from 'antd';
import type { DeviceHealthSummary } from '@/types';

const { Text } = Typography;

interface DeviceHealthCardProps {
  device: DeviceHealthSummary;
}

export function DeviceHealthCard({ device }: DeviceHealthCardProps) {
  const color = device.connection_state === 'online' ? 'green' : 'red';

  return (
    <Card size="small" style={{ width: 200 }}>
      <Text strong>{device.name}</Text>
      <div style={{ marginTop: 8 }}>
        <Tag color={color}>{device.connection_state}</Tag>
      </div>
      <div style={{ marginTop: 4 }}>
        <Text type="secondary">{device.reads_last_hour} reads/hr</Text>
      </div>
    </Card>
  );
}
