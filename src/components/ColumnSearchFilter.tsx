/* eslint-disable react-refresh/only-export-components -- column-factory helper,
   not a hot-reloadable component module: the public export is `columnSearchFilter`
   (returns AntD column props), with `SearchDropdown` as an internal render-prop. */
/**
 * Sprint 70 — reusable wildcard column-search filter for AntD `<Table>`.
 *
 * Returns the AntD column props (`filterDropdown` + `filterIcon` + either
 * `onFilter` for client-side tables or `filteredValue` for server-paginated
 * tables) so every list page gets an identical "type `reader-*` in the column
 * header" search box.
 *
 * Two modes (per ADR-030 hard-rule #2 — never client-filter a paginated table):
 *   - **client**: fully-loaded table. `onFilter` runs {@link matchWildcard}
 *     against `accessor(row)`.
 *   - **server**: paginated table. The dropdown pushes the raw pattern to
 *     `onSearch` (→ a query param); no `onFilter` (the API filters). The active
 *     state is reflected via `filteredValue`.
 *
 * Grammar lives in `src/lib/wildcard.ts` (mirrors the backend `wildcard_to_ilike`).
 */
import { SearchOutlined } from '@ant-design/icons';
import Button from 'antd/es/button';
import Input from 'antd/es/input';
import Space from 'antd/es/space';
import type { InputRef } from 'antd/es/input';
import type { ColumnType } from 'antd/es/table';
import type { FilterDropdownProps } from 'antd/es/table/interface';
import { useEffect, useRef } from 'react';
import { matchWildcard } from '@/lib/wildcard';

const ACTIVE_COLOR = 'var(--color-accent)';
const DEFAULT_PLACEHOLDER = 'e.g. reader-*';

interface SearchDropdownProps extends FilterDropdownProps {
  placeholder: string;
  /** Server mode: called with the trimmed pattern (or `undefined` to clear). */
  onSearch?: (pattern: string | undefined) => void;
}

function SearchDropdown({
  selectedKeys,
  setSelectedKeys,
  confirm,
  clearFilters,
  close,
  placeholder,
  onSearch,
}: SearchDropdownProps) {
  const inputRef = useRef<InputRef>(null);
  useEffect(() => {
    // Autofocus when the dropdown opens.
    const id = window.setTimeout(() => inputRef.current?.select(), 0);
    return () => window.clearTimeout(id);
  }, []);

  const value = (selectedKeys[0] as string) ?? '';

  const apply = () => {
    const pattern = value.trim();
    onSearch?.(pattern || undefined);
    confirm({ closeDropdown: true });
  };

  const reset = () => {
    clearFilters?.();
    setSelectedKeys([]);
    onSearch?.(undefined);
    confirm({ closeDropdown: true });
  };

  return (
    <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
      <Input
        ref={inputRef}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
        onPressEnter={apply}
        aria-label="Wildcard search"
        style={{ marginBottom: 8, display: 'block', width: 220 }}
      />
      <Space>
        <Button
          type="primary"
          size="small"
          icon={<SearchOutlined />}
          onClick={apply}
          style={{ width: 100 }}
        >
          Search
        </Button>
        <Button size="small" onClick={reset} style={{ width: 100 }}>
          Reset
        </Button>
        <Button type="link" size="small" onClick={() => close()}>
          Close
        </Button>
      </Space>
    </div>
  );
}

type ClientOpts<T> = {
  mode?: 'client';
  /** Cell value to match against the wildcard pattern. */
  accessor: (row: T) => string | null | undefined;
  placeholder?: string;
};

type ServerOpts = {
  mode: 'server';
  /** Current active pattern (controls the active-filter highlight). */
  value?: string;
  /** Called with the new pattern (or `undefined` when cleared). */
  onSearch: (pattern: string | undefined) => void;
  placeholder?: string;
};

/**
 * Build the AntD column props for a wildcard search box. Spread onto a column:
 * `{ title: 'Reader', dataIndex: 'name', ...columnSearchFilter({ accessor: r => r.name }) }`.
 */
export function columnSearchFilter<T>(
  opts: ClientOpts<T> | ServerOpts,
): Pick<ColumnType<T>, 'filterDropdown' | 'filterIcon' | 'onFilter' | 'filteredValue'> {
  const placeholder = opts.placeholder ?? DEFAULT_PLACEHOLDER;

  const filterIcon = (filtered: boolean) => (
    <SearchOutlined style={{ color: filtered ? ACTIVE_COLOR : undefined }} />
  );

  if (opts.mode === 'server') {
    return {
      filterDropdown: (props) => (
        <SearchDropdown {...props} placeholder={placeholder} onSearch={opts.onSearch} />
      ),
      filterIcon,
      filteredValue: opts.value ? [opts.value] : null,
      // No onFilter — the server filters; client-filtering a paginated table
      // would only filter the loaded page (ADR-030 rule #2).
    };
  }

  const accessor = opts.accessor;
  return {
    filterDropdown: (props) => <SearchDropdown {...props} placeholder={placeholder} />,
    filterIcon,
    onFilter: (value, record) => matchWildcard(accessor(record), String(value)),
  };
}
