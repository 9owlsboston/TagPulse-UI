/**
 * Column chooser (Sprint 62 Tier 1; Sprint 63 Tier 2, ADR-032 v1.3).
 *
 * A reusable list-page toolbar control: a "Columns" popover with a checkbox per
 * addressable column plus two distinct resets — **Show all** (reveal every
 * column, overriding the team floor) and an optional **Reset to team default**
 * (drop the user's override so the page re-inherits the tenant/role default).
 * It is presentation-only and stateless — the caller owns the hidden set
 * (via `useColumnVisibility`) and passes the toggle / show-all / reset handlers.
 * Built once so every list page (Tag Reads, Assets, …) gets the same
 * Excel/Office-style column show/hide without a per-page fork.
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
  /** Reveal every hidden column ("Show all" — overrides the team floor). */
  onShowAll: () => void;
  /**
   * Drop the user's column override so the page re-inherits the team default
   * ("Reset to team default"). Omitted in the per-device Tier 1 wiring, where
   * there is no server override to reset.
   */
  onResetToTeamDefault?: () => void;
  /** Disable the controls while a write is in flight. */
  busy?: boolean;
}

/**
 * Toolbar "Columns" popover. Renders nothing when there are no addressable
 * columns to toggle. The trigger shows a `shown/total` hint while any column is
 * hidden so the hidden state is discoverable.
 */
export function ColumnChooser({
  columns,
  hidden,
  onToggle,
  onShowAll,
  onResetToTeamDefault,
  busy = false,
}: ColumnChooserProps) {
  if (columns.length === 0) return null;

  const hiddenCount = columns.reduce((n, c) => (hidden.has(c.key) ? n + 1 : n), 0);

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 180 }}>
      <Space direction="vertical" size={4}>
        {columns.map((c) => (
          <Checkbox
            key={c.key}
            checked={!hidden.has(c.key)}
            disabled={busy}
            onChange={(e) => onToggle(c.key, e.target.checked)}
            data-testid={`column-toggle-${c.key}`}
          >
            {c.label}
          </Checkbox>
        ))}
      </Space>
      <Space direction="vertical" size={0} style={{ alignItems: 'flex-start' }}>
        <Button
          type="link"
          size="small"
          disabled={busy || hiddenCount === 0}
          onClick={onShowAll}
          style={{ paddingLeft: 0 }}
          data-testid="column-chooser-show-all"
        >
          Show all
        </Button>
        {onResetToTeamDefault && (
          <Button
            type="link"
            size="small"
            disabled={busy}
            onClick={onResetToTeamDefault}
            style={{ paddingLeft: 0 }}
            data-testid="column-chooser-reset-default"
          >
            Reset to team default
          </Button>
        )}
      </Space>
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
