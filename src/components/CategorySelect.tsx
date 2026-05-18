/**
 * CategorySelect — reusable AntD `<Select>` populated from `useCategories()`.
 *
 * Sprint 37 row 3.3a (Category wiring on Asset CRUD).
 *
 * Used in:
 *   - AssetList Create Asset modal
 *   - AssetDetail Edit Asset modal
 *   - AssetList header (as a list-page filter)
 *
 * Options are grouped by `category_type` (matches the catalog page's grouping
 * and the four-enum constraint from ADR 019). Each option label is
 * `name`; the underlying value is the category `id` (uuid) so it can be
 * bound straight to a Form.Item for `category_id`.
 *
 * `allowClear` is on by default — Category is optional on the backend
 * (`assets.category_id` is nullable) and the user must be able to remove
 * a previously-set value.
 *
 * Loading + empty states match the AntD defaults; the parent component
 * controls placement, label, and required-ness via `Form.Item`.
 */
import Select from 'antd/es/select';
import Spin from 'antd/es/spin';
import Tag from 'antd/es/tag';
import { useMemo } from 'react';
import { useCategories } from '@/hooks/useCategories';
import { CategoryResponse } from '@/api/generated/models/CategoryResponse';

const TYPE_COLOR: Record<string, string> = {
  liquid_container: 'blue',
  reference_tag: 'purple',
  rti_container: 'cyan',
  object: 'gold',
};

const TYPE_LABEL: Record<string, string> = {
  liquid_container: 'Liquid container',
  reference_tag: 'Reference tag',
  rti_container: 'RTI container',
  object: 'Object',
};

export interface CategorySelectProps {
  /** Current `category_id` (uuid) or null/undefined. */
  value?: string | null;
  /** Called with the new `category_id` or `undefined` when cleared. */
  onChange?: (value: string | undefined) => void;
  /** Optional placeholder text. */
  placeholder?: string;
  /** Optional disable. */
  disabled?: boolean;
  /** Width override (default: 100%). */
  style?: React.CSSProperties;
  /** When true (default), shows a Clear "x" in the input. */
  allowClear?: boolean;
  /** Restrict options to a single `category_type`. */
  categoryType?: CategoryResponse.category_type;
  /** Optional test id for unit tests. */
  'data-testid'?: string;
}

export function CategorySelect({
  value,
  onChange,
  placeholder = 'Select a category…',
  disabled,
  style,
  allowClear = true,
  categoryType,
  'data-testid': testId,
}: CategorySelectProps) {
  const { data, isLoading } = useCategories({
    category_type: categoryType,
    limit: 200,
  });

  // Group by category_type so editors / admins scanning a long catalog
  // can find the right one quickly. Same grouping shape used on the
  // catalog page.
  const groupedOptions = useMemo(() => {
    const rows = data ?? [];
    const byType = new Map<string, CategoryResponse[]>();
    for (const c of rows) {
      const arr = byType.get(c.category_type) ?? [];
      arr.push(c);
      byType.set(c.category_type, arr);
    }
    const groups: { label: React.ReactNode; options: { value: string; label: React.ReactNode }[] }[] = [];
    for (const [type, items] of [...byType.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      groups.push({
        label: (
          <span>
            <Tag color={TYPE_COLOR[type] ?? 'default'} style={{ marginRight: 4 }}>
              {TYPE_LABEL[type] ?? type}
            </Tag>
          </span>
        ),
        options: items
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((c) => ({
            value: c.id,
            label: c.name,
          })),
      });
    }
    return groups;
  }, [data]);

  return (
    <Select<string>
      data-testid={testId}
      value={value ?? undefined}
      onChange={(v) => onChange?.(v ?? undefined)}
      placeholder={placeholder}
      disabled={disabled}
      style={{ width: '100%', ...style }}
      allowClear={allowClear}
      showSearch
      filterOption={(input, option) =>
        // Search by the inner option label string. Group labels are React
        // nodes so we only filter on the plain leaf option labels.
        typeof option?.label === 'string'
          ? option.label.toLowerCase().includes(input.toLowerCase())
          : false
      }
      notFoundContent={isLoading ? <Spin size="small" /> : 'No categories'}
      options={groupedOptions}
    />
  );
}
