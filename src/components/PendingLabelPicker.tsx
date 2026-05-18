/**
 * PendingLabelPicker — Sprint 37 / remediation row 3.9d.
 *
 * Sibling to <LabelChips/>. Where LabelChips reads/writes associations
 * against an existing entity (`POST /{entity_segment}/{id}/labels`),
 * PendingLabelPicker is a **client-side queue** used in Create modals,
 * *before* the entity exists. Users build up a `(key, value)[]` queue;
 * the parent component flushes it via `attachPendingLabels()` after the
 * Create response returns with the new entity_id.
 *
 * UX mirrors LabelChips exactly: closable chips + dashed "+ Add label"
 * popover with a key autocomplete sourced from `/labels?entity_type=…`
 * and a free-text value. Same 30-cap, same RBAC gate (editor+), same
 * "Manage labels →" deep link to /admin/labels when the catalog is
 * empty for this entity_type.
 *
 * Differences vs LabelChips:
 *   - No network calls during queueing — pure in-memory state.
 *   - Duplicate (key, value) pairs are rejected client-side.
 *   - Cap-check is best-effort (the server still enforces 30 per entity
 *     at insert time, so a race between two browser tabs can still 409).
 */
import { useMemo, useState } from 'react';
import App from 'antd/es/app';
import AutoComplete from 'antd/es/auto-complete';
import Button from 'antd/es/button';
import Form from 'antd/es/form';
import Input from 'antd/es/input';
import Popover from 'antd/es/popover';
import Space from 'antd/es/space';
import Tag from 'antd/es/tag';
import Typography from 'antd/es/typography';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { LabelsService } from '@/api/generated/services/LabelsService';
import type { LabelAssociationCreate } from '@/api/generated/models/LabelAssociationCreate';
import {
  entitySegmentFor,
  useLabels,
  type LabelEntityType,
} from '@/hooks/useLabels';
import { useCanPerform } from '@/components/useCanPerform';
import { LABEL_ASSOCIATION_CAP } from '@/components/LabelChips';

const { Text } = Typography;

export type PendingLabel = LabelAssociationCreate;

export interface PendingLabelPickerProps {
  entityType: LabelEntityType;
  value: PendingLabel[];
  onChange: (next: PendingLabel[]) => void;
  /** Hide the picker UI entirely (e.g. while the Create request is in flight). */
  disabled?: boolean;
}

/**
 * Post-create flush. Iterates the pending list and POSTs each association.
 * Returns a per-label outcome; the caller decides how to surface failures
 * (typically a toast + leave the user on the new detail page so they can
 * retry from <LabelChips/>).
 */
// eslint-disable-next-line react-refresh/only-export-components
export async function attachPendingLabels(
  entityType: LabelEntityType,
  entityId: string,
  pending: PendingLabel[],
): Promise<{ ok: number; failed: { label: PendingLabel; error: unknown }[] }> {
  let ok = 0;
  const failed: { label: PendingLabel; error: unknown }[] = [];
  const segment = entitySegmentFor(entityType);
  for (const l of pending) {
    try {
      await LabelsService.associateLabelEntitySegmentEntityIdLabelsPost(
        segment,
        entityId,
        l,
      );
      ok++;
    } catch (error) {
      failed.push({ label: l, error });
    }
  }
  return { ok, failed };
}

export function PendingLabelPicker({
  entityType,
  value,
  onChange,
  disabled = false,
}: PendingLabelPickerProps) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const canEdit = useCanPerform('editor');
  const canAdmin = useCanPerform('admin');
  const { data: catalog } = useLabels({ entity_type: entityType });

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [form] = Form.useForm<PendingLabel>();

  const atCap = value.length >= LABEL_ASSOCIATION_CAP;

  const catalogOptions = useMemo(
    () => (catalog ?? []).map((c) => ({ value: c.key, label: c.key })),
    [catalog],
  );

  const colorByKey = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const c of catalog ?? []) m.set(c.key, c.color ?? null);
    return m;
  }, [catalog]);

  if (!canEdit) {
    // Viewers don't see the picker at all — they can't write associations.
    return null;
  }

  const onAdd = (values: PendingLabel) => {
    const duplicate = value.some(
      (p) => p.key.toLowerCase() === values.key.toLowerCase() && p.value === values.value,
    );
    if (duplicate) {
      message.error(`"${values.key}: ${values.value}" is already queued.`);
      return;
    }
    if (atCap) {
      message.error(`Cap reached (${LABEL_ASSOCIATION_CAP} per entity).`);
      return;
    }
    onChange([...value, values]);
    setPopoverOpen(false);
    form.resetFields();
  };

  const onRemove = (idx: number) => {
    const next = [...value];
    next.splice(idx, 1);
    onChange(next);
  };

  const chips = value.map((p, idx) => {
    const color = colorByKey.get(p.key) ?? undefined;
    return (
      <Tag
        key={`${p.key}:${p.value}:${idx}`}
        color={color ?? undefined}
        closable
        onClose={(e) => {
          e.preventDefault();
          onRemove(idx);
        }}
        data-testid={`pending-label-chip-${p.key}`}
        style={{ marginInlineEnd: 4, marginBlock: 2 }}
      >
        <strong>{p.key}</strong>: {p.value}
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
          data-testid="pending-label-key-input"
        />
      </Form.Item>
      <Form.Item
        label="Value"
        name="value"
        rules={[{ required: true, message: 'Value is required' }]}
      >
        <Input placeholder="e.g. high" data-testid="pending-label-value-input" />
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
          <Button size="small" type="primary" htmlType="submit">
            Queue
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );

  const addButton = !atCap && !disabled && (
    <Popover
      title="Queue label"
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
        data-testid="pending-label-chip-add"
      >
        <PlusOutlined /> Add label
      </Tag>
    </Popover>
  );

  return (
    <span
      data-testid="pending-label-picker"
      style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', gap: 0 }}
    >
      {chips}
      {addButton}
      {atCap && (
        <Text type="secondary" style={{ marginInlineStart: 8, fontSize: 12 }}>
          (max {LABEL_ASSOCIATION_CAP})
        </Text>
      )}
    </span>
  );
}
