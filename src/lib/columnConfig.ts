/**
 * Configurable-UI column application (Sprint 60, ADR-032 §4 / §6.3 `columns`).
 *
 * Pure helpers that apply a resolved `columns.<page>` leaf to an AntD column
 * list: hide columns, drop **advanced** (default-OFF) plumbing columns unless
 * the viewer opts in via the "Advanced columns" toggle, and reorder. Kept free
 * of React so the visibility/order logic is unit-tested in isolation (mirrors
 * `applyNavConfig` in `nav.tsx`).
 *
 * A column's identity is its `key` (falling back to a string `dataIndex`).
 * Columns without a resolvable key are always shown and never reordered — they
 * can't be addressed by config.
 */

/** The resolved `columns.<page>` leaf (lists always present). */
export interface ColumnConfigApplied {
  hidden: string[];
  order: string[];
  advanced: string[];
}

/** The slice of an AntD column the helpers read to identify it. */
export interface KeyedColumn {
  key?: string | number;
  dataIndex?: string | string[];
}

/** Resolve a column's stable string key (`key` wins, else a string `dataIndex`). */
export function columnKey(col: KeyedColumn): string | undefined {
  if (col.key != null) return String(col.key);
  if (typeof col.dataIndex === 'string') return col.dataIndex;
  return undefined;
}

/**
 * Stable reorder of keyed items by an explicit `order` list. Keyed items in
 * `order` sort to the front in that order; everything else keeps its original
 * relative position behind them. An empty `order` is a no-op.
 */
function orderByKeys<T>(items: readonly T[], order: string[]): T[] {
  if (order.length === 0) return [...items];
  const idx = new Map(order.map((k, i) => [k, i] as const));
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => {
      const ak = columnKey(a.item as KeyedColumn);
      const bk = columnKey(b.item as KeyedColumn);
      const ai = (ak !== undefined ? idx.get(ak) : undefined) ?? Number.MAX_SAFE_INTEGER;
      const bi = (bk !== undefined ? idx.get(bk) : undefined) ?? Number.MAX_SAFE_INTEGER;
      return ai !== bi ? ai - bi : a.i - b.i;
    })
    .map((x) => x.item);
}

/** The effective advanced set: the page's own defaults plus any config additions. */
function effectiveAdvanced(cfg: ColumnConfigApplied, defaultAdvanced: string[]): Set<string> {
  return new Set([...defaultAdvanced, ...cfg.advanced]);
}

/**
 * Apply the resolved `columns` leaf (ADR-032 §4) to an AntD column list.
 *
 * - `hidden` columns are removed unconditionally.
 * - **advanced** columns (the page's `defaultAdvanced` ∪ `cfg.advanced`) are
 *   removed unless `showAdvanced` is true — this is the default-OFF plumbing
 *   surface (TID, raw memory) revealed by the "Advanced columns" toggle.
 * - `order` reorders the surviving columns by key.
 *
 * Config can only restrict and reorder, never invent a column. With an empty
 * config and no `defaultAdvanced`, the input is returned unchanged.
 */
export function applyColumnConfig<T>(
  columns: readonly T[],
  cfg: ColumnConfigApplied,
  opts: { defaultAdvanced?: string[]; showAdvanced?: boolean } = {},
): T[] {
  const hidden = new Set(cfg.hidden);
  const advanced = effectiveAdvanced(cfg, opts.defaultAdvanced ?? []);
  const showAdvanced = opts.showAdvanced ?? false;
  const visible = columns.filter((col) => {
    const key = columnKey(col as KeyedColumn);
    if (key === undefined) return true; // unaddressable columns always show
    if (hidden.has(key)) return false;
    if (advanced.has(key) && !showAdvanced) return false;
    return true;
  });
  return orderByKeys(visible, cfg.order);
}

/**
 * True if the page has at least one *toggleable* advanced column — i.e. an
 * advanced column that isn't also `hidden`. Drives whether the "Advanced
 * columns" toggle is worth rendering at all (no toggle when nothing hides).
 */
export function hasAdvancedColumns<T>(
  columns: readonly T[],
  cfg: ColumnConfigApplied,
  defaultAdvanced: string[] = [],
): boolean {
  const advanced = effectiveAdvanced(cfg, defaultAdvanced);
  const hidden = new Set(cfg.hidden);
  return columns.some((col) => {
    const key = columnKey(col as KeyedColumn);
    return key !== undefined && advanced.has(key) && !hidden.has(key);
  });
}

/** A resolved default sort (`null` = no configured default). */
export interface DefaultSort {
  key: string;
  dir: 'asc' | 'desc';
}

/**
 * Apply a config-driven default sort (ADR-032 §4 `tables.<page>.defaultSort`)
 * to an AntD column list: set `defaultSortOrder` on the column whose key
 * matches `sort.key` (`asc`→`ascend`, `desc`→`descend`), clearing it from every
 * other column so only one default sort wins. A `null` sort returns the columns
 * unchanged. Matching column keeps every other prop (its `sorter`, render, …).
 *
 * No-op for a key that matches no column. Columns are shallow-cloned only where
 * the sort order changes, so referential identity is preserved elsewhere.
 */
export function applyDefaultSort<T>(
  columns: readonly T[],
  sort: DefaultSort | null,
): T[] {
  if (sort === null) return [...columns];
  const order = sort.dir === 'desc' ? 'descend' : 'ascend';
  return columns.map((col) => {
    const key = columnKey(col as KeyedColumn);
    if (key === sort.key) return { ...col, defaultSortOrder: order };
    // Strip any hardcoded defaultSortOrder so the config's choice is the only
    // default — AntD honours the last column carrying one otherwise.
    if ('defaultSortOrder' in (col as object)) {
      const next = { ...col } as Record<string, unknown>;
      delete next.defaultSortOrder;
      return next as T;
    }
    return col;
  });
}
