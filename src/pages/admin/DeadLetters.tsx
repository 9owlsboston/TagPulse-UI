/**
 * Dead-letter events admin page (Sprint 27, C5).
 *
 * Lists dead-letter events with retry/abandon actions and bulk operations.
 */
import { useState } from 'react';
import Button from 'antd/es/button';
import Modal from 'antd/es/modal';
import Space from 'antd/es/space';
import Table from 'antd/es/table';
import Tag from 'antd/es/tag';
import Typography from 'antd/es/typography';
import App from 'antd/es/app';
import type { ColumnsType } from 'antd/es/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deadLetterApi } from '@/api/client';
import { RoleGuard } from '@/components/RoleGuard';
import { ListPageShell } from '@/components/ListPageShell';
import { EmptyState } from '@/components/EmptyState';

const { Text } = Typography;

interface DeadLetterEvent {
  id: string;
  topic: string;
  error: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export function DeadLetters() {
  const qc = useQueryClient();
  const { modal, message } = App.useApp();
  const [selected, setSelected] = useState<string[]>([]);
  const [previewPayload, setPreviewPayload] = useState<Record<string, unknown> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'dead-letters'],
    queryFn: () => deadLetterApi.list(),
  });

  const retryOne = useMutation({
    mutationFn: (id: string) => deadLetterApi.retry(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'dead-letters'] });
      message.success('Event retried');
    },
    onError: () => message.error('Retry failed'),
  });

  const abandonOne = useMutation({
    mutationFn: (id: string) => deadLetterApi.abandon(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'dead-letters'] });
      message.success('Event abandoned');
    },
    onError: () => message.error('Abandon failed'),
  });

  const handleBulkRetry = async () => {
    const results = await Promise.allSettled(selected.map((id) => deadLetterApi.retry(id)));
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    qc.invalidateQueries({ queryKey: ['admin', 'dead-letters'] });
    setSelected([]);
    message.success(`${ok}/${selected.length} events retried`);
  };

  const handleBulkAbandon = () => {
    modal.confirm({
      title: 'Abandon selected events?',
      content: `${selected.length} event(s) will be permanently discarded.`,
      okType: 'danger',
      onOk: async () => {
        const results = await Promise.allSettled(selected.map((id) => deadLetterApi.abandon(id)));
        const ok = results.filter((r) => r.status === 'fulfilled').length;
        qc.invalidateQueries({ queryKey: ['admin', 'dead-letters'] });
        setSelected([]);
        message.success(`${ok}/${selected.length} events abandoned`);
      },
    });
  };

  const columns: ColumnsType<DeadLetterEvent> = [
    {
      title: 'Time',
      dataIndex: 'created_at',
      width: 200,
      render: (v: string) => new Date(v).toLocaleString(),
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      defaultSortOrder: 'descend',
    },
    { title: 'Topic', dataIndex: 'topic', width: 200 },
    {
      title: 'Error',
      dataIndex: 'error',
      ellipsis: true,
      render: (v: string) => <Text type="danger">{v}</Text>,
    },
    {
      title: 'Payload',
      width: 100,
      render: (_, record) => (
        <Button size="small" type="link" onClick={() => setPreviewPayload(record.payload)}>
          Preview
        </Button>
      ),
    },
    {
      title: 'Actions',
      width: 180,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => retryOne.mutate(record.id)} loading={retryOne.isPending}>
            Retry
          </Button>
          <Button
            size="small"
            danger
            onClick={() =>
              modal.confirm({
                title: 'Abandon event?',
                okType: 'danger',
                onOk: () => abandonOne.mutateAsync(record.id),
              })
            }
          >
            Abandon
          </Button>
        </Space>
      ),
    },
  ];

  const rows = data ?? [];

  return (
    <RoleGuard roles={['admin']}>
      <ListPageShell
        testId="dead-letters-page"
        title="Dead-letter Events"
        count={rows.length}
        countTestId="dead-letters-count"
        primaryAction={
          selected.length > 0 ? (
            <Space>
              <Tag>{selected.length} selected</Tag>
              <Button onClick={handleBulkRetry}>Retry selected</Button>
              <Button danger onClick={handleBulkAbandon}>Abandon selected</Button>
            </Space>
          ) : undefined
        }
      >
        <Table<DeadLetterEvent>
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={isLoading}
          pagination={{
            // `defaultPageSize` (uncontrolled) lets AntD own the page size so
            // the size changer actually takes effect — a literal `pageSize`
            // is *controlled* and reverts every selection back on re-render.
            defaultPageSize: 25,
            showSizeChanger: true,
            pageSizeOptions: [25, 50, 100],
          }}
          rowSelection={{
            selectedRowKeys: selected,
            onChange: (keys) => setSelected(keys as string[]),
          }}
          locale={{
            emptyText: (
              <EmptyState
                title="No dead-letter events"
                description="Events that fail processing repeatedly will appear here for manual retry or abandonment."
              />
            ),
          }}
        />
        <Modal
          title="Event payload"
          open={!!previewPayload}
          onCancel={() => setPreviewPayload(null)}
          footer={null}
          width={640}
        >
          <pre style={{ maxHeight: 400, overflow: 'auto', fontSize: 12 }}>
            {JSON.stringify(previewPayload, null, 2)}
          </pre>
        </Modal>
      </ListPageShell>
    </RoleGuard>
  );
}

export default DeadLetters;
