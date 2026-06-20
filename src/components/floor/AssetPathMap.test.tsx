import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CoordSystem } from '@/api/generated/models/CoordSystem';
import { AssetPathMap } from '@/components/floor/AssetPathMap';
import type { AssetResponse } from '@/api/generated/models/AssetResponse';

const NW = CoordSystem.origin_anchor.NW_CORNER;

// Mutable mock state per test.
let mockFloorPath: Array<{
  x: number;
  y: number;
  confidence: number;
  recorded_at: string;
  source: string;
  site_id: string;
}> = [];
let mockGeoPath: Array<{
  latitude: number;
  longitude: number;
  recorded_at: string;
  source: string;
}> = [];
let mockSite: { id: string; name: string; coord_system: unknown } | undefined;

vi.mock('@/hooks/useAssets', () => ({
  useFloorPath: () => ({ data: mockFloorPath, isLoading: false }),
  useAssetPath: () => ({ data: mockGeoPath, isLoading: false }),
  useSite: () => ({ data: mockSite, isLoading: false }),
}));

vi.mock('@/hooks/useMapConfig', () => ({
  useMapConfig: () => ({ data: undefined }),
  OSM_FALLBACK: {
    kind: 'osm',
    tile_url_template: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    max_zoom: 19,
    subdomains: ['a', 'b', 'c'],
  },
}));

vi.mock('@/theme/ThemeProvider', () => ({
  useThemeMode: () => ({ mode: 'light' }),
}));

// react-leaflet pulls in DOM-heavy code jsdom can't render; stub it out.
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: () => null,
  Polyline: () => null,
  Popup: () => null,
}));

vi.mock('leaflet', () => ({
  default: { Icon: { Default: { prototype: {}, mergeOptions: vi.fn() } } },
}));

const SITE = {
  id: 's1',
  name: 'DC-1',
  coord_system: { extent_x: 600, extent_y: 400, origin_anchor: NW, units: 'meters' },
};

const ASSET = { id: 'a1', name: 'asset-08' } as AssetResponse;

function wrap(node: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{node}</QueryClientProvider>;
}

const SINCE = '2026-06-18T00:00:00.000Z';
const UNTIL = '2026-06-19T00:00:00.000Z';

describe('AssetPathMap', () => {
  beforeEach(() => {
    mockFloorPath = [];
    mockGeoPath = [];
    mockSite = undefined;
  });

  it('renders the floor trail when the asset has floor fixes', () => {
    mockFloorPath = [
      { x: 100, y: 80, confidence: 0.6, recorded_at: SINCE, source: 'computed', site_id: 's1' },
      { x: 140, y: 120, confidence: 0.8, recorded_at: UNTIL, source: 'computed', site_id: 's1' },
    ];
    mockSite = SITE;

    render(wrap(<AssetPathMap asset={ASSET} since={SINCE} until={UNTIL} />));

    expect(screen.getByTestId('asset-path-floor-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('asset-path-trail')).toBeInTheDocument();
    expect(screen.getByTestId('asset-path-latest')).toBeInTheDocument();
    // Frame-aware "where" summary uses floor coordinates, not lat/lon.
    expect(screen.getByText(/Floor @ \(140\.0, 120\.0\)/)).toBeInTheDocument();
  });

  it('renders the geographic map when only a geo path exists', () => {
    mockGeoPath = [
      { latitude: 47.61, longitude: -122.33, recorded_at: SINCE, source: 'rfid' },
      { latitude: 47.62, longitude: -122.34, recorded_at: UNTIL, source: 'rfid' },
    ];

    render(wrap(<AssetPathMap asset={ASSET} since={SINCE} until={UNTIL} />));

    expect(screen.getByTestId('asset-path-geo-map')).toBeInTheDocument();
    expect(screen.getByTestId('map')).toBeInTheDocument();
    expect(screen.getByText(/47\.62000, -122\.34000/)).toBeInTheDocument();
  });

  it('prefers the floor frame when both exist', () => {
    mockFloorPath = [
      { x: 10, y: 10, confidence: 0.5, recorded_at: UNTIL, source: 'precomputed', site_id: 's1' },
    ];
    mockGeoPath = [{ latitude: 1, longitude: 2, recorded_at: UNTIL, source: 'rfid' }];
    mockSite = SITE;

    render(wrap(<AssetPathMap asset={ASSET} since={SINCE} until={UNTIL} />));

    expect(screen.getByTestId('asset-path-floor-canvas')).toBeInTheDocument();
    expect(screen.queryByTestId('asset-path-geo-map')).not.toBeInTheDocument();
  });

  it('shows an empty state when there are no fixes in range', () => {
    render(wrap(<AssetPathMap asset={ASSET} since={SINCE} until={UNTIL} />));

    expect(screen.getByText(/No position fixes/i)).toBeInTheDocument();
  });
});
