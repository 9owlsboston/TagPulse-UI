import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ProductList } from '@/pages/inventory/ProductList';
import { StockLevels } from '@/pages/inventory/StockLevels';

vi.mock('@/hooks/useInventory', () => ({
  useProducts: () => ({
    data: [
      { id: 'p1', tenant_id: 't', sku: 'SKU-A', name: 'Widget', gtin: null, category: null, unit: 'each', attributes: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
    ],
    isLoading: false,
  }),
  useStockLevels: () => ({
    data: [
      { product_id: 'p1', lot_id: null, zone_id: 'z1', quantity: 7 },
      { product_id: 'p1', lot_id: null, zone_id: null, quantity: 3 },
    ],
    isLoading: false,
  }),
  useCreateProduct: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ role: 'editor', tenantId: 't' }),
}));

vi.mock('@/api/generated/services/SitesZonesService', () => ({
  SitesZonesService: {
    listZonesZonesGet: vi.fn().mockResolvedValue([{ id: 'z1', name: 'Cold Storage', tenant_id: 't', site_id: 's1', kind: 'logical', readers: [], created_at: '', updated_at: '' }]),
  },
}));

function wrap(node: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Inventory pages — smoke', () => {
  it('ProductList renders SKU rows', () => {
    render(wrap(<ProductList />));
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('SKU-A')).toBeInTheDocument();
    expect(screen.getByText('Widget')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new product/i })).toBeInTheDocument();
  });

  it('StockLevels aggregates per-zone quantity into a pivot row', async () => {
    render(wrap(<StockLevels />));
    expect(screen.getByText('Stock Levels')).toBeInTheDocument();
    // Total = 10 (7 + 3) — rendered bold in the Total column.
    expect(await screen.findByText('10')).toBeInTheDocument();
  });
});
