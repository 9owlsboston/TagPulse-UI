import type { ReactNode } from 'react';
import Badge from 'antd/es/badge';
import Card from 'antd/es/card';
import Space from 'antd/es/space';
import Typography from 'antd/es/typography';

const { Title, Text } = Typography;

// Sprint 55 (rolling forward Sprint 54.5) — canonical structure for
// operator-facing list pages. Replaces the per-page hand-rolled
// header + toolbar + Card + aside compositions in AssetList, TagList,
// AlertHistory, DeviceList, ProductList, StockLevels. Sprint 56 reuses
// this for the 14 admin-area list pages.
//
// Layout (top to bottom):
//
//   ┌──────────────────────────────────────────────────────────────┐
//   │ Title  [count]                          {primaryAction}      │  ← header row
//   │ {description (optional)}                                     │
//   ├──────────────────────────────────────────────────────────────┤
//   │ Card                                                         │
//   │   {toolbar (optional — filters, search, secondary actions)}  │
//   │   ┌────────────────────────────┬─────────────────────────┐   │
//   │   │ {children — the Table}      │ {aside (optional)}      │   │
//   │   └────────────────────────────┴─────────────────────────┘   │
//   └──────────────────────────────────────────────────────────────┘
//
// All slots except `title` and `children` are optional, so the same
// component covers the simple case (ProductList: title + primary
// action + table) and the rich case (AssetList: title + count + primary
// action + 6-control toolbar + table + filter aside).

export interface ListPageShellProps {
  /** Page title. Rendered as <Title level={titleLevel}>. */
  title: string;
  /** AntD Title level. Defaults to 2; TagList currently uses 3. */
  titleLevel?: 1 | 2 | 3 | 4 | 5;
  /** Optional row count rendered as a Badge to the right of the title. */
  count?: number;
  /** data-testid for the count badge (matches PR #67 naming convention). */
  countTestId?: string;
  /** Optional secondary description rendered under the title row. */
  description?: ReactNode;
  /**
   * Primary action shown at the top-right of the header row. Typically
   * an Add/Register button gated by useCanPerform / RoleGuard.
   */
  primaryAction?: ReactNode;
  /**
   * Toolbar rendered inside the Card, above children. Filters, search,
   * filter-drawer toggle, bulk actions. Caller composes its own Space.
   */
  toolbar?: ReactNode;
  /**
   * Optional aside rendered to the right of children inside the Card.
   * Typically a <FilterPanel/> shown when a filter drawer is toggled
   * open. Pass `undefined` (or `null`) when the drawer is closed.
   */
  aside?: ReactNode;
  /** The main content — usually an AntD <Table/>. */
  children: ReactNode;
  /** data-testid for the outermost wrapper. */
  testId?: string;
}

export function ListPageShell({
  title,
  titleLevel = 2,
  count,
  countTestId,
  description,
  primaryAction,
  toolbar,
  aside,
  children,
  testId,
}: ListPageShellProps) {
  return (
    <div data-testid={testId}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          marginBottom: description ? 4 : 16,
        }}
      >
        <Space align="center" size="small">
          <Title level={titleLevel} style={{ margin: 0 }}>
            {title}
          </Title>
          {typeof count === 'number' && (
            <Badge
              count={count}
              overflowCount={99999}
              showZero
              style={{
                backgroundColor: 'var(--color-surface-raised)',
                color: 'var(--color-text)',
              }}
              data-testid={countTestId}
            />
          )}
        </Space>
        {primaryAction}
      </div>
      {description && (
        <div style={{ marginBottom: 16 }}>
          {typeof description === 'string' ? (
            <Text type="secondary">{description}</Text>
          ) : (
            description
          )}
        </div>
      )}
      <Card>
        {toolbar && (
          <div
            style={{
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            {toolbar}
          </div>
        )}
        {aside ? (
          <div
            style={{
              display: 'flex',
              gap: 16,
              alignItems: 'flex-start',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: '1 1 480px', minWidth: 0 }}>{children}</div>
            {aside}
          </div>
        ) : (
          children
        )}
      </Card>
    </div>
  );
}
