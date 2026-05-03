import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AssetList } from '@/pages/assets/AssetList';
import { SitesZones } from '@/pages/assets/SitesZones';

vi.mock('@/hooks/useAssets', () => ({
  useAssets: () => ({
    data: [
      {
        id: 'a1',
        tenant_id: 't',
        name: 'Pallet 7',
        asset_type: 'pallet',
        external_ref: 'WMS-007',
        status: 'active',
        parent_asset_id: null,
        metadata: null,
        created_at: '2026-04-01T00:00:00Z',
        updated_at: '2026-04-01T00:00:00Z',
      },
    ],
    isLoading: false,
  }),
  useCreateAsset: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSites: () => ({
    data: [
      {
        id: 's1',
        tenant_id: 't',
        name: 'Warehouse A',
        address: '123 Main',
        default_timezone: 'UTC',
        metadata: null,
        created_at: '',
        updated_at: '',
      },
    ],
    isLoading: false,
  }),
  useZones: () => ({
    data: [
      {
        id: 'z1',
        tenant_id: 't',
        site_id: 's1',
        name: 'Cold Storage',
        kind: 'reader_bound',
        fixed_reader_ids: ['d1'],
        polygon_geojson: null,
        metadata: null,
        created_at: '',
        updated_at: '',
      },
    ],
    isLoading: false,
  }),
  useCreateSite: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateZone: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteSite: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteZone: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAssetsInZone: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useDevices', () => ({
  useDevices: () => ({
    data: [
      { id: 'd1', tenant_id: 't', name: 'Reader-1', device_type: 'rfid_reader', status: 'active' },
    ],
    isLoading: false,
  }),
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

describe('Assets pages — smoke', () => {
  it('AssetList renders rows and Register CTA', () => {
    render(wrap(<AssetList />));
    expect(screen.getByText('Assets')).toBeInTheDocument();
    expect(screen.getByText('Pallet 7')).toBeInTheDocument();
    expect(screen.getByText('WMS-007')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register asset/i })).toBeInTheDocument();
  });

  it('SitesZones renders site, zone and reader chip', () => {
    render(wrap(<SitesZones />));
    expect(screen.getByText('Sites & Zones')).toBeInTheDocument();
    expect(screen.getByText('Warehouse A')).toBeInTheDocument();
    expect(screen.getByText('Cold Storage')).toBeInTheDocument();
    expect(screen.getByText(/Reader-1/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new site/i })).toBeInTheDocument();
  });
});
