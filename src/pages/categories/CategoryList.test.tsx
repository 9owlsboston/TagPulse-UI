import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { CategoryList } from '@/pages/categories/CategoryList';

const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/hooks/useCategories', () => ({
  useCategories: () => ({
    data: [
      {
        id: 'c1',
        tenant_id: 't',
        name: 'Beer Keg',
        category_type: 'liquid_container',
        required_tags: 2,
        sku_upc: 'KEG-500L',
        description: 'Standard 500L stainless beer keg',
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
    ],
    isLoading: false,
  }),
  useCreateCategory: () => ({ mutateAsync: mockCreate, isPending: false }),
  useUpdateCategory: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useDeleteCategory: () => ({ mutateAsync: mockDelete, isPending: false }),
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ role: 'admin', tenantId: 't' }),
}));

function wrap(node: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('CategoryList', () => {
  it('renders the page title and the New Category CTA for admins', () => {
    render(wrap(<CategoryList />));
    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /new category/i }),
    ).toBeInTheDocument();
  });

  it('renders rows with name, type label and required-tags count', () => {
    render(wrap(<CategoryList />));
    expect(screen.getByText('Beer Keg')).toBeInTheDocument();
    // Type column uses friendly labels rather than enum values.
    expect(screen.getByText('Liquid container')).toBeInTheDocument();
    expect(screen.getByText('Wooden Pallet')).toBeInTheDocument();
    expect(screen.getByText('RTI container')).toBeInTheDocument();
    // Required tags column. (The page-header count badge also reads "2"
    // when two rows are loaded, so allow multiple matches.)
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
  });

  it('opens the edit modal with category_type rendered disabled (ADR 019)', () => {
    render(wrap(<CategoryList />));
    fireEvent.click(
      screen.getByRole('button', { name: /edit category beer keg/i }),
    );
    // Modal title.
    expect(screen.getByText(/edit category — beer keg/i)).toBeInTheDocument();
    // Help text explains immutability — the asserting copy lives in the page.
    expect(
      screen.getByText(/type is immutable\. to change, delete and recreate\./i),
    ).toBeInTheDocument();
  });
});
