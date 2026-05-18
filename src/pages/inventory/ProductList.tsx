import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useProducts, useCreateProduct } from '@/hooks/useInventory';
import { useCanPerform } from '@/components/useCanPerform';
import type { ProductResponse } from '@/api/generated/models/ProductResponse';
import type { ProductCreate } from '@/api/generated/models/ProductCreate';

const { Title } = Typography;

const UNIT_OPTIONS = [
  { value: 'each', label: 'each' },
  { value: 'case', label: 'case' },
  { value: 'pallet', label: 'pallet' },
];

export function ProductList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useProducts({ q: search || undefined });
  const createProduct = useCreateProduct();
  const canEdit = useCanPerform('editor');

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<ProductCreate>();

  const rows = useMemo(() => data ?? [], [data]);

  const onCreate = async (values: ProductCreate) => {
    try {
      const created = await createProduct.mutateAsync(values);
      message.success(`Product ${created.sku} created`);
      setModalOpen(false);
      form.resetFields();
      navigate(`/inventory/products/${created.id}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to create product');
    }
  };

  return (
    <div>
      <Title level={2}>Products</Title>
      <Card>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Input.Search
            placeholder="Search by SKU, GTIN, or name"
            allowClear
            onSearch={setSearch}
            style={{ maxWidth: 360 }}
          />
          {canEdit && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
              New Product
            </Button>
          )}
        </Space>
        <Table<ProductResponse>
          rowKey="id"
          loading={isLoading}
          dataSource={rows}
          onRow={(row) => ({ onClick: () => navigate(`/inventory/products/${row.id}`) })}
          pagination={{ pageSize: 25, showSizeChanger: false }}
          columns={[
            { title: 'SKU', dataIndex: 'sku', sorter: (a, b) => a.sku.localeCompare(b.sku) },
            { title: 'Name', dataIndex: 'name' },
            { title: 'GTIN', dataIndex: 'gtin', render: (v: string | null) => v ?? <Tag>—</Tag> },
            { title: 'Category', dataIndex: 'category', render: (v: string | null) => v ?? '—' },
            { title: 'Unit', dataIndex: 'unit', width: 100 },
          ]}
        />
      </Card>

      <Modal
        title="Create Product"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createProduct.isPending}
        destroyOnHidden
      >
        <Form<ProductCreate> form={form} layout="vertical" onFinish={onCreate} initialValues={{ unit: 'each' as ProductCreate['unit'] }}>
          <Form.Item name="sku" label="SKU" rules={[{ required: true, max: 64 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Name" rules={[{ required: true, max: 255 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="gtin" label="GTIN (8/12/13/14)">
            <Input />
          </Form.Item>
          <Form.Item name="category" label="Category">
            <Input />
          </Form.Item>
          <Form.Item name="unit" label="Unit" rules={[{ required: true }]}>
            <Select options={UNIT_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
