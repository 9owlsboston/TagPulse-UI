import { render, screen, fireEvent } from '@testing-library/react';
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
  useAssetsCurrentLocations: () => ({
    data: [
      {
        asset_id: 'a1',
        recorded_at: new Date(Date.now() - 30_000).toISOString(),
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy_meters: 5,
        device_id: 'd1',
        latest_position_source: 'rfid',
      },
    ],
    isLoading: false,
  }),
  useSites: () => ({
    data: [
      {
        id: 's1',
        tenant_id: 't',
        name: 'Warehouse A',
        kind: 'site',
        address: '123 Main',
        street_line1: null,
        street_line2: null,
        city: 'Boston',
        region: 'MA',
        postal_code: '02108',
        country: 'US',
        latitude: 42.3601,
        longitude: -71.0589,
        default_timezone: 'UTC',
        metadata: null,
        created_at: '',
        updated_at: '',
      },
      {
        id: 's2',
        tenant_id: 't',
        name: 'Truck 17',
        kind: 'transporter',
        address: null,
        street_line1: null,
        street_line2: null,
        city: null,
        region: null,
        postal_code: null,
        country: null,
        latitude: null,
        longitude: null,
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
  useUpdateSite: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateZone: () => ({ mutateAsync: vi.fn(), isPending: false }),
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
    expect(screen.getByText('Locations')).toBeInTheDocument();
    expect(screen.getByText('Warehouse A')).toBeInTheDocument();
    expect(screen.getByText('Cold Storage')).toBeInTheDocument();
    expect(screen.getByText(/Reader-1/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new site/i })).toBeInTheDocument();
  });

  it('SitesZones renders both Sites and Transporters tabs with counts', () => {
    render(wrap(<SitesZones />));
    // Both tab labels render with a count tag — the tabs are a Sprint 34
    // gap 3.2 hard requirement (Site/Transporter discriminator UX).
    expect(screen.getByRole('tab', { name: /sites/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /transporters/i })).toBeInTheDocument();
  });

  it('SitesZones — switching to Transporters tab swaps the create button label', () => {
    render(wrap(<SitesZones />));
    expect(screen.getByRole('button', { name: /new site/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /transporters/i }));
    expect(screen.getByRole('button', { name: /new transporter/i })).toBeInTheDocument();
  });
});
