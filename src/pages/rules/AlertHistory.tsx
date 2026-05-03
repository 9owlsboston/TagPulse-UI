import { useState } from 'react';
import { Table, Tag, Button, Select, Space, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useAlerts, useAcknowledgeAlert } from '@/hooks/useAlerts';
import { useCanPerform } from '@/components/useCanPerform';
import type { AlertResponse } from '@/types';

const { Title } = Typography;

const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'Acknowledged', value: 'acknowledged' },
];

export function AlertHistory() {
  const [status, setStatus] = useState('');
  const { data, isLoading } = useAlerts({ status: status || undefined });
  const acknowledge = useAcknowledgeAlert();
  const canAcknowledge = useCanPerform('editor');

  const columns: ColumnsType<AlertResponse> = [
    {
      title: 'Time',
      dataIndex: 'triggered_at',
      render: (v: string) => new Date(v).toLocaleString(),
      sorter: (a, b) => new Date(a.triggered_at).getTime() - new Date(b.triggered_at).getTime(),
      defaultSortOrder: 'descend',
    },
    { title: 'Message', dataIndex: 'message' },
    {
      title: 'Severity',
      dataIndex: 'severity',
      render: (v: string) => (
        <Tag color={v === 'critical' ? 'red' : v === 'warning' ? 'orange' : 'blue'}>{v}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => (
        <Tag color={v === 'open' ? 'red' : 'green'}>{v}</Tag>
      ),
    },
    {
      title: 'Device',
      dataIndex: 'device_id',
      render: (v: string | null) => v ?? '—',
    },
    {
      title: 'Actions',
      render: (_, record) =>
        record.status === 'open' && canAcknowledge ? (
          <Button
            size="small"
            onClick={() => acknowledge.mutate(record.id)}
            loading={acknowledge.isPending}
          >
            Acknowledge
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <Title level={2}>Alert History</Title>
      <Space style={{ marginBottom: 16 }}>
        <Select options={STATUS_OPTIONS} value={status} onChange={setStatus} style={{ width: 160 }} />
      </Space>
      <Table rowKey="id" columns={columns} dataSource={data} loading={isLoading} pagination={{ pageSize: 20 }} />
    </div>
  );
}
