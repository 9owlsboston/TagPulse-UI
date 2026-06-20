import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { FilterDropdownProps } from 'antd/es/table/interface';
import { columnSearchFilter } from './ColumnSearchFilter';

function dropdownProps(overrides: Partial<FilterDropdownProps> = {}): FilterDropdownProps {
  return {
    prefixCls: 'ant-table-filter',
    setSelectedKeys: vi.fn(),
    selectedKeys: [],
    confirm: vi.fn(),
    clearFilters: vi.fn(),
    close: vi.fn(),
    visible: true,
    filters: [],
    ...overrides,
  } as unknown as FilterDropdownProps;
}

describe('columnSearchFilter — client mode', () => {
  it('filters rows via matchWildcard on the accessor', () => {
    const col = columnSearchFilter<{ name: string }>({ accessor: (r) => r.name });
    expect(col.onFilter).toBeTypeOf('function');
    expect(col.onFilter!('reader-*', { name: 'reader-03' })).toBe(true);
    expect(col.onFilter!('reader-*', { name: 'my-reader-03' })).toBe(false);
    expect(col.onFilter!('reader', { name: 'My Reader 03' })).toBe(true); // substring
  });
});

describe('columnSearchFilter — server mode', () => {
  it('omits onFilter and reflects the active pattern via filteredValue', () => {
    const onSearch = vi.fn();
    expect(columnSearchFilter({ mode: 'server', onSearch }).onFilter).toBeUndefined();
    expect(columnSearchFilter({ mode: 'server', onSearch }).filteredValue).toBeNull();
    expect(
      columnSearchFilter({ mode: 'server', value: 'reader-*', onSearch }).filteredValue,
    ).toEqual(['reader-*']);
  });

  it('Search pushes the trimmed pattern to onSearch and confirms', () => {
    const onSearch = vi.fn();
    const col = columnSearchFilter({ mode: 'server', onSearch });
    const props = dropdownProps({ selectedKeys: ['reader-*'] });
    const dropdown = col.filterDropdown as (p: FilterDropdownProps) => ReactNode;
    render(<>{dropdown(props)}</>);

    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    expect(onSearch).toHaveBeenCalledWith('reader-*');
    expect(props.confirm).toHaveBeenCalled();
  });

  it('Reset clears the pattern (onSearch undefined)', () => {
    const onSearch = vi.fn();
    const col = columnSearchFilter({ mode: 'server', onSearch });
    const props = dropdownProps({ selectedKeys: ['reader-*'] });
    const dropdown = col.filterDropdown as (p: FilterDropdownProps) => ReactNode;
    render(<>{dropdown(props)}</>);

    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(onSearch).toHaveBeenCalledWith(undefined);
    expect(props.clearFilters).toHaveBeenCalled();
  });
});
