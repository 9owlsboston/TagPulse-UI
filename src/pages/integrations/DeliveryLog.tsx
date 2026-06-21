import { useParams } from 'react-router-dom';
import Table from 'antd/es/table';
import Tag from 'antd/es/tag';
import type { ColumnsType } from 'antd/es/table';
import { useDeliveries } from '@/hooks/useIntegrations';
import { ListPageShell } from '@/components/ListPageShell';
import { EmptyState } from '@/components/EmptyState';
import { excelColumn } from '@/components/ExcelColumn';
import type { DeliveryResponse } from '@/types';

export function DeliveryLog() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useDeliveries(id!);
  const rows = data ?? [];

  const columns: ColumnsType<DeliveryResponse> = [
    {
      title: 'Time',
      dataIndex: 'created_at',
      ...excelColumn<DeliveryResponse>({ rows, accessor: (r) => r.created_at, kind: 'date' }),
      render: (v: string) => new Date(v).toLocaleString(),
      defaultSortOrder: 'descend',
    },
    { title: 'Event', dataIndex: 'event_type', ...excelColumn<DeliveryResponse>({ rows, accessor: (r) => r.event_type, kind: 'enum' }) },
    {
      title: 'Status',
      dataIndex: 'status',
      ...excelColumn<DeliveryResponse>({ rows, accessor: (r) => r.status, kind: 'enum' }),
      render: (v: string) => (
        <Tag color={v === 'success' ? 'green' : v === 'pending' ? 'orange' : 'red'}>{v}</Tag>
      ),
    },
    { title: 'Attempts', dataIndex: 'attempts', ...excelColumn<DeliveryResponse>({ rows, accessor: (r) => r.attempts, kind: 'number' }) },
    {
      title: 'Response',
      dataIndex: 'response_code',
      ...excelColumn<DeliveryResponse>({ rows, accessor: (r) => r.response_code, kind: 'number' }),
      render: (v: number | null) => v ?? '—',
    },
    {
      title: 'Error',
      dataIndex: 'error_message',
      ...excelColumn<DeliveryResponse>({ rows, accessor: (r) => r.error_message, kind: 'text' }),
      render: (v: string | null) => v ?? '—',
    },
  ];

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
