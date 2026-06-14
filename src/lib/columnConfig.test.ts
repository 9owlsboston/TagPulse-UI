import { describe, it, expect } from 'vitest';
import {
  applyColumnConfig,
  hasAdvancedColumns,
  columnKey,
  type KeyedColumn,
} from '@/lib/columnConfig';

// Minimal AntD-shaped columns — the helpers only read `key` / `dataIndex`.
const cols = (): KeyedColumn[] => [
  { key: 'tag_id', dataIndex: 'tag_id' },
  { key: 'epc', dataIndex: 'epc' },
  { key: 'tid', dataIndex: 'tid' },
  { key: 'user_memory_hex', dataIndex: 'user_memory_hex' },
  { key: 'timestamp', dataIndex: 'timestamp' },
];

const EMPTY = { hidden: [], order: [], advanced: [] };

describe('columnKey', () => {
  it('prefers key, falls back to a string dataIndex, else undefined', () => {
    expect(columnKey({ key: 'a', dataIndex: 'b' })).toBe('a');
    expect(columnKey({ dataIndex: 'b' })).toBe('b');
    expect(columnKey({ dataIndex: ['x', 'y'] })).toBeUndefined();
    expect(columnKey({})).toBeUndefined();
    expect(columnKey({ key: 7 })).toBe('7');
  });
});

describe('applyColumnConfig', () => {
  it('is a no-op with empty config and no default-advanced', () => {
    const out = applyColumnConfig(cols(), EMPTY);
    expect(out.map(columnKey)).toEqual(['tag_id', 'epc', 'tid', 'user_memory_hex', 'timestamp']);
  });

  it('drops default-advanced columns when the toggle is off', () => {
    const out = applyColumnConfig(cols(), EMPTY, {
      defaultAdvanced: ['tid', 'user_memory_hex'],
    });
    expect(out.map(columnKey)).toEqual(['tag_id', 'epc', 'timestamp']);
  });

  it('reveals default-advanced columns when the toggle is on', () => {
    const out = applyColumnConfig(cols(), EMPTY, {
      defaultAdvanced: ['tid', 'user_memory_hex'],
      showAdvanced: true,
    });
    expect(out.map(columnKey)).toEqual(['tag_id', 'epc', 'tid', 'user_memory_hex', 'timestamp']);
  });

  it('merges config.advanced with the page default-advanced set', () => {
    const out = applyColumnConfig(cols(), { ...EMPTY, advanced: ['epc'] }, {
      defaultAdvanced: ['tid'],
    });
    // epc (config) + tid (default) both hidden; user_memory_hex still shown
    expect(out.map(columnKey)).toEqual(['tag_id', 'user_memory_hex', 'timestamp']);
  });

  it('hides columns unconditionally regardless of the toggle', () => {
    const out = applyColumnConfig(cols(), { ...EMPTY, hidden: ['epc'] }, {
      showAdvanced: true,
    });
    expect(out.map(columnKey)).not.toContain('epc');
  });

  it('reorders surviving columns by the order list', () => {
    const out = applyColumnConfig(cols(), { ...EMPTY, order: ['timestamp', 'tag_id'] });
    // listed keys first in order; unlisted keep original relative position
    expect(out.map(columnKey)).toEqual(['timestamp', 'tag_id', 'epc', 'tid', 'user_memory_hex']);
  });

  it('always shows columns without a resolvable key', () => {
    const withUnkeyed: KeyedColumn[] = [{ dataIndex: ['nested', 'x'] }, { key: 'tid' }];
    const out = applyColumnConfig(withUnkeyed, EMPTY, { defaultAdvanced: ['tid'] });
    expect(out).toHaveLength(1); // tid dropped, unkeyed survives
    expect(columnKey(out[0]!)).toBeUndefined();
  });
});

describe('hasAdvancedColumns', () => {
  it('is true when a default-advanced column is present and not hidden', () => {
    expect(hasAdvancedColumns(cols(), EMPTY, ['tid'])).toBe(true);
  });

  it('is false when there are no advanced columns at all', () => {
    expect(hasAdvancedColumns(cols(), EMPTY)).toBe(false);
  });

  it('is false when the only advanced column is also hidden', () => {
    expect(hasAdvancedColumns(cols(), { ...EMPTY, hidden: ['tid'] }, ['tid'])).toBe(false);
  });

  it('counts config.advanced as well as the page default', () => {
    expect(hasAdvancedColumns(cols(), { ...EMPTY, advanced: ['epc'] })).toBe(true);
  });
});
