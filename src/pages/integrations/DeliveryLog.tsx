import { useParams } from 'react-router-dom';
import Table from 'antd/es/table';
import Tag from 'antd/es/tag';
import type { ColumnsType } from 'antd/es/table';
import { useDeliveries } from '@/hooks/useIntegrations';
import { ListPageShell } from '@/components/ListPageShell';
import { EmptyState } from '@/components/EmptyState';
import type { DeliveryResponse } from '@/types';

const columns: ColumnsType<DeliveryResponse> = [
  {
    title: 'Time',
    dataIndex: 'created_at',
    render: (v: string) => new Date(v).toLocaleString(),
    sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    defaultSortOrder: 'descend',
  },
  { title: 'Event', dataIndex: 'event_type' },
  {
    title: 'Status',
    dataIndex: 'status',
    render: (v: string) => (
      <Tag color={v === 'success' ? 'green' : v === 'pending' ? 'orange' : 'red'}>{v}</Tag>
    ),
  },
  { title: 'Attempts', dataIndex: 'attempts' },
  {
    title: 'Response',
    dataIndex: 'response_code',
    render: (v: number | null) => v ?? '—',
  },
  {
    title: 'Error',
    dataIndex: 'error_message',
    render: (v: string | null) => v ?? '—',
  },
];

export function DeliveryLog() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useDeliveries(id!);
  const rows = data ?? [];

  return (
    <ListPageShell
      testId="delivery-log-page"
      title="Delivery Log"
      count={rows.length}
      countTestId="delivery-log-count"
    >
      <Table
        rowKey="id"
        columns={columns}
        dataSource={rows}
        loading={isLoading}
        pagination={{ defaultPageSize: 20, showSizeChanger: true, pageSizeOptions: [20, 50, 100] }}
        locale={{
          emptyText: (
            <EmptyState
              title="No deliveries yet"
              description="Webhook deliveries appear here once this integration starts processing events."
            />
          ),
        }}
      />
    </ListPageShell>
  );
}
