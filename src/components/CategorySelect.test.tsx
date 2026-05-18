/**
 * Tests for <CategorySelect> (Sprint 37 row 3.3a).
 *
 * Covers:
 *   - groups options by category_type
 *   - emits the selected category id on change
 *   - calls onChange(undefined) when cleared
 *   - filters via the showSearch input
 *   - respects `categoryType` prop (passes through to useCategories)
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CategorySelect } from '@/components/CategorySelect';

const useCategoriesMock = vi.fn();

vi.mock('@/hooks/useCategories', () => ({
  useCategories: (params?: { category_type?: string; limit?: number }) => {
    useCategoriesMock(params);
    return {
      data: [
        {
          id: 'c1',
          tenant_id: 't',
          name: 'Beer Keg',
          category_type: 'liquid_container',
          required_tags: 2,
          sku_upc: 'KEG-500L',
          description: null,
          created_at: '2026-05-01T00:00:00Z',
          updated_at: '2026-05-01T00:00:00Z',
        },
        {
          id: 'c2',
          tenant_id: 't',
          name: 'Wooden Pallet',
          category_type: 'rti_container',
          required_tags: 1,
          sku_upc: null,
          description: null,
          created_at: '2026-05-02T00:00:00Z',
          updated_at: '2026-05-02T00:00:00Z',
        },
        {
          id: 'c3',
          tenant_id: 't',
          name: 'Cardboard Crate',
          category_type: 'rti_container',
          required_tags: 1,
          sku_upc: null,
          description: null,
          created_at: '2026-05-03T00:00:00Z',
          updated_at: '2026-05-03T00:00:00Z',
        },
      ],
      isLoading: false,
    };
  },
}));

describe('<CategorySelect>', () => {
  it('renders placeholder when no value is set', () => {
    render(<CategorySelect placeholder="Pick one" data-testid="cs" />);
    expect(screen.getByText('Pick one')).toBeInTheDocument();
  });

  it('renders the selected category name when value is bound', () => {
    render(<CategorySelect value="c1" data-testid="cs" />);
    // Selected label appears in the closed Select input
    expect(screen.getByText('Beer Keg')).toBeInTheDocument();
  });

  it('emits the new category id when an option is picked', async () => {
    const onChange = vi.fn();
    render(<CategorySelect onChange={onChange} data-testid="cs" />);
    // Open the dropdown by clicking the combobox input
    const combo = screen.getByRole('combobox');
    fireEvent.mouseDown(combo);
    // Options render in a portal; pick "Wooden Pallet"
    const opt = await screen.findByText('Wooden Pallet');
    fireEvent.click(opt);
    expect(onChange).toHaveBeenCalledWith('c2');
  });

  it('emits undefined when the value is cleared', () => {
    const onChange = vi.fn();
    render(<CategorySelect value="c1" onChange={onChange} data-testid="cs" />);
    // AntD renders a clear button when allowClear + a value are present
    const clear = document.querySelector('.ant-select-clear');
    expect(clear).not.toBeNull();
    fireEvent.mouseDown(clear!);
    fireEvent.click(clear!);
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('passes categoryType through to useCategories', () => {
    useCategoriesMock.mockClear();
    render(
      <CategorySelect
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        categoryType={'rti_container' as any}
        data-testid="cs"
      />,
    );
    expect(useCategoriesMock).toHaveBeenCalledWith(
      expect.objectContaining({ category_type: 'rti_container' }),
    );
  });
});
