import { describe, expect, it, vi } from 'vitest';
import { excelColumn } from './ExcelColumn';

type Row = { name: string; status: string; signal: number; ts: string };

const ROWS: Row[] = [
  { name: 'reader-01', status: 'active', signal: -50, ts: '2026-06-01T00:00:00Z' },
  { name: 'reader-02', status: 'active', signal: -70, ts: '2026-06-02T00:00:00Z' },
  { name: 'gateway-09', status: 'retired', signal: -40, ts: '2026-06-03T00:00:00Z' },
];

describe('excelColumn — client auto-detection', () => {
  it('uses a checkbox list for small-set columns', () => {
    const col = excelColumn<Row>({ rows: ROWS, accessor: (r) => r.status });
    expect(col.filters).toEqual([
      { text: 'active', value: 'active' },
      { text: 'retired', value: 'retired' },
    ]);
    expect(col.filterSearch).toBe(true);
    expect(col.onFilter!('active', ROWS[0]!)).toBe(true);
    expect(col.onFilter!('active', ROWS[2]!)).toBe(false);
    expect(col.sorter).toBeTypeOf('function');
  });

  it('uses a wildcard editbox for high-cardinality text', () => {
    const col = excelColumn<Row>({ rows: ROWS, accessor: (r) => r.name, facetMax: 1 });
    expect(col.filters).toBeUndefined();
    expect(col.filterDropdown).toBeTypeOf('function');
    expect(col.onFilter!('reader-*', ROWS[0]!)).toBe(true);
    expect(col.onFilter!('reader-*', ROWS[2]!)).toBe(false);
  });

  it('uses a numeric range + comparator for number columns', () => {
    const col = excelColumn<Row>({ rows: ROWS, accessor: (r) => r.signal, kind: 'number' });
    expect(col.filterDropdown).toBeTypeOf('function');
    // [min, max] tuple is the selected key.
    expect(col.onFilter!([-60, null] as never, ROWS[0]!)).toBe(true); // -50 >= -60
    expect(col.onFilter!([-60, null] as never, ROWS[1]!)).toBe(false); // -70 < -60
    const sorted = [...ROWS].sort((a, b) => (col.sorter as (a: Row, b: Row) => number)(a, b));
    expect(sorted[0]!.signal).toBe(-70);
  });

  it('attaches a date comparator for date columns', () => {
    const col = excelColumn<Row>({ rows: ROWS, accessor: (r) => r.ts, kind: 'date' });
    const sorted = [...ROWS].sort((a, b) => (col.sorter as (a: Row, b: Row) => number)(a, b));
    expect(sorted[0]!.ts).toBe('2026-06-01T00:00:00Z');
  });

  it('honours sortable: false', () => {
    const col = excelColumn<Row>({ rows: ROWS, accessor: (r) => r.name, sortable: false });
    expect(col.sorter).toBeUndefined();
  });
});

describe('excelColumn — server mode', () => {
  it('text mode pushes a wildcard pattern and omits onFilter', () => {
    const onSearch = vi.fn();
    const col = excelColumn<Row>({ mode: 'server', kind: 'text', value: 'reader-*', onSearch });
    expect(col.onFilter).toBeUndefined();
    expect(col.filteredValue).toEqual(['reader-*']);
    expect(col.sorter).toBe(true);
    expect(col.filterDropdown).toBeTypeOf('function');
  });

  it('enum mode binds static options without client onFilter', () => {
    const col = excelColumn<Row>({
      mode: 'server',
      kind: 'enum',
      options: [{ text: 'Active', value: 'active' }],
      filteredValue: ['active'],
    });
    expect(col.onFilter).toBeUndefined();
    expect(col.filters).toEqual([{ text: 'Active', value: 'active' }]);
    expect(col.filterSearch).toBe(true);
    expect(col.filteredValue).toEqual(['active']);
  });

  it('number mode is sort-only on the server', () => {
    const col = excelColumn<Row>({ mode: 'server', kind: 'number' });
    expect(col.sorter).toBe(true);
    expect(col.filterDropdown).toBeUndefined();
  });
});
