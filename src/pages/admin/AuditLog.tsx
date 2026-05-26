import { useState } from 'react';
import Typography from 'antd/es/typography';
import Table from 'antd/es/table';
import Segmented from 'antd/es/segmented';
import Tag from 'antd/es/tag';
import Tooltip from 'antd/es/tooltip';
import type { ColumnsType } from 'antd/es/table';
import { useAuditLogs, DEVICE_SECURITY_ACTIONS } from '@/hooks/useAuditLogs';
import { ListPageShell } from '@/components/ListPageShell';
import { EmptyState } from '@/components/EmptyState';
import type { AuditLogEntry } from '@/api/client';

const { Text } = Typography;

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

  const rows = logs ?? [];
  const filtersActive = preset !== 'all';

  return (
    <ListPageShell
      testId="audit-log-page"
      title="Audit Log"
      count={rows.length}
      countTestId="audit-log-count"
      description="Tenant-scoped audit trail. Use presets to focus on common investigation flows."
      toolbar={
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
      }
    >
      <Table<AuditLogEntry>
        rowKey="id"
        columns={columns}
        dataSource={rows}
        loading={isLoading}
        pagination={{ pageSize: 50, showSizeChanger: false }}
        size="small"
        locale={{
          emptyText: filtersActive ? (
            <EmptyState
              title="No audit entries match this filter"
              description="Switch to a different preset or clear the filter to see other events."
            />
          ) : (
            <EmptyState
              title="No audit entries yet"
              description="Tenant activity will appear here as users and devices interact with the system."
            />
          ),
        }}
      />
    </ListPageShell>
  );
}
