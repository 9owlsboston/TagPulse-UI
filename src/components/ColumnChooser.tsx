/**
 * Column chooser (Sprint 62, configurable-column-visibility Tier 1).
 *
 * A reusable list-page toolbar control: a "Columns" popover with a checkbox per
 * addressable column plus a "Show all" action. It is presentation-only and
 * stateless — the caller owns the hidden set (typically via
 * `useLocalColumnVisibility`) and passes toggle / show-all handlers. Built once
 * so every list page (Tag Reads, Assets, …) gets the same Excel/Office-style
 * column show/hide without a per-page fork.
 */
import type { ReactNode } from 'react';
import Button from 'antd/es/button';
import Checkbox from 'antd/es/checkbox';
import Popover from 'antd/es/popover';
import Space from 'antd/es/space';
import { SettingOutlined } from '@ant-design/icons';

/** One toggleable (addressable) column: its stable key + display label. */
export interface ColumnChooserItem {
  key: string;
  label: ReactNode;
}

export interface ColumnChooserProps {
  /** The addressable columns the user may show/hide (server-visible candidates). */
  columns: ColumnChooserItem[];
  /** Column keys currently hidden. */
  hidden: Set<string>;
  /** Show (`visible=true`) or hide (`visible=false`) a single column. */
  onToggle: (key: string, visible: boolean) => void;
  /** Reveal every hidden column ("Show all"). */
  onShowAll: () => void;
}

/**
 * Toolbar "Columns" popover. Renders nothing when there are no addressable
 * columns to toggle. The trigger shows a `shown/total` hint while any column is
 * hidden so the hidden state is discoverable.
 */
export function ColumnChooser({ columns, hidden, onToggle, onShowAll }: ColumnChooserProps) {
  if (columns.length === 0) return null;

  const hiddenCount = columns.reduce((n, c) => (hidden.has(c.key) ? n + 1 : n), 0);

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 180 }}>
      <Space direction="vertical" size={4}>
        {columns.map((c) => (
          <Checkbox
            key={c.key}
            checked={!hidden.has(c.key)}
            onChange={(e) => onToggle(c.key, e.target.checked)}
            data-testid={`column-toggle-${c.key}`}
          >
            {c.label}
          </Checkbox>
        ))}
      </Space>
      <Button
        type="link"
        size="small"
        disabled={hiddenCount === 0}
        onClick={onShowAll}
        style={{ paddingLeft: 0, alignSelf: 'flex-start' }}
        data-testid="column-chooser-show-all"
      >
        Show all
      </Button>
    </div>
  );

  return (
    <Popover content={content} title="Columns" trigger="click" placement="bottomRight">
      <Button icon={<SettingOutlined />} data-testid="column-chooser-trigger">
        Columns
        {hiddenCount > 0 ? ` (${columns.length - hiddenCount}/${columns.length})` : ''}
      </Button>
    </Popover>
  );
}
