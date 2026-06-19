import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CoordSystem } from '@/api/generated/models/CoordSystem';
import { FloorMap } from '@/components/floor/FloorMap';
import type { SiteResponse } from '@/api/generated/models/SiteResponse';
import type { DeviceResponse } from '@/api/generated/models/DeviceResponse';
import type { AssetResponse } from '@/api/generated/models/AssetResponse';

const NW = CoordSystem.origin_anchor.NW_CORNER;

let mockAntennas: Array<{ port: number; x: number | null; y: number | null }> = [];
let mockLocation: { device_id: string | null } | null = null;
let mockFloorPath: Array<{ x: number; y: number; confidence: number }> = [];

vi.mock('@/hooks/useAntennas', () => ({
  useAntennas: (deviceId?: string) => ({
    data: deviceId ? mockAntennas : undefined,
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useAssets', () => ({
  useAssetCurrentLocation: () => ({ data: mockLocation, isLoading: false }),
  useFloorPath: () => ({ data: mockFloorPath, isLoading: false }),
}));

vi.mock('@/theme/ThemeProvider', () => ({
  useThemeMode: () => ({ mode: 'light' }),
}));

function wrap(node: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{node}</QueryClientProvider>;
}

const SITE = {
  id: 's1',
  name: 'DC-1',
  coord_system: { extent_x: 600, extent_y: 400, origin_anchor: NW, units: 'meters' },
} as unknown as SiteResponse;

const READER = { id: 'd1', name: 'Dock-1', mobility: 'fixed' } as unknown as DeviceResponse;
const ASSET = { id: 'a1', name: 'Forklift-1' } as unknown as AssetResponse;

describe('FloorMap', () => {
  it('shows an empty state for a site with no floor plan', () => {
    const geoSite = { ...SITE, coord_system: null } as unknown as SiteResponse;
    render(wrap(<FloorMap site={geoSite} devices={[READER]} assets={[]} />));
    expect(screen.queryByTestId('floormap-canvas')).not.toBeInTheDocument();
    expect(screen.getByText(/no floor plan/i)).toBeInTheDocument();
  });

  it('renders the canvas and a placed reader marker', () => {
    mockAntennas = [{ port: 0, x: 100, y: 200 }];
    mockLocation = null;
    render(wrap(<FloorMap site={SITE} devices={[READER]} assets={[]} />));
    expect(screen.getByTestId('floormap-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('floormap-reader-d1')).toBeInTheDocument();
  });

  it('snaps an asset marker to its last reader', () => {
    mockAntennas = [{ port: 0, x: 100, y: 200 }];
    mockLocation = { device_id: 'd1' };
    mockFloorPath = [];
    render(wrap(<FloorMap site={SITE} devices={[READER]} assets={[ASSET]} />));
    expect(screen.getByTestId('floormap-asset-a1')).toBeInTheDocument();
  });

  it('omits an asset with no last reader', () => {
    mockAntennas = [{ port: 0, x: 100, y: 200 }];
    mockLocation = { device_id: null };
    mockFloorPath = [];
    render(wrap(<FloorMap site={SITE} devices={[READER]} assets={[ASSET]} />));
    expect(screen.queryByTestId('floormap-asset-a1')).not.toBeInTheDocument();
  });

  it('draws an asset trail from precomputed floor positions', () => {
    // Real (x, y) fixes — no last reader needed; the marker should NOT snap.
    mockAntennas = [];
    mockLocation = { device_id: null };
    mockFloorPath = [
      { x: 100, y: 100, confidence: 0.6 },
      { x: 200, y: 150, confidence: 0.8 },
      { x: 320, y: 180, confidence: 0.9 },
    ];
    render(wrap(<FloorMap site={SITE} devices={[READER]} assets={[ASSET]} />));
    expect(screen.getByTestId('floormap-asset-a1')).toBeInTheDocument();
    expect(screen.getByTestId('floormap-trail-a1')).toBeInTheDocument();
  });

  it('renders a single floor fix without a trail polyline', () => {
    mockAntennas = [];
    mockLocation = { device_id: null };
    mockFloorPath = [{ x: 120, y: 90, confidence: 0.7 }];
    render(wrap(<FloorMap site={SITE} devices={[READER]} assets={[ASSET]} />));
    expect(screen.getByTestId('floormap-asset-a1')).toBeInTheDocument();
    expect(screen.queryByTestId('floormap-trail-a1')).not.toBeInTheDocument();
  });

  it('hides asset markers when showAssets is false', () => {
    mockAntennas = [{ port: 0, x: 100, y: 200 }];
    mockLocation = { device_id: 'd1' };
    mockFloorPath = [];
    render(wrap(<FloorMap site={SITE} devices={[READER]} assets={[ASSET]} showAssets={false} />));
    expect(screen.queryByTestId('floormap-asset-a1')).not.toBeInTheDocument();
    // Reader markers still render.
    expect(screen.getByTestId('floormap-reader-d1')).toBeInTheDocument();
  });

  it('renders the floorplan image backdrop when present', () => {
    mockAntennas = [];
    mockLocation = null;
    const imgSite = {
      ...SITE,
      coord_system: { ...(SITE.coord_system as object), floorplan_image: 'data:image/png;base64,AAAA' },
    } as unknown as SiteResponse;
    const { container } = render(wrap(<FloorMap site={imgSite} devices={[]} assets={[]} />));
    const image = container.querySelector('image');
    expect(image).not.toBeNull();
    expect(image?.getAttribute('href')).toBe('data:image/png;base64,AAAA');
  });
});
