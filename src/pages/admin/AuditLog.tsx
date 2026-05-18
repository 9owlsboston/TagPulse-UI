import { useState } from 'react';
import Typography from 'antd/es/typography';
import Table from 'antd/es/table';
import Segmented from 'antd/es/segmented';
import Tag from 'antd/es/tag';
import Spin from 'antd/es/spin';
import Empty from 'antd/es/empty';
import Tooltip from 'antd/es/tooltip';
import type { ColumnsType } from 'antd/es/table';
import { useAuditLogs, DEVICE_SECURITY_ACTIONS } from '@/hooks/useAuditLogs';
import type { AuditLogEntry } from '@/api/client';

const { Title, Text } = Typography;

type Preset = 'all' | 'device-security' | 'tenant-config' | 'user-management';

const PRESET_ACTIONS: Record<Preset, string[] | undefined> = {
  all: undefined,
  'device-security': DEVICE_SECURITY_ACTIONS,
  'tenant-config': ['tenant.map_config.update', 'tenant.update'],
  'user-management': ['user.create', 'user.update', 'user.delete'],
};

const ACTION_COLORS: Record<string, string> = {
  'device.token_rotated': 'gold',
  'device.cert_attached': 'geekblue',
  'device.approved': 'green',
  'device.rejected': 'red',
};

export function AuditLog() {
  const [preset, setPreset] = useState<Preset>('all');

  const { data: logs, isLoading } = useAuditLogs({
    actions: PRESET_ACTIONS[preset],
    limit: 200,
  });

  const columns: ColumnsType<AuditLogEntry> = [
    {
      title: 'Timestamp',
      dataIndex: 'created_at',
      width: 200,
      render: (v: string) => new Date(v).toLocaleString(),
      sorter: (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Action',
      dataIndex: 'action',
      width: 220,
      render: (v: string) => <Tag color={ACTION_COLORS[v] ?? 'default'}>{v}</Tag>,
    },
    {
      title: 'Resource',
      width: 280,
      render: (_: unknown, r: AuditLogEntry) => (
        <Text code>
          {r.resource_type}:{r.resource_id}
        </Text>
      ),
    },
    {
      title: 'User',
      dataIndex: 'user_id',
      width: 280,
      render: (v: string | null) => (v ? <Text code>{v}</Text> : <Text type="secondary">system</Text>),
    },
    {
      title: 'Changes',
      dataIndex: 'changes',
      render: (v: Record<string, unknown> | null) => {
        if (!v) return <Text type="secondary">—</Text>;
        const json = JSON.stringify(v);
        const peek = json.length > 80 ? json.slice(0, 77) + '…' : json;
        return (
          <Tooltip title={<pre style={{ margin: 0 }}>{JSON.stringify(v, null, 2)}</pre>}>
            <Text code>{peek}</Text>
          </Tooltip>
        );
      },
    },
  ];

  return (
    <div>
      <Title level={2}>Audit Log</Title>
      <Text type="secondary">
        Tenant-scoped audit trail. Use presets to focus on common investigation flows.
      </Text>

      <div style={{ margin: '16px 0' }}>
        <Segmented
          value={preset}
          onChange={(v) => setPreset(v as Preset)}
          options={[
            { label: 'All', value: 'all' },
            { label: 'Device security events', value: 'device-security' },
            { label: 'Tenant config', value: 'tenant-config' },
            { label: 'User management', value: 'user-management' },
          ]}
        />
      </div>

      {isLoading ? (
        <Spin size="large" />
      ) : !logs || logs.length === 0 ? (
        <Empty description="No audit entries match this filter" />
      ) : (
        <Table<AuditLogEntry>
          rowKey="id"
          columns={columns}
          dataSource={logs}
          pagination={{ pageSize: 50, showSizeChanger: false }}
          size="small"
        />
      )}
    </div>
  );
}
