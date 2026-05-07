import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Descriptions, Tag, Tabs, Button, Spin, Modal, Typography, Space, Alert, Input, Form, message } from 'antd';
import { CopyOutlined, ReloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useDevice, useDecommissionDevice, useRotateDeviceToken, useAttachDeviceCert } from '@/hooks/useDevices';
import { RoleGuard } from '@/components/RoleGuard';
import { useRecentReads } from '@/hooks/useTagReads';
import { useDeviceHealth } from '@/hooks/useDeviceHealth';
import { useZones } from '@/hooks/useAssets';
import { DeviceTelemetryTab } from '@/pages/devices/DeviceTelemetryTab';
import { DeviceLocationTab } from '@/pages/devices/DeviceLocationTab';

const { Title, Text } = Typography;

export function DeviceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: device, isLoading } = useDevice(id!);
  const { data: recentReads } = useRecentReads(id!, 100);
  const { data: health } = useDeviceHealth(id!);
  const { data: zones } = useZones();
  const decommission = useDecommissionDevice();
  const rotateToken = useRotateDeviceToken();
  const attachCert = useAttachDeviceCert();
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certForm] = Form.useForm<{ cert_pem: string }>();

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

  const handleRotateToken = () => {
    Modal.confirm({
      title: 'Rotate Device Token',
      content: (
        <>
          <p>
            This will <b>immediately invalidate</b> the current token for{' '}
            <b>{device.name}</b>. The device will need to be reconfigured with
            the new token to reconnect.
          </p>
          <p>The new token is shown <b>once</b> — copy it now.</p>
        </>
      ),
      okText: 'Rotate',
      okType: 'danger',
      onOk: async () => {
        const result = await rotateToken.mutateAsync(device.id);
        setRevealedToken(result.token);
      },
    });
  };

  const copyToken = async () => {
    if (!revealedToken) return;
    try {
      await navigator.clipboard.writeText(revealedToken);
      message.success('Token copied to clipboard');
    } catch {
      message.error('Copy failed — select and copy manually');
    }
  };

  const lastRead = recentReads?.[0];

  const coveredZones = (zones ?? []).filter((z) =>
    (z.fixed_reader_ids ?? []).includes(device.id),
  );

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
          <Title level={5} style={{ marginTop: 24 }}>Covers Zones</Title>
          {coveredZones.length > 0 ? (
            <Space size={[4, 4]} wrap>
              {coveredZones.map((z) => (
                <Tag color="blue" key={z.id}>{z.name}</Tag>
              ))}
            </Space>
          ) : (
            <Typography.Text type="secondary">
              This device is not assigned to any zone.
            </Typography.Text>
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
    {
      key: 'heartbeat',
      label: 'Heartbeat',
      children: (
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Connection">
            <Tag color={device.connection_state === 'online' ? 'green' : 'red'}>
              {device.connection_state}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Firmware">
            {device.firmware_version ?? '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Last Seen">
            {device.last_seen ? new Date(device.last_seen).toLocaleString() : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Mobility">
            <Tag>{device.mobility ?? 'fixed'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Configuration" span={2}>
            <pre style={{ margin: 0, maxHeight: 240, overflow: 'auto' }}>
              {JSON.stringify(device.configuration ?? {}, null, 2)}
            </pre>
          </Descriptions.Item>
        </Descriptions>
      ),
    },
    {
      key: 'security',
      label: 'Security',
      children: (
        <>
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Token Prefix">
              {device.token_prefix ? <Text code>{device.token_prefix}…</Text> : <Text type="secondary">— never rotated —</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="Last Rotated">
              {device.token_rotated_at
                ? new Date(device.token_rotated_at).toLocaleString()
                : <Text type="secondary">never</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="Cert Thumbprint" span={2}>
              {device.cert_thumbprint
                ? <Text code copyable>{device.cert_thumbprint}</Text>
                : <Text type="secondary">no certificate attached</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="Cert Subject" span={2}>
              {device.cert_subject
                ? <Text code>{device.cert_subject}</Text>
                : <Text type="secondary">—</Text>}
            </Descriptions.Item>
          </Descriptions>
          <RoleGuard roles={['admin']}>
            <div style={{ marginTop: 16 }}>
              <Space wrap>
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={handleRotateToken}
                  loading={rotateToken.isPending}
                >
                  Rotate token
                </Button>
                <Button
                  icon={<SafetyCertificateOutlined />}
                  onClick={() => setCertModalOpen(true)}
                >
                  {device.cert_thumbprint ? 'Replace cert' : 'Attach cert'}
                </Button>
              </Space>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">
                  Per ADR-011 Phase 1 — token is invalidated immediately; device
                  must reconnect with the new value. Per ADR-012 (Sprint 17b) —
                  attaching a cert stores only the SHA-256 thumbprint + subject; PEM is not persisted.
                </Text>
              </div>
            </div>
          </RoleGuard>
        </>
      ),
    },
  ];

  return (
    <div>
      <Modal
        open={revealedToken !== null}
        title="New device token (copy now — shown once)"
        onCancel={() => setRevealedToken(null)}
        onOk={() => setRevealedToken(null)}
        okText="I have copied the token"
        cancelButtonProps={{ style: { display: 'none' } }}
      >
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="The backend stores only a SHA-256 hash. If you lose this value, you must rotate again."
        />
        <Space.Compact style={{ width: '100%' }}>
          <pre
            style={{
              flex: 1,
              padding: 8,
              background: '#fafafa',
              border: '1px solid #d9d9d9',
              borderRadius: 4,
              margin: 0,
              wordBreak: 'break-all',
              whiteSpace: 'pre-wrap',
            }}
          >
            {revealedToken}
          </pre>
        </Space.Compact>
        <Button
          icon={<CopyOutlined />}
          onClick={copyToken}
          style={{ marginTop: 8 }}
        >
          Copy to clipboard
        </Button>
      </Modal>
      <Modal
        open={certModalOpen}
        title="Attach client certificate"
        onCancel={() => setCertModalOpen(false)}
        onOk={() => certForm.submit()}
        okText="Attach"
        confirmLoading={attachCert.isPending}
        width={640}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Per ADR-012 — the backend parses the cert, stores the SHA-256 thumbprint and RFC 4514 subject, and discards the PEM. PEM is never persisted."
        />
        <Form
          form={certForm}
          layout="vertical"
          onFinish={async ({ cert_pem }) => {
            try {
              await attachCert.mutateAsync({ id: device.id, cert_pem });
              message.success('Certificate attached');
              setCertModalOpen(false);
              certForm.resetFields();
            } catch (err) {
              message.error(err instanceof Error ? err.message : 'Failed to attach cert');
            }
          }}
        >
          <Form.Item
            name="cert_pem"
            label="PEM-encoded X.509 certificate"
            rules={[
              { required: true, message: 'Paste a PEM-encoded certificate' },
              {
                validator: (_, value: string) =>
                  value && value.includes('BEGIN CERTIFICATE')
                    ? Promise.resolve()
                    : Promise.reject(new Error('Must contain a BEGIN CERTIFICATE marker')),
              },
            ]}
          >
            <Input.TextArea rows={10} placeholder={'-----BEGIN CERTIFICATE-----\nMIIB…\n-----END CERTIFICATE-----'} />
          </Form.Item>
        </Form>
      </Modal>
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
