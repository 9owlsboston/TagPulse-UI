/**
 * LabelFilterStrip — Sprint 37 / remediation row 3.9b.
 *
 * Compact inline strip that lets users build a label filter and emits a
 * normalized `LabelFilter` (`{key: [values…]}`) up to the parent. Pairs
 * with the URL-bound `labels[KEY]=V1,V2` query-string contract on the
 * backend (ADR 020, Phase C of remediation row 2.2).
 *
 * UX:
 *   - Each active key renders as an AntD <Tag> grouped with its value
 *     chips. Tag X removes a single value; the chip's parent group X
 *     removes the whole key.
 *   - A trailing dashed "+ Filter by label" Tag opens a Popover with:
 *       • key AutoComplete (sourced from `useLabels({entity_type})`)
 *       • value Input (free-text; honors `^[A-Za-z0-9._-]{1,64}$`)
 *   - 5-key / 20-value-per-key caps mirror server validation.
 *   - Hidden when the catalog has zero rows for the entity_type (the
 *     filter would be unusable). Admins see a small "Manage labels →"
 *     affordance instead.
 *
 * Stateless / controlled: the parent owns `value` + `onChange`, which
 * keeps the URL-bound source of truth in the page.
 */
import { useMemo, useState } from 'react';
import App from 'antd/es/app';
import AutoComplete from 'antd/es/auto-complete';
import Button from 'antd/es/button';
import Input from 'antd/es/input';
import Popover from 'antd/es/popover';
import Space from 'antd/es/space';
import Tag from 'antd/es/tag';
import Typography from 'antd/es/typography';
import { CloseOutlined, FilterOutlined, PlusOutlined } from '@ant-design/icons';
import { useLabels, type LabelEntityType } from '@/hooks/useLabels';
import {
  isValidLabelKey,
  isValidLabelValue,
  LABEL_FILTER_MAX_KEYS,
  LABEL_FILTER_MAX_VALUES_PER_KEY,
  normalizeLabelFilter,
  type LabelFilter,
} from '@/lib/labelFilter';

const { Text } = Typography;

export interface LabelFilterStripProps {
  entityType: LabelEntityType;
  value: LabelFilter;
  onChange: (next: LabelFilter) => void;
  /**
   * When provided, rendered as a small leading hint (e.g. "Filter by:").
   * Defaults to a filter icon + "Labels:" label.
   */
  prefix?: React.ReactNode;
}

export function LabelFilterStrip({
  entityType,
  value,
  onChange,
  prefix,
}: LabelFilterStripProps) {
  const { message } = App.useApp();
  const { data: catalog } = useLabels({ entity_type: entityType });
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [pendingKey, setPendingKey] = useState('');
  const [pendingValue, setPendingValue] = useState('');

  const norm = useMemo(() => normalizeLabelFilter(value), [value]);
  const keys = Object.keys(norm);
  const atKeyCap = keys.length >= LABEL_FILTER_MAX_KEYS;

  const catalogOptions = useMemo(
    () => (catalog ?? []).map((c) => ({ value: c.key, label: c.key })),
    [catalog],
  );

  // Hide the strip entirely when the tenant has no label catalog rows
  // for this entity_type — the filter would have nothing to suggest.
  if (catalog && catalog.length === 0) {
    return null;
  }

  const removeValue = (key: string, val: string) => {
    const remaining = (norm[key] ?? []).filter((v) => v !== val);
    const next = { ...norm };
    if (remaining.length === 0) {
      delete next[key];
    } else {
      next[key] = remaining;
    }
    onChange(next);
  };

  const removeKey = (key: string) => {
    const next = { ...norm };
    delete next[key];
    onChange(next);
  };

  const resetPopover = () => {
    setPendingKey('');
    setPendingValue('');
  };

  const onAdd = () => {
    const k = pendingKey.trim();
    const v = pendingValue.trim();
    if (!k) {
      message.error('Pick a label key first');
      return;
    }
    if (!isValidLabelKey(k)) {
      message.error('Label key must be 3-24 chars, A-Z / 0-9 / _ . + $');
      return;
    }
    if (!v) {
      message.error('Enter a value');
      return;
    }
    if (!isValidLabelValue(v)) {
      message.error('Value must be 1-64 chars, A-Z / 0-9 / . _ -');
      return;
    }
    const existing = norm[k] ?? [];
    if (existing.includes(v)) {
      message.warning(`Already filtering ${k}=${v}`);
      return;
    }
    if (!(k in norm) && atKeyCap) {
      message.error(`Max ${LABEL_FILTER_MAX_KEYS} filter keys`);
      return;
    }
    if (existing.length >= LABEL_FILTER_MAX_VALUES_PER_KEY) {
      message.error(`Max ${LABEL_FILTER_MAX_VALUES_PER_KEY} values per key`);
      return;
    }
    onChange({ ...norm, [k]: [...existing, v] });
    resetPopover();
    setPopoverOpen(false);
  };

  const popoverContent = (
    <div data-testid="label-filter-popover" style={{ width: 260 }}>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>Key</Text>
          <AutoComplete
            data-testid="label-filter-key-input"
            value={pendingKey}
            onChange={setPendingKey}
            options={catalogOptions}
            placeholder="priority"
            style={{ width: '100%' }}
            filterOption={(input, option) =>
              (option?.value ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>Value</Text>
          <Input
            data-testid="label-filter-value-input"
            value={pendingValue}
            onChange={(e) => setPendingValue(e.target.value)}
            placeholder="high"
            onPressEnter={onAdd}
          />
        </div>
        <Space>
          <Button
            type="primary"
            size="small"
            data-testid="label-filter-add-btn"
            onClick={onAdd}
          >
            Add
          </Button>
          <Button
            size="small"
            onClick={() => {
              resetPopover();
              setPopoverOpen(false);
            }}
          >
            Cancel
          </Button>
        </Space>
      </Space>
    </div>
  );

  const hasAny = keys.length > 0;

  return (
    <Space
      size={[4, 4]}
      wrap
      data-testid="label-filter-strip"
      style={{ width: '100%' }}
    >
      {prefix ?? (
        <Text type="secondary" style={{ fontSize: 12 }}>
          <FilterOutlined style={{ marginRight: 4 }} />
          Labels:
        </Text>
      )}
      {keys.map((key) => (
        <Space.Compact
          key={key}
          data-testid={`label-filter-group-${key}`}
          size="small"
        >
          <Tag color="blue" style={{ marginRight: 0 }}>
            {key}
          </Tag>
          {(norm[key] ?? []).map((v) => (
            <Tag
              key={v}
              closable
              data-testid={`label-filter-chip-${key}-${v}`}
              onClose={(e) => {
                e.preventDefault();
                removeValue(key, v);
              }}
            >
              {v}
            </Tag>
          ))}
          <Button
            size="small"
            type="text"
            icon={<CloseOutlined />}
            data-testid={`label-filter-remove-key-${key}`}
            onClick={() => removeKey(key)}
            aria-label={`Remove ${key} filter`}
          />
        </Space.Compact>
      ))}
      {!atKeyCap && (
        <Popover
          trigger="click"
          open={popoverOpen}
          onOpenChange={(open) => {
            setPopoverOpen(open);
            if (!open) resetPopover();
          }}
          content={popoverContent}
          placement="bottomLeft"
        >
          <Tag
            data-testid="label-filter-add-tag"
            style={{
              cursor: 'pointer',
              borderStyle: 'dashed',
              background: 'transparent',
            }}
          >
            <PlusOutlined style={{ marginRight: 4 }} />
            {hasAny ? 'Add filter' : 'Filter by label'}
          </Tag>
        </Popover>
      )}
      {hasAny && (
        <Button
          type="link"
          size="small"
          data-testid="label-filter-clear"
          onClick={() => onChange({})}
        >
          Clear
        </Button>
      )}
    </Space>
  );
}
