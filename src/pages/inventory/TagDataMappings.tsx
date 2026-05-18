import { useState } from 'react';
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useCreateTagDataMapping, useDeleteTagDataMapping, useProducts, useTagDataMappings } from '@/hooks/useInventory';
import { useCanPerform } from '@/components/useCanPerform';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tagDataMappingsApi } from '@/api/client';
import { TagDataMappingCreate } from '@/api/generated/models/TagDataMappingCreate';
import type { TagDataMappingResponse } from '@/api/generated/models/TagDataMappingResponse';

const { Title, Paragraph } = Typography;

interface FormValues {
  tag_data_key: string;
  semantic_field: string;
  scope_kind: TagDataMappingCreate.scope_kind;
  scope_id?: string;
  transform?: string;
}

interface EditFormValues {
  tag_data_key: string;
  semantic_field: string;
  transform?: string;
}

const SEMANTIC_FIELDS = [
  { value: 'lot_code', label: 'lot_code (matches lots.lot_code)' },
  { value: 'product_sku', label: 'product_sku (matches products.sku)' },
];

export function TagDataMappings() {
  const isAdmin = useCanPerform('admin');
  const { data: mappings, isLoading } = useTagDataMappings();
  const { data: products } = useProducts({ limit: 500 });
  const create = useCreateTagDataMapping();
  const remove = useDeleteTagDataMapping();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<TagDataMappingResponse | null>(null);
  const [form] = Form.useForm<FormValues>();
  const [editForm] = Form.useForm<EditFormValues>();
  const scopeKind = Form.useWatch('scope_kind', form);

  const productLabel = new Map<string, string>();
  for (const p of products ?? []) productLabel.set(p.id, p.sku);

  const updateMapping = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { tag_data_key?: string; semantic_field?: string; transform?: string | null } }) =>
      tagDataMappingsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', 'tag-data-mappings'] });
      message.success('Mapping updated');
      setEditRecord(null);
    },
    onError: (err: Error) => message.error(err.message),
  });

  const onFinish = async (values: FormValues) => {
    try {
      await create.mutateAsync({
        tag_data_key: values.tag_data_key,
        semantic_field: values.semantic_field,
        scope_kind: values.scope_kind,
        scope_id: values.scope_kind === TagDataMappingCreate.scope_kind.PRODUCT ? values.scope_id : undefined,
        transform: values.transform || undefined,
      });
      message.success('Mapping created');
      setOpen(false);
      form.resetFields();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to create mapping');
    }
  };

  const onDelete = async (id: string) => {
    await remove.mutateAsync(id);
    message.success('Mapping deleted');
  };

  const handleEdit = (record: TagDataMappingResponse) => {
    setEditRecord(record);
    editForm.setFieldsValue({
      tag_data_key: record.tag_data_key,
      semantic_field: record.semantic_field,
      transform: record.transform ?? '',
    });
  };

  const onEditFinish = (values: EditFormValues) => {
    if (!editRecord) return;
    updateMapping.mutate({
      id: editRecord.id,
      data: {
        tag_data_key: values.tag_data_key,
        semantic_field: values.semantic_field,
        transform: values.transform || null,
      },
    });
  };

  return (
    <div>
      <Title level={2}>Tag data mappings</Title>
      <Paragraph type="secondary">
        Map RFID <code>tag_data.&lt;key&gt;</code> values to inventory semantic fields. Most-specific
        scope wins (product overrides tenant).
      </Paragraph>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          {isAdmin && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
              New Mapping
            </Button>
          )}
        </Space>
        <Table<TagDataMappingResponse>
          rowKey="id"
          loading={isLoading}
          dataSource={mappings ?? []}
          pagination={{ pageSize: 25 }}
          columns={[
            { title: 'Tag-data key', dataIndex: 'tag_data_key', render: (v: string) => <code>{v}</code> },
            { title: 'Semantic field', dataIndex: 'semantic_field' },
            {
              title: 'Scope',
              render: (_, row) =>
                row.scope_kind === 'tenant'
                  ? <Tag>tenant-wide</Tag>
                  : <Tag color="blue">product · {productLabel.get(row.scope_id ?? '') ?? (row.scope_id ?? '').slice(0, 8)}</Tag>,
            },
            { title: 'Transform', dataIndex: 'transform', render: (v: string | null) => v ?? '—' },
            {
              title: '',
              width: 120,
              render: (_, row) =>
                isAdmin ? (
                  <Space>
                    <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(row)} />
                    <Popconfirm title="Delete mapping?" onConfirm={() => onDelete(row.id)}>
                      <Button danger size="small" icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                ) : null,
            },
          ]}
        />
      </Card>

      {/* Create modal */}
      <Modal
        title="Create tag-data mapping"
        open={open}
        onOk={() => form.submit()}
        onCancel={() => setOpen(false)}
        confirmLoading={create.isPending}
        destroyOnHidden
      >
        <Form<FormValues>
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ scope_kind: TagDataMappingCreate.scope_kind.TENANT }}
        >
          <Form.Item name="tag_data_key" label="Tag-data key" rules={[{ required: true, max: 64 }]}>
            <Input placeholder="e.g. lot or sku" />
          </Form.Item>
          <Form.Item name="semantic_field" label="Semantic field" rules={[{ required: true }]}>
            <Select options={SEMANTIC_FIELDS} />
          </Form.Item>
          <Form.Item name="scope_kind" label="Scope" rules={[{ required: true }]}>
            <Select
              options={[
                { value: TagDataMappingCreate.scope_kind.TENANT, label: 'Tenant-wide' },
                { value: TagDataMappingCreate.scope_kind.PRODUCT, label: 'Per product' },
              ]}
            />
          </Form.Item>
          {scopeKind === TagDataMappingCreate.scope_kind.PRODUCT && (
            <Form.Item name="scope_id" label="Product" rules={[{ required: true }]}>
              <Select
                showSearch
                options={(products ?? []).map((p) => ({ value: p.id, label: `${p.sku} — ${p.name}` }))}
                filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              />
            </Form.Item>
          )}
          <Form.Item name="transform" label="Transform (optional)">
            <Input placeholder="e.g. upper, lower" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit modal */}
      <Modal
        title="Edit tag-data mapping"
        open={!!editRecord}
        onOk={() => editForm.submit()}
        onCancel={() => setEditRecord(null)}
        confirmLoading={updateMapping.isPending}
        destroyOnHidden
      >
        <Form<EditFormValues> form={editForm} layout="vertical" onFinish={onEditFinish}>
          <Form.Item name="tag_data_key" label="Tag-data key" rules={[{ required: true, max: 64 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="semantic_field" label="Semantic field" rules={[{ required: true }]}>
            <Select options={SEMANTIC_FIELDS} />
          </Form.Item>
          <Form.Item name="transform" label="Transform (optional)">
            <Input placeholder="e.g. upper, lower" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
