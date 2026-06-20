/**
 * Categories list / CRUD page (Sprint 34 gap 3.3).
 *
 * Backend: `GET /categories`, `POST /categories`, `GET /categories/{id}`,
 * `PATCH /categories/{id}`, `DELETE /categories/{id}` (admin only;
 * 409 with `{detail:{message, asset_count}}` if any asset references it).
 *
 * Per ADR 019 `category_type` is **immutable** after create — the
 * generated `CategoryUpdate` type omits it, and the edit modal renders
 * it disabled with help text.
 */
import { useMemo, useState } from 'react';
import App from 'antd/es/app';
import Button from 'antd/es/button';
import Form from 'antd/es/form';
import Input from 'antd/es/input';
import InputNumber from 'antd/es/input-number';
import Modal from 'antd/es/modal';
import Select from 'antd/es/select';
import Space from 'antd/es/space';
import Table from 'antd/es/table';
import Tag from 'antd/es/tag';
import Typography from 'antd/es/typography';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { ApiError } from '@/api/generated/core/ApiError';
import { CategoryCreate } from '@/api/generated/models/CategoryCreate';
import type { CategoryResponse } from '@/api/generated/models/CategoryResponse';
import type { CategoryUpdate } from '@/api/generated/models/CategoryUpdate';
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/hooks/useCategories';
import { useCanPerform } from '@/components/useCanPerform';
import { RoleGuard } from '@/components/RoleGuard';
import { LabelChips } from '@/components/LabelChips';
import {
  PendingLabelPicker,
  attachPendingLabels,
  type PendingLabel,
} from '@/components/PendingLabelPicker';
import { ListPageShell } from '@/components/ListPageShell';
import { columnSearchFilter } from '@/components/ColumnSearchFilter';
import { EmptyState } from '@/components/EmptyState';

const { Text } = Typography;

const TYPE_LABELS: Record<string, string> = {
  liquid_container: 'Liquid container',
  reference_tag: 'Reference tag',
  rti_container: 'RTI container',
  object: 'Object',
};

const TYPE_OPTIONS = [
  { value: CategoryCreate.category_type.OBJECT, label: TYPE_LABELS.object },
  { value: CategoryCreate.category_type.RTI_CONTAINER, label: TYPE_LABELS.rti_container },
  { value: CategoryCreate.category_type.LIQUID_CONTAINER, label: TYPE_LABELS.liquid_container },
  { value: CategoryCreate.category_type.REFERENCE_TAG, label: TYPE_LABELS.reference_tag },
];

export function CategoryList() {
  const { modal, message } = App.useApp();
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const { data: categories, isLoading } = useCategories({ category_type: typeFilter });
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const canEdit = useCanPerform('editor');
  const canDelete = useCanPerform('admin');

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryResponse | null>(null);
  const [createForm] = Form.useForm<CategoryCreate>();
  const [editForm] = Form.useForm<CategoryUpdate>();
  // Sprint 37 row 3.9d — client-side label queue for Create flow.
  const [pendingLabels, setPendingLabels] = useState<PendingLabel[]>([]);

  const filterOptions = useMemo(
    () => [{ value: '', label: 'All types' }, ...TYPE_OPTIONS],
    [],
  );

  const onCreate = async (values: CategoryCreate) => {
    try {
      const created = await createCategory.mutateAsync({
        ...values,
        // Ant Design returns null for empty optionals, but the API rejects
        // explicit nulls for sku_upc/description on create — coerce to undefined.
        description: values.description || undefined,
        sku_upc: values.sku_upc || undefined,
      });
      message.success(`Category "${values.name}" created`);
      // Sprint 37 row 3.9d — flush queued labels onto the new category.
      if (pendingLabels.length > 0) {
        const { ok, failed } = await attachPendingLabels(
          'category',
          created.id,
          pendingLabels,
        );
        if (ok > 0) message.success(`Attached ${ok} label${ok === 1 ? '' : 's'}`);
        for (const f of failed) {
          message.error(
            `Could not attach "${f.label.key}: ${f.label.value}" — ${
              f.error instanceof Error ? f.error.message : 'unknown error'
            }`,
          );
        }
      }
      setCreateOpen(false);
      createForm.resetFields();
      setPendingLabels([]);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to create category');
    }
  };

  const openEdit = (cat: CategoryResponse) => {
    editForm.setFieldsValue({
      name: cat.name,
      description: cat.description ?? null,
      required_tags: cat.required_tags,
      sku_upc: cat.sku_upc ?? null,
    });
    setEditing(cat);
  };

  const onEdit = async (values: CategoryUpdate) => {
    if (!editing) return;
    try {
      await updateCategory.mutateAsync({ id: editing.id, data: values });
      message.success(`Category "${values.name ?? editing.name}" updated`);
      setEditing(null);
      editForm.resetFields();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to update category');
    }
  };

  const handleDelete = (cat: CategoryResponse) => {
    modal.confirm({
      title: 'Delete category',
      content: `Delete "${cat.name}"? This cannot be undone.`,
      okType: 'danger',
      okText: 'Delete',
      onOk: async () => {
        try {
          await deleteCategory.mutateAsync(cat.id);
          message.success(`Category "${cat.name}" deleted`);
        } catch (err) {
          if (err instanceof ApiError && err.status === 409) {
            const detail = (err.body as { detail?: { asset_count?: number } } | undefined)?.detail;
            const count = detail?.asset_count ?? 0;
            modal.error({
              title: 'Category is in use',
              content: (
                <Text>
                  "{cat.name}" is referenced by{' '}
                  <strong>
                    {count} asset{count === 1 ? '' : 's'}
                  </strong>
                  . Re-assign or retire those assets first, then try deleting again.
                </Text>
              ),
            });
            return;
          }
          message.error(err instanceof Error ? err.message : 'Failed to delete category');
        }
      },
    });
  };

  const rows = categories ?? [];
  const filtersActive = !!typeFilter;

  return (
    <>
      <ListPageShell
        testId="category-list-page"
        title="Categories"
        count={rows.length}
        countTestId="category-list-count"
        primaryAction={
          <Space>
            <Select
              value={typeFilter ?? ''}
              onChange={(v) => setTypeFilter(v ? v : undefined)}
              options={filterOptions}
              style={{ width: 200 }}
              aria-label="Filter by category type"
            />
            <RoleGuard roles={['admin', 'editor']}>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
                New Category
              </Button>
            </RoleGuard>
          </Space>
        }
      >
        <Table<CategoryResponse>
          rowKey="id"
          dataSource={rows}
          loading={isLoading}
          pagination={{ defaultPageSize: 25, showSizeChanger: true, pageSizeOptions: [25, 50, 100] }}
          locale={{
            emptyText: filtersActive ? (
              <EmptyState
                title="No categories match the filter"
                description={`No categories of type "${TYPE_LABELS[typeFilter!] ?? typeFilter}".`}
              />
            ) : (
              <EmptyState
                title="No categories yet"
                description="Create one to start grouping assets."
              />
            ),
          }}
          columns={[
            {
              title: 'Name',
              dataIndex: 'name',
              sorter: (a, b) => a.name.localeCompare(b.name),
              ...columnSearchFilter<CategoryResponse>({ accessor: (r) => r.name }),
            },
            {
              title: 'Type',
              dataIndex: 'category_type',
              width: 180,
              render: (v: string) => <Tag>{TYPE_LABELS[v] ?? v}</Tag>,
              filters: TYPE_OPTIONS.map((o) => ({ text: o.label, value: o.value })),
              onFilter: (value, row) => row.category_type === value,
            },
            {
              title: 'Required tags',
              dataIndex: 'required_tags',
              width: 130,
              align: 'right',
            },
            {
              title: 'SKU / UPC',
              dataIndex: 'sku_upc',
              render: (v: string | null) => v ?? <Text type="secondary">—</Text>,
            },
            {
              title: 'Description',
              dataIndex: 'description',
              render: (v: string | null) =>
                v ?? <Text type="secondary">—</Text>,
            },
            {
              title: '',
              width: 110,
              render: (_, row) => (
                <Space>
                  {canEdit ? (
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => openEdit(row)}
                      aria-label={`Edit category ${row.name}`}
                    />
                  ) : null}
                  {canDelete ? (
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(row)}
                      aria-label={`Delete category ${row.name}`}
                    />
                  ) : null}
                </Space>
              ),
            },
          ]}
        />
      </ListPageShell>

      {/* Create modal */}
      <Modal
        title="Create Category"
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          createForm.resetFields();
        }}
        onOk={() => createForm.submit()}
        confirmLoading={createCategory.isPending}
        destroyOnHidden
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={onCreate}
          initialValues={{
            category_type: CategoryCreate.category_type.OBJECT,
            required_tags: 1,
          }}
        >
          <Form.Item
            label="Name"
            name="name"
            rules={[
              { required: true, message: 'Name is required' },
              { max: 80, message: 'Max 80 characters' },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Type"
            name="category_type"
            rules={[{ required: true }]}
            help="Immutable after create — choose carefully."
          >
            <Select options={TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item
            label="Required tags"
            name="required_tags"
            help="How many RFID tags each asset of this category needs (default 1)."
          >
            <InputNumber min={1} max={64} />
          </Form.Item>
          <Form.Item label="SKU / UPC" name="sku_upc">
            <Input placeholder="Optional product code" maxLength={64} />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} maxLength={500} />
          </Form.Item>
          {/* Sprint 37 row 3.9d — queued labels flushed after create. */}
          <Form.Item
            label="Labels"
            help="Optional. Queued labels are attached after the category is created."
          >
            <PendingLabelPicker
              entityType="category"
              value={pendingLabels}
              onChange={setPendingLabels}
              disabled={createCategory.isPending}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit modal */}
      <Modal
        title={editing ? `Edit Category — ${editing.name}` : 'Edit Category'}
        open={editing !== null}
        onCancel={() => {
          setEditing(null);
          editForm.resetFields();
        }}
        onOk={() => editForm.submit()}
        confirmLoading={updateCategory.isPending}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" onFinish={onEdit}>
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Name is required' }, { max: 80 }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Type"
            help="Type is immutable. To change, delete and recreate."
          >
            <Input value={TYPE_LABELS[editing?.category_type ?? ''] ?? ''} disabled />
          </Form.Item>
          <Form.Item label="Required tags" name="required_tags">
            <InputNumber min={1} max={64} />
          </Form.Item>
          <Form.Item label="SKU / UPC" name="sku_upc">
            <Input maxLength={64} allowClear />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} maxLength={500} allowClear />
          </Form.Item>
        </Form>
        {/* Sprint 37 row 3.9a — labels chips. Sits below the edit form
            inside the same modal so the existing category's labels are
            attachable/detachable from the same surface used to edit it. */}
        {editing && (
          <div style={{ marginTop: 16 }}>
            <LabelChips entityType="category" entityId={editing.id} />
          </div>
        )}
      </Modal>
    </>
  );
}
