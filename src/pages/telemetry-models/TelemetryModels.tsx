import { Table, Button, Modal, Form, Input, Typography, Space, App, InputNumber, Card, Select, Tag } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useTelemetryModels, useCreateTelemetryModel, useDeleteTelemetryModel } from '@/hooks/useTelemetryModels';
import { useTelemetryQuarantine } from '@/hooks/useTelemetry';
import { RoleGuard } from '@/components/RoleGuard';
import { useCanPerform } from '@/components/useCanPerform';
import type {
  TelemetryModelResponse,
  TelemetryModelCreate,
  MetricDefinition,
  QuarantineReason,
} from '@/types';
import type { TelemetryQuarantineResponse } from '@/api/generated/models/TelemetryQuarantineResponse';

const { Title } = Typography;

const QUARANTINE_REASONS: { label: string; value: QuarantineReason }[] = [
  { label: 'Unknown metric', value: 'unknown_metric' },
  { label: 'Out of range', value: 'out_of_range' },
  { label: 'Unit mismatch', value: 'unit_mismatch' },
  { label: 'Stale timestamp', value: 'stale_timestamp' },
];

const REASON_COLOR: Record<QuarantineReason, string> = {
  unknown_metric: 'orange',
  out_of_range: 'red',
  unit_mismatch: 'gold',
  stale_timestamp: 'volcano',
};

const columns = (onDelete: (id: string) => void, showDelete: boolean): ColumnsType<TelemetryModelResponse> => [
  { title: 'Device Type', dataIndex: 'device_type' },
  { title: 'Metrics', dataIndex: 'metrics', render: (m: MetricDefinition[]) => m.length },
  {
    title: 'Created',
    dataIndex: 'created_at',
    render: (v: string) => new Date(v).toLocaleDateString(),
  },
  ...(showDelete ? [{
    title: 'Actions',
    render: (_: unknown, record: TelemetryModelResponse) => (
      <Button danger size="small" onClick={() => onDelete(record.id)}>
        Delete
      </Button>
    ),
  }] : []),
];

export function TelemetryModels() {
  const { modal, message } = App.useApp();
  const { data, isLoading } = useTelemetryModels();
  const createModel = useCreateTelemetryModel();
  const deleteModel = useDeleteTelemetryModel();
  const canDelete = useCanPerform('admin');
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<TelemetryModelCreate>();

  const handleCreate = async (values: TelemetryModelCreate) => {
    await createModel.mutateAsync(values);
    message.success('Telemetry model created');
    setOpen(false);
    form.resetFields();
  };

  const handleDelete = (id: string) => {
    modal.confirm({
      title: 'Delete Telemetry Model',
      content: 'Are you sure?',
      okType: 'danger',
      onOk: () => deleteModel.mutateAsync(id),
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Telemetry Models</Title>
        <RoleGuard roles={['admin', 'editor']}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            Create Model
          </Button>
        </RoleGuard>
      </div>
      <Table
        rowKey="id"
        columns={columns(handleDelete, canDelete)}
        dataSource={data}
        loading={isLoading}
        expandable={{
          expandedRowRender: (record) => (
            <Table
              rowKey="name"
              dataSource={record.metrics}
              pagination={false}
              size="small"
              columns={[
                { title: 'Metric', dataIndex: 'name' },
                { title: 'Unit', dataIndex: 'unit' },
                { title: 'Min', dataIndex: 'min_value', render: (v?: number) => v ?? '—' },
                { title: 'Max', dataIndex: 'max_value', render: (v?: number) => v ?? '—' },
                { title: 'Description', dataIndex: 'description' },
              ]}
            />
          ),
        }}
      />
      <Modal
        title="Create Telemetry Model"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="device_type" label="Device Type" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.List name="metrics" initialValue={[{}]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <Space key={field.key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                    <Form.Item name={[field.name, 'name']} rules={[{ required: true }]}>
                      <Input placeholder="Metric name" />
                    </Form.Item>
                    <Form.Item name={[field.name, 'unit']} rules={[{ required: true }]}>
                      <Input placeholder="Unit" style={{ width: 80 }} />
                    </Form.Item>
                    <Form.Item name={[field.name, 'min_value']}>
                      <InputNumber placeholder="Min" style={{ width: 80 }} />
                    </Form.Item>
                    <Form.Item name={[field.name, 'max_value']}>
                      <InputNumber placeholder="Max" style={{ width: 80 }} />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(field.name)} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  Add Metric
                </Button>
              </>
            )}
          </Form.List>
          <Form.Item style={{ marginTop: 16 }}>
            <Button type="primary" htmlType="submit" loading={createModel.isPending}>
              Create
            </Button>
          </Form.Item>
        </Form>
      </Modal>
      <RoleGuard roles={['admin']}>
        <QuarantinePanel />
      </RoleGuard>
    </div>
  );
}

function QuarantinePanel() {
  const [reason, setReason] = useState<QuarantineReason | undefined>();
  const { data, isLoading } = useTelemetryQuarantine({ reason, limit: 200 });

  const counts = useMemo(() => {
    const byReason: Record<string, number> = {};
    for (const entry of data ?? []) {
      byReason[entry.reason] = (byReason[entry.reason] ?? 0) + 1;
    }
    return byReason;
  }, [data]);

  const columns: ColumnsType<TelemetryQuarantineResponse> = [
    {
      title: 'Received',
      dataIndex: 'received_at',
      render: (v: string) => new Date(v).toLocaleString(),
      sorter: (a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime(),
      defaultSortOrder: 'descend',
    },
    { title: 'Device', dataIndex: 'device_id', ellipsis: true },
    { title: 'Metric', dataIndex: 'metric_name' },
    {
      title: 'Value',
      dataIndex: 'metric_value',
      render: (v: number | null) => (v == null ? '—' : v),
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      render: (v: string) => (
        <Tag color={REASON_COLOR[v as QuarantineReason] ?? 'default'}>{v}</Tag>
      ),
    },
  ];

  return (
    <Card style={{ marginTop: 24 }} title="Quarantined readings">
      <Space wrap style={{ marginBottom: 16 }}>
        {QUARANTINE_REASONS.map((r) => (
          <Tag key={r.value} color={REASON_COLOR[r.value]}>
            {r.label}: {counts[r.value] ?? 0}
          </Tag>
        ))}
        <Select
          allowClear
          placeholder="Filter by reason"
          options={QUARANTINE_REASONS}
          value={reason}
          onChange={(v) => setReason(v)}
          style={{ width: 200 }}
        />
      </Space>
      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={data ?? []}
        loading={isLoading}
        expandable={{
          expandedRowRender: (record) => (
            <pre style={{ margin: 0 }}>{JSON.stringify(record.raw_payload, null, 2)}</pre>
          ),
        }}
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: 'No quarantined readings' }}
      />
    </Card>
  );
}
