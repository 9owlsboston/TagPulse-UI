import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useAssets, useCreateAsset } from '@/hooks/useAssets';
import { useCanPerform } from '@/components/useCanPerform';
import type { AssetResponse } from '@/api/generated/models/AssetResponse';
import { AssetCreate } from '@/api/generated/models/AssetCreate';

const { Title } = Typography;

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'retired', label: 'Retired' },
  { value: 'lost', label: 'Lost' },
];

const STATUS_COLOR: Record<string, string> = {
  active: 'green',
  retired: 'default',
  lost: 'red',
};

export function AssetList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const { data, isLoading } = useAssets({
    q: search || undefined,
    status: status || undefined,
  });
  const createAsset = useCreateAsset();
  const canEdit = useCanPerform('editor');

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<AssetCreate>();

  const rows = useMemo(() => data ?? [], [data]);

  const onCreate = async (values: AssetCreate) => {
    try {
      const created = await createAsset.mutateAsync(values);
      message.success(`Asset "${created.name}" created`);
      setModalOpen(false);
      form.resetFields();
      navigate(`/assets/${created.id}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to create asset');
    }
  };

  return (
    <div>
      <Title level={2}>Assets</Title>
      <Card>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Input.Search
              placeholder="Search by name, external ref, or tag"
              allowClear
              onSearch={setSearch}
              style={{ width: 360 }}
            />
            <Select
              options={STATUS_OPTIONS}
              value={status}
              onChange={setStatus}
              style={{ width: 160 }}
            />
          </Space>
          {canEdit && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalOpen(true)}
            >
              Register Asset
            </Button>
          )}
        </Space>
        <Table<AssetResponse>
          rowKey="id"
          loading={isLoading}
          dataSource={rows}
          onRow={(row) => ({ onClick: () => navigate(`/assets/${row.id}`) })}
          pagination={{ pageSize: 25, showSizeChanger: false }}
          style={{ cursor: 'pointer' }}
          columns={[
            { title: 'Name', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
            { title: 'Type', dataIndex: 'asset_type' },
            {
              title: 'External Ref',
              dataIndex: 'external_ref',
              render: (v: string | null) => v ?? '—',
            },
            {
              title: 'Status',
              dataIndex: 'status',
              render: (v: string) => <Tag color={STATUS_COLOR[v] ?? 'default'}>{v}</Tag>,
            },
            {
              title: 'Updated',
              dataIndex: 'updated_at',
              render: (v: string) => new Date(v).toLocaleString(),
            },
          ]}
        />
      </Card>

      <Modal
        title="Register Asset"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createAsset.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onCreate}
          initialValues={{ status: AssetCreate.status.ACTIVE, asset_type: 'pallet' }}
        >
          <Form.Item label="Name" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Asset Type" name="asset_type" rules={[{ required: true }]}>
            <Input placeholder="pallet, tool, container, …" />
          </Form.Item>
          <Form.Item label="External Ref" name="external_ref">
            <Input placeholder="ERP/WMS code" />
          </Form.Item>
          <Form.Item label="Status" name="status">
            <Select
              options={[
                { value: AssetCreate.status.ACTIVE, label: 'Active' },
                { value: AssetCreate.status.RETIRED, label: 'Retired' },
                { value: AssetCreate.status.LOST, label: 'Lost' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
