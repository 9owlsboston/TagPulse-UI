import { useParams, useNavigate } from 'react-router-dom';
import { Descriptions, Tag, Tabs, Button, Spin, Modal, Typography } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDevice, useDecommissionDevice } from '@/hooks/useDevices';
import { RoleGuard } from '@/components/RoleGuard';
import { useRecentReads } from '@/hooks/useTagReads';
import { useDeviceHealth } from '@/hooks/useDeviceHealth';

const { Title } = Typography;

export function DeviceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: device, isLoading } = useDevice(id!);
  const { data: recentReads } = useRecentReads(id!, 100);
  const { data: health } = useDeviceHealth(id!);
  const decommission = useDecommissionDevice();

  if (isLoading || !device) return <Spin size="large" />;

  const handleDecommission = () => {
    Modal.confirm({
      title: 'Decommission Device',
      content: `Are you sure you want to decommission "${device.name}"?`,
      okType: 'danger',
      onOk: async () => {
        await decommission.mutateAsync(device.id);
        navigate('/devices');
      },
    });
  };

  const chartData = (recentReads ?? []).map((r) => ({
    time: new Date(r.timestamp).toLocaleTimeString(),
    signal: r.signal_strength ?? 0,
  }));

  const tabItems = [
    {
      key: 'overview',
      label: 'Overview',
      children: (
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Name">{device.name}</Descriptions.Item>
          <Descriptions.Item label="Type">{device.device_type}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={device.status === 'active' ? 'green' : 'default'}>{device.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Connection">
            <Tag color={device.connection_state === 'online' ? 'green' : 'red'}>{device.connection_state}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Firmware">{device.firmware_version ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Last Seen">{device.last_seen ? new Date(device.last_seen).toLocaleString() : '—'}</Descriptions.Item>
          <Descriptions.Item label="Metadata" span={2}>
            <pre style={{ margin: 0 }}>{JSON.stringify(device.metadata, null, 2)}</pre>
          </Descriptions.Item>
        </Descriptions>
      ),
    },
    {
      key: 'telemetry',
      label: 'Telemetry',
      children: (
        <div>
          <Title level={5}>Recent Signal Strength</Title>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="signal" stroke="#1890ff" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ),
    },
    {
      key: 'health',
      label: 'Health',
      children: health ? (
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Reads/Hour">{health.reads_last_hour}</Descriptions.Item>
          <Descriptions.Item label="Error Rate">{(health.error_rate * 100).toFixed(1)}%</Descriptions.Item>
          <Descriptions.Item label="Connection">
            <Tag color={health.connection_state === 'online' ? 'green' : 'red'}>{health.connection_state}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Last Seen">{health.last_seen ? new Date(health.last_seen).toLocaleString() : '—'}</Descriptions.Item>
        </Descriptions>
      ) : (
        <Spin />
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>{device.name}</Title>
        {device.status === 'active' && (
          <RoleGuard roles={['admin']}>
            <Button danger onClick={handleDecommission} loading={decommission.isPending}>
              Decommission
            </Button>
          </RoleGuard>
        )}
      </div>
      <Tabs items={tabItems} />
    </div>
  );
}
