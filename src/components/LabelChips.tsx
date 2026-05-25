/**
 * LabelChips — Sprint 36 / remediation row 3.9.
 *
 * Reusable per-entity label-chip strip. Renders the entity's existing
 * label associations as AntD <Tag>s (closable for editor+) and an
 * "+ Add label" affordance that opens a popover form with a key
 * autocomplete sourced from the tenant's label catalog (filtered by
 * `entity_type`) and a free-text value.
 *
 * Backend wiring (ADR 020):
 *   GET    /{entity_segment}/{entity_id}/labels
 *   POST   /{entity_segment}/{entity_id}/labels      { key, value }
 *   DELETE /{entity_segment}/{entity_id}/labels/{label_id}
 *
 * Soft cap: 30 associations per entity (enforced server-side with 409).
 * When the cap is reached, the "+ Add label" button is hidden and a
 * subtle hint is shown next to the chip strip.
 *
 * Catalog autocomplete: pulled from `GET /labels?entity_type=…`. If the
 * catalog is empty for this entity_type, the popover surfaces an inline
 * "Manage label keys →" link to /admin/labels (admin role only).
 *
 * RBAC:
 *   viewer  — read-only (no close X, no + button).
 *   editor+ — can add (POST) and remove (DELETE) associations.
 *
 * Per-association `color` falls back to the AntD default tag color when
 * the catalog row has none set.
 */
import { useMemo, useState } from 'react';
import App from 'antd/es/app';
import AutoComplete from 'antd/es/auto-complete';
import Button from 'antd/es/button';
import Form from 'antd/es/form';
import Input from 'antd/es/input';
import Popover from 'antd/es/popover';
import Space from 'antd/es/space';
import Spin from 'antd/es/spin';
import Tag from 'antd/es/tag';
import Typography from 'antd/es/typography';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '@/api/generated/core/ApiError';
import type { LabelAssociationCreate } from '@/api/generated/models/LabelAssociationCreate';
import {
  useAssociateLabel,
  useDisassociateLabel,
  useEntityLabels,
  useLabels,
  type LabelEntityType,
} from '@/hooks/useLabels';
import { useCanPerform } from '@/components/useCanPerform';

const { Text } = Typography;

export const LABEL_ASSOCIATION_CAP = 30;

interface LabelChipsProps {
  entityType: LabelEntityType;
  entityId: string;
  /** Compact mode renders smaller and skips the inline "Labels:" prefix. */
  compact?: boolean;
}

export function LabelChips({ entityType, entityId, compact = false }: LabelChipsProps) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const canEdit = useCanPerform('editor');
  const canAdmin = useCanPerform('admin');
  const { data: associations, isLoading } = useEntityLabels(entityType, entityId);
  // Catalog feeds the autocomplete. We always fetch — viewers see no
  // "+ Add" button but the cost is one cheap list call.
  const { data: catalog } = useLabels({ entity_type: entityType });
  const associate = useAssociateLabel(entityType, entityId);
  const disassociate = useDisassociateLabel(entityType, entityId);

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [form] = Form.useForm<LabelAssociationCreate>();

  const atCap = (associations?.length ?? 0) >= LABEL_ASSOCIATION_CAP;

  const catalogOptions = useMemo(
    () => (catalog ?? []).map((c) => ({ value: c.key, label: c.key })),
    [catalog],
  );

  // Build a key → catalog-color lookup so chip colors match the catalog
  // even before the association response has been re-fetched.
  const colorByKey = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const c of catalog ?? []) {
      m.set(c.key, c.color ?? null);
    }
    return m;
  }, [catalog]);

  const onAdd = async (values: LabelAssociationCreate) => {
    try {
      await associate.mutateAsync(values);
      message.success(`Label "${values.key}: ${values.value}" added`);
      setPopoverOpen(false);
      form.resetFields();
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // Catalog row for this key+entity_type doesn't exist yet.
        message.error(
          `No "${values.key}" label is defined for ${entityType}s. ` +
            'Ask an admin to add it under Account → Labels.',
        );
        return;
      }
      if (err instanceof ApiError && err.status === 409) {
        const body = err.body as
          | { detail?: string | { message?: string } }
          | undefined;
        const detail =
          typeof body?.detail === 'string'
            ? body.detail
            : body?.detail?.message ?? 'Duplicate or cap reached.';
        message.error(detail);
        return;
      }
      message.error(err instanceof Error ? err.message : 'Failed to add label');
    }
  };

  const onRemove = async (labelId: string, label: string, value: string) => {
    try {
      await disassociate.mutateAsync(labelId);
      message.success(`Label "${label}: ${value}" removed`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to remove label');
    }
  };

  if (isLoading) {
    return (
      <span data-testid="label-chips-loading">
        <Spin size="small" />
      </span>
    );
  }

  const chips = (associations ?? []).map((a) => {
    const color = a.color ?? colorByKey.get(a.key) ?? undefined;
    // AntD's `color` prop accepts both preset names (e.g. "blue") and
    // hex strings (e.g. "#2563eb"). The catalog stores hex per ADR 020. audit-ignore
    return (
      <Tag
        key={a.label_id}
        color={color ?? undefined}
        closable={canEdit}
        onClose={(e) => {
          e.preventDefault();
          onRemove(a.label_id, a.key, a.value);
        }}
        data-testid={`label-chip-${a.key}`}
        style={{ marginInlineEnd: 4, marginBlock: 2 }}
      >
        <strong>{a.key}</strong>: {a.value}
      </Tag>
    );
  });

  const addForm = (
    <Form
      form={form}
      layout="vertical"
      onFinish={onAdd}
      style={{ width: 260 }}
      preserve={false}
    >
      <Form.Item
        label="Key"
        name="key"
        rules={[{ required: true, message: 'Key is required' }]}
        extra={
          (catalog?.length ?? 0) === 0 ? (
            <Text type="warning" style={{ fontSize: 12 }}>
              No label keys defined yet for {entityType}s.{' '}
              {canAdmin && (
                <a onClick={() => navigate('/admin/labels')}>Manage labels →</a>
              )}
            </Text>
          ) : null
        }
      >
        <AutoComplete
          options={catalogOptions}
          placeholder={catalogOptions[0]?.value ?? 'e.g. priority'}
          filterOption={(input, option) =>
            (option?.value as string).toLowerCase().includes(input.toLowerCase())
          }
          data-testid="label-key-input"
        />
      </Form.Item>
      <Form.Item
        label="Value"
        name="value"
        rules={[{ required: true, message: 'Value is required' }]}
      >
        <Input placeholder="e.g. high" data-testid="label-value-input" />
      </Form.Item>
      <Form.Item style={{ marginBottom: 0 }}>
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button
            size="small"
            onClick={() => {
              setPopoverOpen(false);
              form.resetFields();
            }}
          >
            Cancel
          </Button>
          <Button
            size="small"
            type="primary"
            htmlType="submit"
            loading={associate.isPending}
          >
            Add
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );

  const addButton = canEdit && !atCap && (
    <Popover
      title="Add label"
      content={addForm}
      open={popoverOpen}
      onOpenChange={(open) => {
        setPopoverOpen(open);
        if (!open) form.resetFields();
      }}
      trigger="click"
      placement="bottomLeft"
      destroyOnHidden
    >
      <Tag
        style={{
          borderStyle: 'dashed',
          cursor: 'pointer',
          background: 'transparent',
        }}
        data-testid="label-chip-add"
      >
        <PlusOutlined /> Add label
      </Tag>
    </Popover>
  );

  return (
    <span
      data-testid="label-chips"
      style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', gap: 0 }}
    >
      {!compact && (
        <Text type="secondary" style={{ marginInlineEnd: 8 }}>
          Labels:
        </Text>
      )}
      {chips.length === 0 && !canEdit && (
        <Text type="secondary">None</Text>
      )}
      {chips}
      {addButton}
      {atCap && canEdit && (
        <Text type="secondary" style={{ marginInlineStart: 8, fontSize: 12 }}>
          (max {LABEL_ASSOCIATION_CAP})
        </Text>
      )}
    </span>
  );
}
