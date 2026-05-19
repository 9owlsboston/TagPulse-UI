import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import AntApp from 'antd/es/app';
import { AssetList } from '@/pages/assets/AssetList';
import { SitesZones } from '@/pages/assets/SitesZones';

// Sprint 38 / #40 — list hooks are exposed as recorded spies so the
// page-level integration tests can assert that adding a label chip
// triggers a re-call with the `labels` param. Smoke tests below
// continue to pass — beforeEach() restores stable return values.
const useAssetsMock = vi.hoisted(() => vi.fn());
const useSitesMock = vi.hoisted(() => vi.fn());
const useZonesMock = vi.hoisted(() => vi.fn());

// Stable reference for the locations mock — see comment in vi.mock().
const useAssetsCurrentLocationsReturn = vi.hoisted(() => ({
  data: [
    {
      asset_id: 'a1',
      recorded_at: '2026-05-18T07:00:00.000Z',
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy_meters: 5,
      device_id: 'd1',
      latest_position_source: 'rfid',
    },
  ],
  isLoading: false,
}));

vi.mock('@/hooks/useAssets', () => ({
  useAssets: useAssetsMock,
  useCreateAsset: () => ({ mutateAsync: vi.fn(), isPending: false }),
  // Sprint 38 / #40 — STABLE reference is critical: AssetList has a
  // useEffect on `locations` that calls setFlashing for any row whose
  // recorded_at changed. Returning `new Date(Date.now() - 30_000)` on
  // every call (the previous pattern) created a new ISO string per
  // render, which flipped every row to "changed" and looped.
  useAssetsCurrentLocations: () => useAssetsCurrentLocationsReturn,
  useSites: useSitesMock,
  useZones: useZonesMock,
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

// Sprint 38 — list-page Category filter is server-side, so populate the
// catalog mock here so the <CategorySelect/> in the AssetList header has
// options to choose from. Without this mock the dropdown opens empty.
const categoriesReturn = vi.hoisted(() => ({
  data: [
    {
      id: 'cat-pallet',
      tenant_id: 't',
      name: 'Pallet',
      sku_upc: null,
      description: null,
      category_type: 'rti_container',
      required_tags: 1,
      created_at: '',
      updated_at: '',
    },
    {
      id: 'cat-drum',
      tenant_id: 't',
      name: 'Drum',
      sku_upc: null,
      description: null,
      category_type: 'liquid_container',
      required_tags: 1,
      created_at: '',
      updated_at: '',
    },
  ],
  isLoading: false,
}));

vi.mock('@/hooks/useCategories', () => ({
  useCategories: () => categoriesReturn,
  useCategory: () => ({ data: undefined }),
  useCreateCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ role: 'admin', tenantId: 't' }),
}));

// Sprint 38 / #40 — populate the label catalog for asset / site / zone
// entity_types so each <LabelFilterStrip/> renders.
vi.mock('@/hooks/useLabels', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useLabels')>(
    '@/hooks/useLabels',
  );
  return {
    ...actual,
    useLabels: ({ entity_type }: { entity_type: string }) => ({
      data: [
        {
          id: `cat-${entity_type}-1`,
          tenant_id: 't',
          entity_type,
          key: 'region',
          color: null,
          created_by: null,
          updated_by: null,
          created_at: '2026-05-01T00:00:00Z',
          updated_at: '2026-05-01T00:00:00Z',
        },
      ],
    }),
  };
});

const assetsReturn = {
  data: [
    {
      id: 'a1',
      tenant_id: 't',
      name: 'Pallet 7',
      external_ref: 'WMS-007',
      status: 'active',
      parent_asset_id: null,
      metadata: null,
      created_at: '2026-04-01T00:00:00Z',
      updated_at: '2026-04-01T00:00:00Z',
    },
  ],
  isLoading: false,
};

const sitesReturn = {
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
};

const zonesReturn = {
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
};

function wrap(node: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AntApp>{node}</AntApp>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  useAssetsMock.mockReset();
  useSitesMock.mockReset();
  useZonesMock.mockReset();
  useAssetsMock.mockReturnValue(assetsReturn);
  useSitesMock.mockReturnValue(sitesReturn);
  useZonesMock.mockReturnValue(zonesReturn);
});

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

// Sprint 38 / #40 / Sprint 42 / Sprint 43 — page-level integration
// coverage for the label filter. AssetList moved its strip into the
// side <FilterPanel/> in Sprint 42; Sprint 43 did the same for
// SitesZones (two stacked panels, site + zone, under one Filters
// toggle). All three tests now open the panel first, add a chip into
// pending state, and commit via Apply before asserting the next
// useAssets / useSites / useZones call.
describe('Assets pages — label filter integration', () => {
  it('AssetList: adding a label chip via the filter panel re-calls useAssets with labels param', async () => {
    render(wrap(<AssetList />));

    expect(useAssetsMock).toHaveBeenCalledWith(
      expect.objectContaining({ labels: {} }),
    );

    // Sprint 42 — open the side filter panel; the label strip lives inside it.
    fireEvent.click(screen.getByTestId('asset-list-filters-toggle'));
    await waitFor(() => screen.getByTestId('asset-list-filter-panel'));

    fireEvent.click(screen.getByTestId('label-filter-add-tag'));
    await waitFor(() => screen.getByTestId('label-filter-popover'));

    const keyWrapper = screen.getByTestId('label-filter-key-input');
    const keyInput = keyWrapper.querySelector('input') ?? keyWrapper;
    fireEvent.change(keyInput, { target: { value: 'region' } });

    const valueInput = screen.getByTestId('label-filter-value-input');
    fireEvent.change(valueInput, { target: { value: 'east' } });

    fireEvent.click(screen.getByTestId('label-filter-add-btn'));

    // Deferred-apply UX: clicking Add wires the chip into pending state,
    // but useAssets isn't re-called until Apply commits it up.
    fireEvent.click(screen.getByTestId('asset-list-filter-panel-apply'));

    await waitFor(() => {
      expect(useAssetsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ labels: { region: ['east'] } }),
      );
    });
  });

  it('SitesZones: adding a chip to the SITE panel re-calls useSites with labels', async () => {
    render(wrap(<SitesZones />));

    expect(useSitesMock).toHaveBeenCalledWith(
      expect.objectContaining({ labels: {} }),
    );

    // Sprint 43 — open the side filter column; two stacked panels appear.
    fireEvent.click(screen.getByTestId('sites-zones-filters-toggle'));
    await waitFor(() => screen.getByTestId('sites-zones-site-filter-panel'));

    const sitePanel = screen.getByTestId('sites-zones-site-filter-panel');
    fireEvent.click(within(sitePanel).getByTestId('label-filter-add-tag'));
    await waitFor(() => screen.getByTestId('label-filter-popover'));

    const keyWrapper = screen.getByTestId('label-filter-key-input');
    const keyInput = keyWrapper.querySelector('input') ?? keyWrapper;
    fireEvent.change(keyInput, { target: { value: 'region' } });

    const valueInput = screen.getByTestId('label-filter-value-input');
    fireEvent.change(valueInput, { target: { value: 'east' } });

    fireEvent.click(screen.getByTestId('label-filter-add-btn'));

    // Deferred-apply: useSites isn't re-called until Apply commits it.
    fireEvent.click(within(sitePanel).getByTestId('sites-zones-site-filter-panel-apply'));

    await waitFor(() => {
      expect(useSitesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ labels: { region: ['east'] } }),
      );
    });
    // Zone hook still has its empty filter — the two panels are independent.
    expect(useZonesMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ labels: {} }),
    );
  });

  it('SitesZones: adding a chip to the ZONE panel re-calls useZones with labels', async () => {
    render(wrap(<SitesZones />));

    expect(useZonesMock).toHaveBeenCalledWith(
      expect.objectContaining({ labels: {} }),
    );

    fireEvent.click(screen.getByTestId('sites-zones-filters-toggle'));
    await waitFor(() => screen.getByTestId('sites-zones-zone-filter-panel'));

    const zonePanel = screen.getByTestId('sites-zones-zone-filter-panel');
    fireEvent.click(within(zonePanel).getByTestId('label-filter-add-tag'));
    await waitFor(() => screen.getByTestId('label-filter-popover'));

    const keyWrapper = screen.getByTestId('label-filter-key-input');
    const keyInput = keyWrapper.querySelector('input') ?? keyWrapper;
    fireEvent.change(keyInput, { target: { value: 'region' } });

    const valueInput = screen.getByTestId('label-filter-value-input');
    fireEvent.change(valueInput, { target: { value: 'west' } });

    fireEvent.click(screen.getByTestId('label-filter-add-btn'));

    fireEvent.click(within(zonePanel).getByTestId('sites-zones-zone-filter-panel-apply'));

    await waitFor(() => {
      expect(useZonesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ labels: { region: ['west'] } }),
      );
    });
    // Site hook still has its empty filter.
    expect(useSitesMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ labels: {} }),
    );
  });
});

// Sprint 38 row 3.3a / Sprint 42 — server-side category filter wiring.
// Sprint 37 added a single-value `?category_id=` query; Sprint 42
// generalised it to multi-select via `?category_ids=A&category_ids=B`
// and moved the UI into the side <FilterPanel/>. The hook now takes
// `category_ids: string[]` instead of `category_id: string | undefined`.
describe('AssetList — Category filter (FilterPanel, multi-select)', () => {
  it('initial render calls useAssets with category_ids: undefined', () => {
    render(wrap(<AssetList />));
    expect(useAssetsMock).toHaveBeenCalledWith(
      expect.objectContaining({ category_ids: undefined }),
    );
  });

  it('picking one category in the FilterPanel commits ?category_ids=[id] on Apply', async () => {
    render(wrap(<AssetList />));

    fireEvent.click(screen.getByTestId('asset-list-filters-toggle'));
    await waitFor(() => screen.getByTestId('asset-list-filter-panel'));

    fireEvent.click(
      screen.getByTestId('asset-list-filter-panel-category-cat-pallet'),
    );

    // Deferred apply: the hook stays in its initial (undefined) state until
    // the user commits via Apply.
    expect(useAssetsMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ category_ids: ['cat-pallet'] }),
    );

    fireEvent.click(screen.getByTestId('asset-list-filter-panel-apply'));

    await waitFor(() => {
      expect(useAssetsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ category_ids: ['cat-pallet'] }),
      );
    });
  });

  it('checking two categories commits the full array on Apply (multi-select)', async () => {
    render(wrap(<AssetList />));

    fireEvent.click(screen.getByTestId('asset-list-filters-toggle'));
    await waitFor(() => screen.getByTestId('asset-list-filter-panel'));

    fireEvent.click(
      screen.getByTestId('asset-list-filter-panel-category-cat-pallet'),
    );
    fireEvent.click(
      screen.getByTestId('asset-list-filter-panel-category-cat-drum'),
    );
    fireEvent.click(screen.getByTestId('asset-list-filter-panel-apply'));

    await waitFor(() => {
      const lastCall = useAssetsMock.mock.calls.at(-1)?.[0] as
        | { category_ids?: string[] }
        | undefined;
      expect(lastCall?.category_ids).toEqual(
        expect.arrayContaining(['cat-pallet', 'cat-drum']),
      );
      expect(lastCall?.category_ids).toHaveLength(2);
    });
  });

  it('Clear button wipes applied filters and re-calls useAssets with empty state', async () => {
    render(wrap(<AssetList />));

    // Apply a filter first.
    fireEvent.click(screen.getByTestId('asset-list-filters-toggle'));
    await waitFor(() => screen.getByTestId('asset-list-filter-panel'));
    fireEvent.click(
      screen.getByTestId('asset-list-filter-panel-category-cat-pallet'),
    );
    fireEvent.click(screen.getByTestId('asset-list-filter-panel-apply'));
    await waitFor(() => {
      expect(useAssetsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ category_ids: ['cat-pallet'] }),
      );
    });

    // Now clear.
    fireEvent.click(screen.getByTestId('asset-list-filter-panel-clear'));

    await waitFor(() => {
      expect(useAssetsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ category_ids: undefined, labels: {} }),
      );
    });
  });

  it('toggling the Filters button shows and hides the panel', async () => {
    render(wrap(<AssetList />));

    // Closed by default.
    expect(screen.queryByTestId('asset-list-filter-panel')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('asset-list-filters-toggle'));
    await waitFor(() =>
      expect(screen.getByTestId('asset-list-filter-panel')).toBeInTheDocument(),
    );

    // Close via the panel's close button.
    fireEvent.click(screen.getByTestId('asset-list-filter-panel-close'));
    await waitFor(() =>
      expect(screen.queryByTestId('asset-list-filter-panel')).not.toBeInTheDocument(),
    );
  });
});

