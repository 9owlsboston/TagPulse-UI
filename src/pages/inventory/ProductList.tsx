import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from 'antd/es/button';
import Form from 'antd/es/form';
import Input from 'antd/es/input';
import Modal from 'antd/es/modal';
import Select from 'antd/es/select';
import Table from 'antd/es/table';
import Tag from 'antd/es/tag';
import message from 'antd/es/message';
import { PlusOutlined } from '@ant-design/icons';
import { useProducts, useCreateProduct } from '@/hooks/useInventory';
import { useCanPerform } from '@/components/useCanPerform';
import { ListPageShell } from '@/components/ListPageShell';
import { EmptyState } from '@/components/EmptyState';
import type { ProductResponse } from '@/api/generated/models/ProductResponse';
import type { ProductCreate } from '@/api/generated/models/ProductCreate';

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
    <>
      <ListPageShell
        title="Products"
        primaryAction={
          canEdit && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
              New Product
            </Button>
          )
        }
        toolbar={
          <Input.Search
            placeholder="Search by SKU, GTIN, or name"
            allowClear
            onSearch={setSearch}
            style={{ maxWidth: 360 }}
          />
        }
      >
        <Table<ProductResponse>
          rowKey="id"
          loading={isLoading}
          dataSource={rows}
          onRow={(row) => ({ onClick: () => navigate(`/inventory/products/${row.id}`) })}
          pagination={{ pageSize: 25, showSizeChanger: false }}
          locale={{
            emptyText: search ? (
              <EmptyState
                title="No products match your search"
                description={`No products match “${search}”. Try a different SKU, GTIN, or name.`}
              />
            ) : (
              <EmptyState
                title="No products yet"
                description="Create your first product to start tracking stock."
                action={
                  canEdit ? (
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
                      New Product
                    </Button>
                  ) : undefined
                }
              />
            ),
          }}
          columns={[
            { title: 'SKU', dataIndex: 'sku', sorter: (a, b) => a.sku.localeCompare(b.sku) },
            { title: 'Name', dataIndex: 'name' },
            { title: 'GTIN', dataIndex: 'gtin', render: (v: string | null) => v ?? <Tag>—</Tag> },
            { title: 'Category', dataIndex: 'category', render: (v: string | null) => v ?? '—' },
            { title: 'Unit', dataIndex: 'unit', width: 100 },
          ]}
        />
      </ListPageShell>

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
    </>
  );
}
