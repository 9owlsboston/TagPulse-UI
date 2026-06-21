/* eslint-disable react-refresh/only-export-components -- column-factory helper,
   not a hot-reloadable component module: the public export is `excelColumn`
   (returns AntD column props), with `RangeDropdown` an internal render-prop. */
/**
 * Sprint 75 — Excel-like uniform column sort & filter for AntD `<Table>`.
 *
 * One column-factory that gives every column the same affordance an Excel
 * AutoFilter does: **sort asc/desc** plus a filter chosen by the column's
 * nature —
 *   - **text, high-cardinality** → a type-to-search wildcard editbox
 *     (delegates to {@link columnSearchFilter} / `matchWildcard`);
 *   - **enum / small-set** → a searchable checkbox list (AntD `filters` +
 *     `filterSearch`), values auto-derived from the dataset in client mode or
 *     supplied as static `options`;
 *   - **number / date** → sort (auto comparator) + an optional min/max range.
 *
 * Client mode (fully-loaded tables) auto-detects the control; the dataset is
 * passed as `rows` so distinct values can be derived. Server-paginated tables
 * use `mode: 'server'` and never client-filter (ADR-030 rule #2) — text pushes
 * a wildcard param via `onSearch`, enums bind to a server param via
 * `filteredValue` + `onFilter` is omitted.
 */
import Button from 'antd/es/button';
import InputNumber from 'antd/es/input-number';
import Space from 'antd/es/space';
import type { ColumnType } from 'antd/es/table';
import type { FilterDropdownProps } from 'antd/es/table/interface';
import { columnSearchFilter } from '@/components/ColumnSearchFilter';

export const FACET_MAX = 30;

export type ExcelKind = 'text' | 'enum' | 'number' | 'date';
export type FacetOption = { text: string; value: string };

/** Coerce an accessor value to a comparable string (filter + checkbox key). */
function asText(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

/** Coerce an accessor value to a number for sort/range, or `null`. */
function asNumber(v: unknown): number | null {
  if (v == null || v === '') return null;
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'number') return Number.isNaN(v) ? null : v;
  const t = Date.parse(String(v));
  if (!Number.isNaN(t)) return t;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

type ClientOpts<T> = {
  mode?: 'client';
  /** Cell value used for sort, filter, and distinct-derivation. */
  accessor: (row: T) => unknown;
  /** Dataset — required to auto-derive checkbox values for small-set columns. */
  rows?: readonly T[];
  /** Override the auto-detected control. */
  kind?: ExcelKind;
  /** Explicit enum values (skips auto-derivation). */
  options?: FacetOption[];
  /** Distinct-count threshold above which a text editbox is used. */
  facetMax?: number;
  /** Disable the sorter (default: sort is always attached). */
  sortable?: boolean;
  placeholder?: string;
};

type ServerOpts = {
  mode: 'server';
  kind: 'text' | 'enum' | 'number' | 'date';
  /** text mode: active pattern. */
  value?: string;
  /** text mode: push a wildcard pattern (or `undefined` to clear) to a param. */
  onSearch?: (pattern: string | undefined) => void;
  /** enum mode: static options bound to a server param. */
  options?: FacetOption[];
  /** enum mode: currently active values (controls the highlight). */
  filteredValue?: (string | number)[] | null;
  placeholder?: string;
};

function RangeDropdown({
  selectedKeys,
  setSelectedKeys,
  confirm,
  clearFilters,
}: FilterDropdownProps) {
  const [lo, hi] = (selectedKeys[0] as unknown as [number | null, number | null]) ?? [null, null];
  const set = (next: [number | null, number | null]) =>
    setSelectedKeys(next[0] == null && next[1] == null ? [] : [next as unknown as React.Key]);
  return (
    <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
      <Space direction="vertical">
        <Space>
          <InputNumber
            placeholder="Min"
            value={lo}
            aria-label="Range minimum"
            onChange={(v) => set([v as number | null, hi])}
          />
          <InputNumber
            placeholder="Max"
            value={hi}
            aria-label="Range maximum"
            onChange={(v) => set([lo, v as number | null])}
          />
        </Space>
        <Space>
          <Button type="primary" size="small" onClick={() => confirm({ closeDropdown: true })} style={{ width: 100 }}>
            Apply
          </Button>
          <Button
            size="small"
            onClick={() => {
              clearFilters?.();
              setSelectedKeys([]);
              confirm({ closeDropdown: true });
            }}
            style={{ width: 100 }}
          >
            Reset
          </Button>
        </Space>
      </Space>
    </div>
  );
}

type ExcelColumnProps<T> = Pick<
  ColumnType<T>,
  'sorter' | 'filters' | 'filterSearch' | 'filterDropdown' | 'filterIcon' | 'onFilter' | 'filteredValue'
>;

/**
 * Build AntD column props giving a column the uniform Excel-like sort + filter.
 * Spread onto a column def:
 * `{ title: 'Name', dataIndex: 'name', ...excelColumn<Row>({ rows, accessor: r => r.name }) }`.
 */
export function excelColumn<T>(opts: ClientOpts<T> | ServerOpts): ExcelColumnProps<T> {
  if (opts.mode === 'server') {
    return serverColumn<T>(opts);
  }
  return clientColumn<T>(opts);
}

function serverColumn<T>(opts: ServerOpts): ExcelColumnProps<T> {
  if (opts.kind === 'enum') {
    return {
      filters: opts.options ?? [],
      filterSearch: true,
      filteredValue: opts.filteredValue ?? null,
      // No onFilter — the server applies the filter (ADR-030 rule #2).
    };
  }
  if (opts.kind === 'number' || opts.kind === 'date') {
    return { sorter: true };
  }
  // text
  return {
    sorter: true,
    ...columnSearchFilter<T>({
      mode: 'server',
      value: opts.value,
      onSearch: opts.onSearch ?? (() => {}),
      placeholder: opts.placeholder,
    }),
  };
}

function clientColumn<T>(opts: ClientOpts<T>): ExcelColumnProps<T> {
  const { accessor, rows, kind, options, facetMax = FACET_MAX, sortable = true } = opts;

  const distinct = options ?? deriveOptions(rows, accessor);
  const resolvedKind: ExcelKind =
    kind ?? autoKind(rows, accessor, distinct.length, facetMax);

  const sorter = sortable ? makeSorter<T>(accessor, resolvedKind) : undefined;

  if (resolvedKind === 'number' || resolvedKind === 'date') {
    return {
      sorter,
      filterDropdown: (props) => <RangeDropdown {...props} />,
      onFilter: (value, record) => {
        const [lo, hi] = value as unknown as [number | null, number | null];
        const n = asNumber(accessor(record));
        if (n == null) return false;
        if (lo != null && n < lo) return false;
        if (hi != null && n > hi) return false;
        return true;
      },
    };
  }

  if (resolvedKind === 'enum' || (distinct.length > 0 && distinct.length <= facetMax)) {
    return {
      sorter,
      filters: distinct,
      filterSearch: true,
      onFilter: (value, record) => asText(accessor(record)) === String(value),
    };
  }

  // High-cardinality text → wildcard editbox.
  return {
    sorter,
    ...columnSearchFilter<T>({ accessor: (r) => asText(accessor(r)), placeholder: opts.placeholder }),
  };
}

function deriveOptions<T>(rows: readonly T[] | undefined, accessor: (row: T) => unknown): FacetOption[] {
  if (!rows || rows.length === 0) return [];
  const seen = new Set<string>();
  for (const r of rows) {
    const t = asText(accessor(r));
    if (t !== '') seen.add(t);
  }
  return [...seen].sort((a, b) => a.localeCompare(b)).map((v) => ({ text: v, value: v }));
}

function autoKind<T>(
  rows: readonly T[] | undefined,
  accessor: (row: T) => unknown,
  distinctCount: number,
  facetMax: number,
): ExcelKind {
  const sample = rows?.find((r) => accessor(r) != null);
  const v = sample ? accessor(sample) : null;
  if (typeof v === 'number') return 'number';
  if (v instanceof Date) return 'date';
  if (distinctCount > 0 && distinctCount <= facetMax) return 'enum';
  return 'text';
}

function makeSorter<T>(accessor: (row: T) => unknown, kind: ExcelKind): NonNullable<ColumnType<T>['sorter']> {
  if (kind === 'number' || kind === 'date') {
    return (a: T, b: T) => {
      const na = asNumber(accessor(a));
      const nb = asNumber(accessor(b));
      return (na ?? -Infinity) - (nb ?? -Infinity);
    };
  }
  return (a: T, b: T) => asText(accessor(a)).localeCompare(asText(accessor(b)));
}
