/**
 * Dead-letter events admin page (Sprint 27, C5).
 *
 * Lists dead-letter events with retry/abandon actions and bulk operations.
 */
import { useState } from 'react';
import { Button, Modal, Space, Table, Tag, Typography, App } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deadLetterApi } from '@/api/client';
import { RoleGuard } from '@/components/RoleGuard';

const { Title, Text } = Typography;

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

  return (
    <RoleGuard roles={['admin']}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={2} style={{ margin: 0 }}>Dead-letter Events</Title>
          {selected.length > 0 && (
            <Space>
              <Tag>{selected.length} selected</Tag>
              <Button onClick={handleBulkRetry}>Retry selected</Button>
              <Button danger onClick={handleBulkAbandon}>Abandon selected</Button>
            </Space>
          )}
        </div>
        <Table<DeadLetterEvent>
          rowKey="id"
          columns={columns}
          dataSource={data ?? []}
          loading={isLoading}
          pagination={{ pageSize: 25, showSizeChanger: true }}
          rowSelection={{
            selectedRowKeys: selected,
            onChange: (keys) => setSelected(keys as string[]),
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
      </div>
    </RoleGuard>
  );
}

export default DeadLetters;
