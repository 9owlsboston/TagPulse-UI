import { useState } from 'react';
import { Table, Tag, Button, Switch, Space, Modal, Form, Input, Select, InputNumber, Typography, message } from 'antd';
import { PlusOutlined, ThunderboltOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useIntegrations, useCreateIntegration, useUpdateIntegration, useDeleteIntegration } from '@/hooks/useIntegrations';
import { integrationTestApi } from '@/api/client';
import { RoleGuard } from '@/components/RoleGuard';
import { useCanPerform } from '@/components/useCanPerform';
import type { IntegrationResponse, IntegrationCreate } from '@/types';

const { Title, Text } = Typography;

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
  const canEdit = useCanPerform('editor');
  const canDelete = useCanPerform('admin');
  const [open, setOpen] = useState(false);
  const [integrationType, setIntegrationType] = useState<string>('webhook');
  const [form] = Form.useForm<IntegrationCreate & { eventsStr?: string; configUrl?: string; configSchedule?: string; configFormat?: string; configMaxConnections?: number }>();
  const [testResult, setTestResult] = useState<Record<string, { status_code: number; response_time_ms: number; error?: string }>>({});

  const testMutation = useMutation({
    mutationFn: (id: string) => integrationTestApi.test(id),
    onSuccess: (result, id) => {
      setTestResult((prev) => ({ ...prev, [id]: result }));
      message.success(`Test fired: ${result.status_code} in ${result.response_time_ms}ms`);
    },
    onError: (err: Error, id) => {
      setTestResult((prev) => ({ ...prev, [id]: { status_code: 0, response_time_ms: 0, error: err.message } }));
      message.error(`Test failed: ${err.message}`);
    },
  });

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

  const handleCreate = async (values: IntegrationCreate & { eventsStr?: string; configUrl?: string; configSchedule?: string; configFormat?: string; configMaxConnections?: number }) => {
    const events = (values.eventsStr ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    const config: Record<string, unknown> = {};
    if (integrationType === 'webhook' && values.configUrl) config.url = values.configUrl;
    if (integrationType === 'sse' && values.configMaxConnections) config.max_connections = values.configMaxConnections;
    if (integrationType === 'export') {
      if (values.configSchedule) config.schedule = values.configSchedule;
      if (values.configFormat) config.format = values.configFormat;
    }
    await createIntegration.mutateAsync({
      name: values.name,
      type: integrationType as IntegrationCreate['type'],
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
        <Switch checked={enabled} onChange={(v) => handleToggle(record.id, v)} disabled={!canEdit} />
      ),
    },
    {
      title: 'Last Triggered',
      dataIndex: 'last_triggered',
      render: (v: string | null) => (v ? new Date(v).toLocaleString() : '—'),
    },
    {
      title: 'Actions',
      width: 260,
      render: (_, record) => (
        <Space direction="vertical" size={4}>
          <Space>
            <Button size="small" onClick={() => navigate(`/integrations/${record.id}/deliveries`)}>
              Deliveries
            </Button>
            {record.type === 'webhook' && canEdit && (
              <Button
                size="small"
                icon={<ThunderboltOutlined />}
                onClick={() => testMutation.mutate(record.id)}
                loading={testMutation.isPending && testMutation.variables === record.id}
              >
                Test
              </Button>
            )}
            {canDelete && (
              <Button size="small" danger onClick={() => handleDelete(record.id)}>
                Delete
              </Button>
            )}
          </Space>
          {testResult[record.id] && (
            <Text
              type={testResult[record.id].error ? 'danger' : 'success'}
              style={{ fontSize: 12 }}
            >
              {testResult[record.id].error
                ? `Error: ${testResult[record.id].error}`
                : `${testResult[record.id].status_code} · ${testResult[record.id].response_time_ms}ms`}
            </Text>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Integrations</Title>
        <RoleGuard roles={['admin', 'editor']}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            Create Integration
          </Button>
        </RoleGuard>
      </div>
      <Table rowKey="id" columns={columns} dataSource={data} loading={isLoading} pagination={{ pageSize: 20 }} />
      <Modal title="Create Integration" open={open} onCancel={() => setOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select options={TYPE_OPTIONS} onChange={(v) => setIntegrationType(v)} />
          </Form.Item>
          <Form.Item name="eventsStr" label="Events (comma-separated)" rules={[{ required: true }]}>
            <Input placeholder="tag_read.created, alert.triggered" />
          </Form.Item>
          {integrationType === 'webhook' && (
            <Form.Item name="configUrl" label="Webhook URL" rules={[{ required: true }]}>
              <Input placeholder="https://..." />
            </Form.Item>
          )}
          {integrationType === 'sse' && (
            <Form.Item name="configMaxConnections" label="Max Connections">
              <InputNumber min={1} max={1000} placeholder="100" style={{ width: '100%' }} />
            </Form.Item>
          )}
          {integrationType === 'export' && (
            <>
              <Form.Item name="configSchedule" label="Schedule (cron)" rules={[{ required: true }]}>
                <Input placeholder="0 0 * * *" />
              </Form.Item>
              <Form.Item name="configFormat" label="Format" rules={[{ required: true }]}>
                <Select options={[{ label: 'CSV', value: 'csv' }, { label: 'JSON', value: 'json' }]} />
              </Form.Item>
            </>
          )}
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
