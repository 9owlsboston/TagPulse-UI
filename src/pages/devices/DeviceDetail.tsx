import { useParams, useNavigate } from 'react-router-dom';
import { Descriptions, Tag, Tabs, Button, Spin, Modal, Typography } from 'antd';
import { useDevice, useDecommissionDevice } from '@/hooks/useDevices';
import { RoleGuard } from '@/components/RoleGuard';
import { useRecentReads } from '@/hooks/useTagReads';
import { useDeviceHealth } from '@/hooks/useDeviceHealth';
import { DeviceTelemetryTab } from '@/pages/devices/DeviceTelemetryTab';
import { DeviceLocationTab } from '@/pages/devices/DeviceLocationTab';

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

  const lastRead = recentReads?.[0];

  const tabItems = [
    {
      key: 'overview',
      label: 'Overview',
      children: (
        <>
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
          <Title level={5} style={{ marginTop: 24 }}>Last Read</Title>
          {lastRead ? (
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Tag ID">{lastRead.tag_id}</Descriptions.Item>
              <Descriptions.Item label="Timestamp">{new Date(lastRead.timestamp).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="EPC">{lastRead.epc ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="EPC Scheme">
                {lastRead.epc_scheme ? <Tag>{lastRead.epc_scheme}</Tag> : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="TID">{lastRead.tid ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Antenna">{lastRead.reader_antenna ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Signal">{lastRead.signal_strength ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Location">
                {lastRead.latitude != null && lastRead.longitude != null
                  ? `${lastRead.latitude.toFixed(5)}, ${lastRead.longitude.toFixed(5)}${
                      lastRead.location_source ? ` (${lastRead.location_source})` : ''
                    }`
                  : '—'}
              </Descriptions.Item>
              {lastRead.epc_decoded && Object.keys(lastRead.epc_decoded).length > 0 && (
                <Descriptions.Item label="EPC Decoded" span={2}>
                  <pre style={{ margin: 0 }}>{JSON.stringify(lastRead.epc_decoded, null, 2)}</pre>
                </Descriptions.Item>
              )}
              {lastRead.tag_data && Object.keys(lastRead.tag_data).length > 0 && (
                <Descriptions.Item label="Tag Data" span={2}>
                  <pre style={{ margin: 0 }}>{JSON.stringify(lastRead.tag_data, null, 2)}</pre>
                </Descriptions.Item>
              )}
            </Descriptions>
          ) : (
            <Typography.Text type="secondary">No reads yet</Typography.Text>
          )}
        </>
      ),
    },
    {
      key: 'telemetry',
      label: 'Telemetry',
      children: <DeviceTelemetryTab deviceId={device.id} deviceType={device.device_type} />,
    },
    {
      key: 'location',
      label: 'Location',
      children: <DeviceLocationTab deviceId={device.id} />,
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
