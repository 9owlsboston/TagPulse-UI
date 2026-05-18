/**
 * LabelManagement — Sprint 36 / remediation row 2.2.
 *
 * Admin-only catalog CRUD page at `/admin/labels`. Surfaces the per-tenant
 * label keys (one row per `(entity_type, key)` pair), letting admins:
 *   • Add a new label key scoped to one of asset/site/zone/device/category.
 *   • Edit the chip colour (and key text — but not `entity_type`, which
 *     is immutable per ADR 020).
 *   • Delete a label. If any entity references it, the backend returns
 *     409 with `{detail:{message, association_count}}`; we render a
 *     guarded error modal so admins know how many associations are
 *     blocking the delete.
 *
 * The label *values* live on each entity (see <LabelChips>); this page
 * only manages keys + colours.
 *
 * Backend (ADR 020):
 *   GET    /labels?entity_type=…
 *   POST   /labels        { key, entity_type, color? }
 *   PATCH  /labels/{id}   { key?, color? }
 *   DELETE /labels/{id}
 */
import { useMemo, useState } from 'react';
import App from 'antd/es/app';
import Alert from 'antd/es/alert';
import Button from 'antd/es/button';
import Card from 'antd/es/card';
import ColorPicker from 'antd/es/color-picker';
import Form from 'antd/es/form';
import Input from 'antd/es/input';
import Modal from 'antd/es/modal';
import Select from 'antd/es/select';
import Space from 'antd/es/space';
import Table from 'antd/es/table';
import Tag from 'antd/es/tag';
import Typography from 'antd/es/typography';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { ApiError } from '@/api/generated/core/ApiError';
import { LabelCreate } from '@/api/generated/models/LabelCreate';
import type { LabelResponse } from '@/api/generated/models/LabelResponse';
import {
  useCreateLabel,
  useDeleteLabel,
  useLabels,
  useUpdateLabel,
  type LabelEntityType,
} from '@/hooks/useLabels';
import { useCanPerform } from '@/components/useCanPerform';

const { Title, Text } = Typography;

const ENTITY_TYPES: { value: LabelEntityType; label: string }[] = [
  { value: 'asset', label: 'Asset' },
  { value: 'site', label: 'Site' },
  { value: 'zone', label: 'Zone' },
  { value: 'device', label: 'Device' },
  { value: 'category', label: 'Category' },
];

const ENTITY_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  ENTITY_TYPES.map((e) => [e.value, e.label]),
);

interface CreateFormShape {
  key: string;
  entity_type: LabelEntityType;
  color?: string | null;
}

interface EditFormShape {
  key?: string | null;
  color?: string | null;
}

/**
 * AntD ColorPicker emits a `Color` object whose `.toHexString()` returns
 * `#rrggbb` — the format the backend's regex `^#[0-9A-Fa-f]{6}$` accepts.
 * We accept either a raw hex string (from initialValues) or the Color
 * object (from user interaction).
 */
function normalizeColor(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string') return value;
  if (
    typeof value === 'object' &&
    value !== null &&
    'toHexString' in value &&
    typeof (value as { toHexString: () => string }).toHexString === 'function'
  ) {
    return (value as { toHexString: () => string }).toHexString();
  }
  return null;
}

export function LabelManagement() {
  const { modal, message } = App.useApp();
  const isAdmin = useCanPerform('admin');
  const [typeFilter, setTypeFilter] = useState<LabelEntityType | undefined>(undefined);
  const { data: labels, isLoading } = useLabels({ entity_type: typeFilter });
  const createLabel = useCreateLabel();
  const updateLabel = useUpdateLabel();
  const deleteLabel = useDeleteLabel();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<LabelResponse | null>(null);
  const [createForm] = Form.useForm<CreateFormShape>();
  const [editForm] = Form.useForm<EditFormShape>();

  const filterOptions = useMemo(
    () => [{ value: '', label: 'All entity types' }, ...ENTITY_TYPES],
    [],
  );

  const onCreate = async (values: CreateFormShape) => {
    const payload: LabelCreate = {
      key: values.key.trim(),
      // Generated client uses an enum namespace; LabelEntityType strings
      // map 1:1 to it but TS needs the cast through the enum union.
      entity_type: values.entity_type as LabelCreate.entity_type,
      color: normalizeColor(values.color),
    };
    try {
      await createLabel.mutateAsync(payload);
      message.success(`Label "${payload.key}" created for ${payload.entity_type}s`);
      setCreateOpen(false);
      createForm.resetFields();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        message.error(
          `A label with key "${payload.key}" already exists for ${payload.entity_type}s.`,
        );
        return;
      }
      message.error(err instanceof Error ? err.message : 'Failed to create label');
    }
  };

  const openEdit = (row: LabelResponse) => {
    editForm.setFieldsValue({
      key: row.key,
      color: row.color ?? null,
    });
    setEditing(row);
  };

  const onEdit = async (values: EditFormShape) => {
    if (!editing) return;
    const payload = {
      key: values.key?.trim() || null,
      color: normalizeColor(values.color),
    };
    try {
      await updateLabel.mutateAsync({ id: editing.id, data: payload });
      message.success(`Label "${payload.key ?? editing.key}" updated`);
      setEditing(null);
      editForm.resetFields();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to update label');
    }
  };

  const handleDelete = (row: LabelResponse) => {
    modal.confirm({
      title: 'Delete label',
      content: (
        <Text>
          Delete <strong>{row.key}</strong> for {ENTITY_TYPE_LABELS[row.entity_type]}s?
          This cannot be undone.
        </Text>
      ),
      okType: 'danger',
      okText: 'Delete',
      onOk: async () => {
        try {
          await deleteLabel.mutateAsync(row.id);
          message.success(`Label "${row.key}" deleted`);
        } catch (err) {
          if (err instanceof ApiError && err.status === 409) {
            const detail = (
              err.body as { detail?: { association_count?: number } } | undefined
            )?.detail;
            const count = detail?.association_count ?? 0;
            modal.error({
              title: 'Label is in use',
              content: (
                <Text>
                  "{row.key}" is attached to{' '}
                  <strong>
                    {count} {(ENTITY_TYPE_LABELS[row.entity_type] ?? row.entity_type).toLowerCase()}
                    {count === 1 ? '' : 's'}
                  </strong>
                  . Detach those associations first, then try deleting again.
                </Text>
              ),
            });
            return;
          }
          message.error(err instanceof Error ? err.message : 'Failed to delete label');
        }
      },
    });
  };

  if (!isAdmin) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Label management is admin-only."
      />
    );
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          Labels
        </Title>
        <Space>
          <Select
            value={typeFilter ?? ''}
            onChange={(v) => setTypeFilter(v ? (v as LabelEntityType) : undefined)}
            options={filterOptions}
            style={{ width: 200 }}
            aria-label="Filter by entity type"
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            New Label
          </Button>
        </Space>
      </div>

      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Define the catalog of label keys per entity type. Operators then attach
        key-value pairs (e.g. <code>priority: high</code>) to individual assets,
        sites, zones, devices, or categories. Per ADR 020 the entity type is
        fixed when a label is created.
      </Text>

      <Card>
        <Table<LabelResponse>
          rowKey="id"
          dataSource={labels ?? []}
          loading={isLoading}
          pagination={{ pageSize: 25 }}
          locale={{
            emptyText: typeFilter
              ? `No labels defined for ${ENTITY_TYPE_LABELS[typeFilter]}s yet.`
              : 'No labels yet. Create one to start tagging entities.',
          }}
          columns={[
            {
              title: 'Key',
              dataIndex: 'key',
              sorter: (a, b) => a.key.localeCompare(b.key),
              render: (key: string, row) => (
                <Tag color={row.color ?? undefined}>
                  <strong>{key}</strong>
                </Tag>
              ),
            },
            {
              title: 'Entity type',
              dataIndex: 'entity_type',
              width: 160,
              filters: ENTITY_TYPES.map((e) => ({ text: e.label, value: e.value })),
              onFilter: (value, row) => row.entity_type === value,
              render: (v: string) => ENTITY_TYPE_LABELS[v] ?? v,
            },
            {
              title: 'Colour',
              dataIndex: 'color',
              width: 140,
              render: (v: string | null) =>
                v ? (
                  <Space>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 14,
                        height: 14,
                        background: v,
                        borderRadius: 3,
                        border: '1px solid rgba(0,0,0,0.15)',
                      }}
                    />
                    <Text code style={{ fontSize: 12 }}>
                      {v}
                    </Text>
                  </Space>
                ) : (
                  <Text type="secondary">default</Text>
                ),
            },
            {
              title: 'Updated',
              dataIndex: 'updated_at',
              width: 200,
              render: (v: string) => new Date(v).toLocaleString(),
            },
            {
              title: '',
              width: 110,
              render: (_, row) => (
                <Space>
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => openEdit(row)}
                    aria-label={`Edit label ${row.key}`}
                  />
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(row)}
                    aria-label={`Delete label ${row.key}`}
                  />
                </Space>
              ),
            },
          ]}
        />
      </Card>

      {/* Create modal */}
      <Modal
        title="Create Label"
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          createForm.resetFields();
        }}
        onOk={() => createForm.submit()}
        confirmLoading={createLabel.isPending}
        destroyOnHidden
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={onCreate}
          initialValues={{ entity_type: 'asset' as LabelEntityType }}
        >
          <Form.Item
            label="Key"
            name="key"
            rules={[
              { required: true, message: 'Key is required' },
              {
                pattern: /^[A-Za-z0-9_.+$]{3,24}$/,
                message: '3–24 chars: letters, digits, _ . + $',
              },
            ]}
            extra="Operators will see this as the chip prefix (e.g. priority)."
          >
            <Input placeholder="priority" />
          </Form.Item>
          <Form.Item
            label="Entity type"
            name="entity_type"
            rules={[{ required: true }]}
            help="Immutable after create — choose carefully."
          >
            <Select options={ENTITY_TYPES} />
          </Form.Item>
          <Form.Item label="Chip colour" name="color">
            <ColorPicker
              format="hex"
              showText
              allowClear
              presets={[
                {
                  label: 'Common',
                  colors: [
                    '#2563eb',
                    '#16a34a',
                    '#f59e0b',
                    '#dc2626',
                    '#9333ea',
                    '#0891b2',
                    '#6b7280',
                  ],
                },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit modal */}
      <Modal
        title={editing ? `Edit Label — ${editing.key}` : 'Edit Label'}
        open={editing !== null}
        onCancel={() => {
          setEditing(null);
          editForm.resetFields();
        }}
        onOk={() => editForm.submit()}
        confirmLoading={updateLabel.isPending}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" onFinish={onEdit}>
          <Form.Item
            label="Key"
            name="key"
            rules={[
              {
                pattern: /^[A-Za-z0-9_.+$]{3,24}$/,
                message: '3–24 chars: letters, digits, _ . + $',
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Entity type"
            help="Entity type is immutable per ADR 020. To change, delete and recreate."
          >
            <Input
              value={ENTITY_TYPE_LABELS[editing?.entity_type ?? ''] ?? ''}
              disabled
            />
          </Form.Item>
          <Form.Item label="Chip colour" name="color">
            <ColorPicker format="hex" showText allowClear />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
