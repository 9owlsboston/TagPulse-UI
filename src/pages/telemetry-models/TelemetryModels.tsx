import Table from 'antd/es/table';
import Button from 'antd/es/button';
import Modal from 'antd/es/modal';
import Form from 'antd/es/form';
import Input from 'antd/es/input';
import Typography from 'antd/es/typography';
import Space from 'antd/es/space';
import App from 'antd/es/app';
import InputNumber from 'antd/es/input-number';
import Card from 'antd/es/card';
import Select from 'antd/es/select';
import Tag from 'antd/es/tag';
import { PlusOutlined, MinusCircleOutlined, EditOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import {
  useTelemetryModels,
  useCreateTelemetryModel,
  useDeleteTelemetryModel,
  useUpdateTelemetryModel,
} from '@/hooks/useTelemetryModels';
import { useTelemetryQuarantine } from '@/hooks/useTelemetry';
import { useDevices } from '@/hooks/useDevices';
import { useLabel } from '@/lib/uiConfig';
import { RoleGuard } from '@/components/RoleGuard';
import { useCanPerform } from '@/components/useCanPerform';
import { DeviceRef } from '@/components/DeviceRef';
import { excelColumn } from '@/components/ExcelColumn';
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

const columns = (
  onDelete: (id: string) => void,
  onEdit: (record: TelemetryModelResponse) => void,
  showActions: boolean,
): ColumnsType<TelemetryModelResponse> => [
  { title: 'Device Type', dataIndex: 'device_type' },
  { title: 'Metrics', dataIndex: 'metrics', render: (m: MetricDefinition[]) => m.length },
  {
    title: 'Created',
    dataIndex: 'created_at',
    render: (v: string) => new Date(v).toLocaleDateString(),
  },
  ...(showActions ? [{
    title: 'Actions',
    width: 160,
    render: (_: unknown, record: TelemetryModelResponse) => (
      <Space>
        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={() => onEdit(record)}
          aria-label={`Edit telemetry model ${record.device_type ?? record.id}`}
        >
          Edit
        </Button>
        <Button danger size="small" onClick={() => onDelete(record.id)}>
          Delete
        </Button>
      </Space>
    ),
  }] : []),
];

export function TelemetryModels() {
  const { modal, message } = App.useApp();
  const telemetryLabel = useLabel('telemetry');
  const { data, isLoading } = useTelemetryModels();
  const createModel = useCreateTelemetryModel();
  const deleteModel = useDeleteTelemetryModel();
  const updateModel = useUpdateTelemetryModel();
  const canDelete = useCanPerform('admin');
  const canEdit = useCanPerform('editor');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TelemetryModelResponse | null>(null);
  const [form] = Form.useForm<TelemetryModelCreate>();
  const [editForm] = Form.useForm<{ metrics: MetricDefinition[] }>();

  const handleCreate = async (values: TelemetryModelCreate) => {
    await createModel.mutateAsync(values);
    message.success('Telemetry model created');
    setOpen(false);
    form.resetFields();
  };

  const handleDelete = (id: string) => {
    modal.confirm({
      title: `Delete ${telemetryLabel} Model`,
      content: 'Are you sure?',
      okType: 'danger',
      onOk: () => deleteModel.mutateAsync(id),
    });
  };

  // Sprint 28 G6 — edit metric (PATCH from G1). subject_kind/device_type
  // are immutable identity columns per backend; only `metrics` is mutable.
  const openEdit = (record: TelemetryModelResponse) => {
    editForm.setFieldsValue({ metrics: record.metrics });
    setEditing(record);
  };

  const onEdit = async (values: { metrics: MetricDefinition[] }) => {
    if (!editing) return;
    try {
      await updateModel.mutateAsync({ id: editing.id, data: { metrics: values.metrics } });
      message.success('Telemetry model updated');
      setEditing(null);
      editForm.resetFields();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to update telemetry model');
    }
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
        columns={columns(handleDelete, openEdit, canDelete || canEdit)}
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

      {/* Sprint 28 G6 — edit metrics modal. device_type/subject_kind immutable. */}
      <Modal
        title={editing ? `Edit Metrics — ${editing.device_type ?? editing.id}` : 'Edit Metrics'}
        open={editing !== null}
        onCancel={() => {
          setEditing(null);
          editForm.resetFields();
        }}
        onOk={() => editForm.submit()}
        confirmLoading={updateModel.isPending}
        destroyOnHidden
        width={720}
      >
        <Form form={editForm} layout="vertical" onFinish={onEdit}>
          <Form.Item label="Device Type">
            <Input value={editing?.device_type ?? ''} disabled />
          </Form.Item>
          <Form.List name="metrics">
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
                    <Form.Item name={[field.name, 'description']}>
                      <Input placeholder="Description" style={{ width: 180 }} />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(field.name)} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add({ name: '', unit: '' })} block icon={<PlusOutlined />}>
                  Add Metric
                </Button>
              </>
            )}
          </Form.List>
          <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
            Edits the model in place — historical readings keep their
            quarantine status against this model id (no orphaning, unlike
            delete + recreate).
          </Typography.Paragraph>
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

  const deviceLabel = useLabel('device');
  // Show the reader NAME (via <DeviceRef>, UUID on hover) instead of the raw
  // device_id, consistent with the Tag Reads table.
  const { data: devices } = useDevices();
  const deviceById = useMemo(
    () => new Map((devices ?? []).map((d) => [d.id, d.name])),
    [devices],
  );

  const columns: ColumnsType<TelemetryQuarantineResponse> = [
    {
      title: 'Received',
      dataIndex: 'received_at',
      render: (v: string) => new Date(v).toLocaleString(),
      sorter: (a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime(),
      defaultSortOrder: 'descend',
    },
    {
      title: deviceLabel,
      dataIndex: 'device_id',
      render: (v: string | null) =>
        v ? <DeviceRef id={v} name={deviceById.get(v)} /> : '—',
    },
    { title: 'Metric', dataIndex: 'metric_name', ...excelColumn<TelemetryQuarantineResponse>({ rows: data ?? [], accessor: (r) => r.metric_name, kind: 'enum' }) },
    {
      title: 'Value',
      dataIndex: 'metric_value',
      ...excelColumn<TelemetryQuarantineResponse>({ rows: data ?? [], accessor: (r) => r.metric_value, kind: 'number' }),
      render: (v: number | null) => (v == null ? '—' : v),
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      ...excelColumn<TelemetryQuarantineResponse>({ rows: data ?? [], accessor: (r) => r.reason, kind: 'enum' }),
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
        pagination={{
          // `defaultPageSize` (uncontrolled) lets AntD own the page size so the
          // size changer actually takes effect — a literal `pageSize` is
          // *controlled* and reverts every selection back on re-render.
          defaultPageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
        }}
        locale={{ emptyText: 'No quarantined readings' }}
      />
    </Card>
  );
}
