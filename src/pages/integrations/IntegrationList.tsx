import { useState } from 'react';
import { Table, Tag, Button, Switch, Space, Modal, Form, Input, Select, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { useIntegrations, useCreateIntegration, useUpdateIntegration, useDeleteIntegration } from '@/hooks/useIntegrations';
import type { IntegrationResponse, IntegrationCreate } from '@/types';

const { Title } = Typography;

const TYPE_OPTIONS = [
  { label: 'Webhook', value: 'webhook' },
  { label: 'SSE', value: 'sse' },
  { label: 'Export', value: 'export' },
];

export function IntegrationList() {
  const navigate = useNavigate();
  const { data, isLoading } = useIntegrations();
  const createIntegration = useCreateIntegration();
  const updateIntegration = useUpdateIntegration();
  const deleteIntegration = useDeleteIntegration();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<IntegrationCreate & { eventsStr?: string; configUrl?: string }>();

  const handleToggle = (id: string, enabled: boolean) => {
    updateIntegration.mutate({ id, data: { enabled } });
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Delete Integration',
      content: 'Are you sure?',
      okType: 'danger',
      onOk: () => deleteIntegration.mutateAsync(id),
    });
  };

  const handleCreate = async (values: IntegrationCreate & { eventsStr?: string; configUrl?: string }) => {
    const events = (values.eventsStr ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    const config: Record<string, unknown> = {};
    if (values.configUrl) config.url = values.configUrl;
    await createIntegration.mutateAsync({
      name: values.name,
      type: values.type,
      events,
      config,
      enabled: true,
    });
    message.success('Integration created');
    setOpen(false);
    form.resetFields();
  };

  const columns: ColumnsType<IntegrationResponse> = [
    { title: 'Name', dataIndex: 'name' },
    {
      title: 'Type',
      dataIndex: 'type',
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'Events',
      dataIndex: 'events',
      render: (events: string[]) => events.map((e) => <Tag key={e}>{e}</Tag>),
    },
    {
      title: 'Health',
      dataIndex: 'health_status',
      render: (v: string) => (
        <Tag color={v === 'healthy' ? 'green' : v === 'degraded' ? 'orange' : 'red'}>{v}</Tag>
      ),
    },
    {
      title: 'Enabled',
      dataIndex: 'enabled',
      render: (enabled: boolean, record) => (
        <Switch checked={enabled} onChange={(v) => handleToggle(record.id, v)} />
      ),
    },
    {
      title: 'Last Triggered',
      dataIndex: 'last_triggered',
      render: (v: string | null) => (v ? new Date(v).toLocaleString() : '—'),
    },
    {
      title: 'Actions',
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => navigate(`/integrations/${record.id}/deliveries`)}>
            Deliveries
          </Button>
          <Button size="small" danger onClick={() => handleDelete(record.id)}>
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Integrations</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Create Integration
        </Button>
      </div>
      <Table rowKey="id" columns={columns} dataSource={data} loading={isLoading} pagination={{ pageSize: 20 }} />
      <Modal title="Create Integration" open={open} onCancel={() => setOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select options={TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="eventsStr" label="Events (comma-separated)" rules={[{ required: true }]}>
            <Input placeholder="tag_read.created, alert.triggered" />
          </Form.Item>
          <Form.Item name="configUrl" label="URL (for webhooks)">
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={createIntegration.isPending}>
              Create
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
