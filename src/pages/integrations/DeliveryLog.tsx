import { useParams } from 'react-router-dom';
import Table from 'antd/es/table';
import Tag from 'antd/es/tag';
import Typography from 'antd/es/typography';
import Spin from 'antd/es/spin';
import type { ColumnsType } from 'antd/es/table';
import { useDeliveries } from '@/hooks/useIntegrations';
import type { DeliveryResponse } from '@/types';

const { Title } = Typography;

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

  if (isLoading) return <Spin size="large" />;

  return (
    <div>
      <Title level={2}>Delivery Log</Title>
      <Table rowKey="id" columns={columns} dataSource={data} pagination={{ pageSize: 20 }} />
    </div>
  );
}
