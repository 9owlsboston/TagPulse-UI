import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProductDetail } from '@/pages/inventory/ProductDetail';
import type { StockItemResponse } from '@/api/generated/models/StockItemResponse';
import type { StockMovementResponse } from '@/api/generated/models/StockMovementResponse';

// Stub recharts (jsdom has no layout for ResponsiveContainer).
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
}));

const UNITS: StockItemResponse[] = [
  {
    id: 'u1',
    tenant_id: 't',
    product_id: 'p1',
    lot_id: null,
    binding_value: 'urn:epc:id:sgtin:0614141.812345.100000',
    binding_kind: 'epc',
    state: 'in_stock',
    current_zone_id: 'z1',
    first_seen_at: '2026-06-01T08:00:00Z',
    last_seen_at: '2026-06-10T08:00:00Z',
    consumed_at: null,
  },
  {
    id: 'u2',
    tenant_id: 't',
    product_id: 'p1',
    lot_id: null,
    binding_value: 'urn:epc:id:sgtin:0614141.812345.100001',
    binding_kind: 'epc',
    state: 'consumed',
    current_zone_id: null,
    first_seen_at: '2026-06-01T08:00:00Z',
    last_seen_at: '2026-06-09T08:00:00Z',
    consumed_at: '2026-06-09T09:00:00Z',
  },
];

const MOVEMENTS: StockMovementResponse[] = [
  {
    id: 'm1',
    tenant_id: 't',
    stock_item_id: 'u1',
    from_zone_id: null,
    to_zone_id: 'z1',
    movement_type: 'entry',
    quantity: 1,
    device_id: null,
    occurred_at: '2026-06-01T08:00:00Z',
  } as StockMovementResponse,
];

const stockItemsMock = vi.fn(() => ({ data: UNITS, isLoading: false }));
const stockMovementsMock = vi.fn(() => ({ data: MOVEMENTS, isLoading: false }));

vi.mock('@/hooks/useInventory', () => ({
  useProduct: () => ({
    data: { id: 'p1', tenant_id: 't', sku: 'SKU-A', name: 'Widget', gtin: null, category: null, unit: 'each', attributes: null, created_at: '', updated_at: '' },
    isLoading: false,
  }),
  useLots: () => ({ data: [], isLoading: false }),
  useStockLevels: () => ({ data: [{ product_id: 'p1', lot_id: null, zone_id: 'z1', quantity: 1 }], isLoading: false }),
  useStockItems: () => stockItemsMock(),
  useStockMovements: () => stockMovementsMock(),
  useCreateLot: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateProduct: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useAssets', () => ({
  useZones: () => ({ data: [{ id: 'z1', name: 'Cold Storage', tenant_id: 't', site_id: 's1' }] }),
}));

vi.mock('@/components/useCanPerform', () => ({
  useCanPerform: () => true,
}));

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/inventory/products/p1']}>
        <Routes>
          <Route path="/inventory/products/:id" element={<ProductDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ProductDetail — §59.8 Units table', () => {
  beforeEach(() => {
    stockItemsMock.mockReturnValue({ data: UNITS, isLoading: false });
    stockMovementsMock.mockReturnValue({ data: MOVEMENTS, isLoading: false });
  });

  it('renders a Units section with each unit row, name-resolved zone, and state', () => {
    render(wrap());
    expect(screen.getByText('Units')).toBeInTheDocument();
    // Both unit bindings show.
    expect(screen.getByText('urn:epc:id:sgtin:0614141.812345.100000')).toBeInTheDocument();
    expect(screen.getByText('urn:epc:id:sgtin:0614141.812345.100001')).toBeInTheDocument();
    // Zone id z1 is resolved to its name.
    expect(screen.getByText('Cold Storage')).toBeInTheDocument();
    // Unassigned unit (no zone) renders the fallback.
    expect(screen.getByText('unassigned')).toBeInTheDocument();
    // States rendered as tags.
    expect(screen.getByText('in_stock')).toBeInTheDocument();
    expect(screen.getByText('consumed')).toBeInTheDocument();
  });

  it('exposes zone + state facet filters', () => {
    render(wrap());
    expect(screen.getByTestId('units-state-filter')).toBeInTheDocument();
    expect(screen.getByTestId('units-zone-filter')).toBeInTheDocument();
  });

  it('opens a per-unit movement-history drawer on row click', () => {
    render(wrap());
    fireEvent.click(screen.getByText('urn:epc:id:sgtin:0614141.812345.100000'));
    const drawer = screen.getByTestId('unit-history-drawer');
    expect(drawer).toBeInTheDocument();
    // The unit's movement shows in the drawer.
    expect(within(drawer).getByText('entry')).toBeInTheDocument();
  });

  it('shows an empty-state when there are no units', () => {
    stockItemsMock.mockReturnValue({ data: [], isLoading: false });
    render(wrap());
    expect(screen.getByText('No units recorded for this product yet.')).toBeInTheDocument();
  });
});
