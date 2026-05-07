import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LotDetail from '@/pages/inventory/LotDetail';

vi.mock('@/hooks/useInventory', () => ({
  useLot: () => ({
    data: {
      id: 'lot-1',
      tenant_id: 't',
      product_id: 'p-1',
      lot_code: 'LOT-A1',
      manufactured_at: '2026-01-01T00:00:00Z',
      expires_at: '2026-12-01T00:00:00Z',
      metadata: null,
      created_at: '2026-01-01T00:00:00Z',
      latest_telemetry: [
        {
          metric_name: 'temperature_c',
          metric_value: 12.4,
          unit: '°C',
          timestamp: '2026-05-06T12:00:00Z',
          source: 'tag',
        },
      ],
    },
    isLoading: false,
  }),
  useProduct: () => ({ data: { id: 'p-1', name: 'Refrigerated Yogurt', sku: 'YOG-1' } }),
}));

vi.mock('@/hooks/useTenantConfig', () => ({
  useTenantConfig: () => ({ data: { tracking_modes: ['inventory'], telemetry_subject_kinds: ['device', 'lot'] } }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/inventory/lots/lot-1"]}>
        <Routes>
          <Route path="/inventory/lots/:id" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('LotDetail', () => {
  it('renders the lot code and product link', () => {
    render(<LotDetail />, { wrapper });
    expect(screen.getByText('Lot LOT-A1')).toBeInTheDocument();
    expect(screen.getByText('Refrigerated Yogurt')).toBeInTheDocument();
  });

  it('flags a cold-chain breach when temperature exceeds 8°C', () => {
    render(<LotDetail />, { wrapper });
    expect(screen.getByText('BREACH')).toBeInTheDocument();
  });
});
