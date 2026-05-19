/**
 * FilterPanel — Sprint 42 (UI half).
 *
 * Side-panel filter UX for list pages. Replaces the inline `<CategorySelect>`
 * (single-value) + `<LabelFilterStrip>` controls that previously lived in the
 * page header. The panel is opened by a "Filters" button in the header and
 * renders to the right of the table.
 *
 * Design notes:
 *   * Multi-select categories (Sprint 42) — emits an array of UUIDs that
 *     callers wire to `?category_ids=` (FastAPI default repeated query).
 *   * The Categories card is conditional on the entity having a category
 *     concept. Today that's only `entityType === 'asset'`; pass
 *     `showCategories={false}` for devices/sites/zones (Phase 2 of the
 *     sprint reuses this same component for those pages).
 *   * The Labels card delegates to the existing `<LabelFilterStrip>` so the
 *     chip-add UX (key+value with catalog autocomplete, caps, validation)
 *     stays in one place.
 *   * Deferred apply — the panel holds a *pending* state internally. Apply
 *     commits it up; Clear also commits an empty state up (so the table
 *     refreshes immediately); Close just dismisses the panel and discards
 *     pending changes. This matches the typical admin-dashboard filter UX
 *     and avoids firing one TanStack-Query refetch per checkbox click.
 *   * Externally-driven resets (e.g. another control on the page wiping
 *     filters) flow back into the pending state via the value-sync effects.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Checkbox,
  Empty,
  Input,
  Space,
  Tag,
  Typography,
} from 'antd';
import { CloseOutlined, FilterOutlined, SearchOutlined } from '@ant-design/icons';
import { useCategories } from '@/hooks/useCategories';
import { LabelFilterStrip } from '@/components/LabelFilterStrip';
import { isEmptyLabelFilter, type LabelFilter } from '@/lib/labelFilter';
import type { LabelEntityType } from '@/hooks/useLabels';

// Mirrors the colour/label maps in `CategorySelect`. Kept inline here to
// avoid restructuring that component just for two small constants — they
// are stable (4 enum values that mirror the backend `category_type` enum)
// and a follow-up refactor can pull them into `lib/categories.ts` if a
// third call-site appears.
const TYPE_COLOR: Record<string, string> = {
  liquid_container: 'blue',
  reference_tag: 'purple',
  rti_container: 'cyan',
  object: 'gold',
};

const TYPE_LABEL: Record<string, string> = {
  liquid_container: 'Liquid Container',
  reference_tag: 'Reference Tag',
  rti_container: 'RTI Container',
  object: 'Object',
};

export interface FilterPanelValue {
  categoryIds: string[];
  labelFilter: LabelFilter;
}

export interface FilterPanelProps {
  /** Drives which label catalog is loaded and which entity-scoped labels show. */
  entityType: LabelEntityType;
  /** Show the Categories card. Defaults to true for assets, false otherwise. */
  showCategories?: boolean;
  /** Currently applied (committed) filter state. */
  value: FilterPanelValue;
  /** Called when the user clicks Apply (or Clear). */
  onApply: (next: FilterPanelValue) => void;
  /** Called when the user dismisses the panel via the close button. */
  onClose: () => void;
  /** Optional override for the test-id prefix. */
  'data-testid'?: string;
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((v, i) => v === sortedB[i]);
}

function labelFiltersEqual(a: LabelFilter, b: LabelFilter): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    const va = a[k] ?? [];
    const vb = b[k] ?? [];
    if (!arraysEqual(va, vb)) return false;
  }
  return true;
}

export function FilterPanel({
  entityType,
  showCategories = entityType === 'asset',
  value,
  onApply,
  onClose,
  'data-testid': testId = 'filter-panel',
}: FilterPanelProps) {
  // Pending = local in-progress state, not yet applied.
  const [pendingCategoryIds, setPendingCategoryIds] = useState<string[]>(value.categoryIds);
  const [pendingLabels, setPendingLabels] = useState<LabelFilter>(value.labelFilter);
  const [search, setSearch] = useState('');

  // Re-sync pending state whenever the committed value changes from
  // outside (e.g. a "Reset all" link elsewhere on the page). Comparing by
  // identity is fine — the parent will pass a new array reference whenever
  // it changes the applied state.
  useEffect(() => {
    setPendingCategoryIds(value.categoryIds);
  }, [value.categoryIds]);
  useEffect(() => {
    setPendingLabels(value.labelFilter);
  }, [value.labelFilter]);

  // Categories list — limit 200 (the backend caps at this default and the
  // panel's vertical scroll handles the rest). `useCategories` already
  // caches with a 60s staleTime, so this is effectively free after the
  // first open.
  const { data: cats, isLoading: catsLoading } = useCategories({ limit: 200 });

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = (cats ?? []).filter((c) =>
      q === '' ? true : c.name.toLowerCase().includes(q),
    );
    const byType = new Map<string, typeof rows>();
    for (const r of rows) {
      const k = r.category_type;
      const list = byType.get(k) ?? [];
      list.push(r);
      byType.set(k, list);
    }
    return Array.from(byType.entries()).sort(([a], [b]) =>
      (TYPE_LABEL[a] ?? a).localeCompare(TYPE_LABEL[b] ?? b),
    );
  }, [cats, search]);

  const togglePendingCategory = (id: string) =>
    setPendingCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const isDirty =
    !arraysEqual(pendingCategoryIds, value.categoryIds) ||
    !labelFiltersEqual(pendingLabels, value.labelFilter);

  const hasAppliedFilters =
    value.categoryIds.length > 0 || !isEmptyLabelFilter(value.labelFilter);
  const hasAnyFiltersToClear =
    hasAppliedFilters ||
    pendingCategoryIds.length > 0 ||
    !isEmptyLabelFilter(pendingLabels);
  const appliedCount =
    value.categoryIds.length + Object.keys(value.labelFilter).length;

  const handleClear = () => {
    setPendingCategoryIds([]);
    setPendingLabels({});
    onApply({ categoryIds: [], labelFilter: {} });
  };

  const handleApply = () => {
    onApply({
      categoryIds: pendingCategoryIds,
      labelFilter: pendingLabels,
    });
  };

  return (
    <Card
      size="small"
      data-testid={testId}
      title={
        <Space>
          <FilterOutlined />
          <span>Filters</span>
          {appliedCount > 0 && (
            <Tag color="blue" data-testid={`${testId}-applied-count`}>
              {appliedCount} active
            </Tag>
          )}
        </Space>
      }
      extra={
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={onClose}
          aria-label="Close filter panel"
          data-testid={`${testId}-close`}
        />
      }
      style={{ width: 320 }}
      styles={{ body: { padding: 12 } }}
    >
      {showCategories && (
        <div style={{ marginBottom: 16 }} data-testid={`${testId}-categories`}>
          <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
            Categories
            {pendingCategoryIds.length > 0 && (
              <Tag color="blue" style={{ marginLeft: 8 }}>
                {pendingCategoryIds.length}
              </Tag>
            )}
          </Typography.Text>
          <Input
            size="small"
            allowClear
            placeholder="Search categories"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: 8 }}
            data-testid={`${testId}-category-search`}
          />
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {catsLoading && (
              <Typography.Text type="secondary">Loading…</Typography.Text>
            )}
            {!catsLoading && grouped.length === 0 && (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No categories match"
                style={{ margin: '8px 0' }}
              />
            )}
            {grouped.map(([type, rows]) => (
              <div key={type} style={{ marginBottom: 8 }}>
                <Typography.Text
                  type="secondary"
                  style={{
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: 0.4,
                  }}
                >
                  {TYPE_LABEL[type] ?? type}
                </Typography.Text>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    marginTop: 4,
                  }}
                >
                  {rows.map((c) => (
                    <Checkbox
                      key={c.id}
                      checked={pendingCategoryIds.includes(c.id)}
                      onChange={() => togglePendingCategory(c.id)}
                      data-testid={`${testId}-category-${c.id}`}
                    >
                      <Tag
                        color={TYPE_COLOR[c.category_type]}
                        style={{ marginRight: 4 }}
                      >
                        {c.name}
                      </Tag>
                    </Checkbox>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 16 }} data-testid={`${testId}-labels`}>
        <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
          Labels
          {Object.keys(pendingLabels).length > 0 && (
            <Tag color="blue" style={{ marginLeft: 8 }}>
              {Object.keys(pendingLabels).length}
            </Tag>
          )}
        </Typography.Text>
        <LabelFilterStrip
          entityType={entityType}
          value={pendingLabels}
          onChange={setPendingLabels}
        />
      </div>

      <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          size="small"
          onClick={handleClear}
          disabled={!hasAnyFiltersToClear}
          data-testid={`${testId}-clear`}
        >
          Clear
        </Button>
        <Button
          size="small"
          type="primary"
          onClick={handleApply}
          disabled={!isDirty}
          data-testid={`${testId}-apply`}
        >
          Apply
        </Button>
      </Space>
    </Card>
  );
}
