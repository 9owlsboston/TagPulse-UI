import { Table, Button, Modal, Form, Input, Typography, Space, message, InputNumber } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';
import { useTelemetryModels, useCreateTelemetryModel, useDeleteTelemetryModel } from '@/hooks/useTelemetryModels';
import type { TelemetryModelResponse, TelemetryModelCreate, MetricDefinition } from '@/types';

const { Title } = Typography;

const columns = (onDelete: (id: string) => void): ColumnsType<TelemetryModelResponse> => [
  { title: 'Device Type', dataIndex: 'device_type' },
  { title: 'Metrics', dataIndex: 'metrics', render: (m: MetricDefinition[]) => m.length },
  {
    title: 'Created',
    dataIndex: 'created_at',
    render: (v: string) => new Date(v).toLocaleDateString(),
  },
  {
    title: 'Actions',
    render: (_, record) => (
      <Button danger size="small" onClick={() => onDelete(record.id)}>
        Delete
      </Button>
    ),
  },
];

export function TelemetryModels() {
  const { data, isLoading } = useTelemetryModels();
  const createModel = useCreateTelemetryModel();
  const deleteModel = useDeleteTelemetryModel();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<TelemetryModelCreate>();

  const handleCreate = async (values: TelemetryModelCreate) => {
    await createModel.mutateAsync(values);
    message.success('Telemetry model created');
    setOpen(false);
    form.resetFields();
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
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
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Create Model
        </Button>
      </div>
      <Table
        rowKey="id"
        columns={columns(handleDelete)}
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
    </div>
  );
}
