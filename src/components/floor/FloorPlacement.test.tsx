import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CoordSystem } from '@/api/generated/models/CoordSystem';
import { FloorPlacement } from '@/components/floor/FloorPlacement';
import { pixelToFloor, floorToSvg } from '@/components/floor/floorMath';
import type { SiteResponse } from '@/api/generated/models/SiteResponse';
import type { DeviceResponse } from '@/api/generated/models/DeviceResponse';

const NW = CoordSystem.origin_anchor.NW_CORNER;
const SW = CoordSystem.origin_anchor.SW_CORNER;
const RECT = { left: 0, top: 0, width: 100, height: 100 };

describe('pixelToFloor', () => {
  it('maps the top-left click to the origin (NW)', () => {
    expect(pixelToFloor(0, 0, RECT, 600, 400, NW)).toEqual({ x: 0, y: 0 });
  });

  it('maps the centre click to the extent midpoint', () => {
    expect(pixelToFloor(50, 50, RECT, 600, 400, NW)).toEqual({ x: 300, y: 200 });
  });

  it('maps the bottom-right click to the full extent (NW)', () => {
    expect(pixelToFloor(100, 100, RECT, 600, 400, NW)).toEqual({ x: 600, y: 400 });
  });

  it('flips y for an SW origin (top click = max y)', () => {
    expect(pixelToFloor(0, 0, RECT, 600, 400, SW)).toEqual({ x: 0, y: 400 });
    expect(pixelToFloor(0, 100, RECT, 600, 400, SW)).toEqual({ x: 0, y: 0 });
  });

  it('is safe for a zero-size rect', () => {
    expect(pixelToFloor(10, 10, { left: 0, top: 0, width: 0, height: 0 }, 600, 400, NW)).toEqual({
      x: 0,
      y: 0,
    });
  });
});

describe('floorToSvg', () => {
  it('passes through for NW origin', () => {
    expect(floorToSvg({ x: 2, y: 3 }, 400, NW)).toEqual({ x: 2, y: 3 });
  });

  it('flips y for SW origin', () => {
    expect(floorToSvg({ x: 2, y: 3 }, 400, SW)).toEqual({ x: 2, y: 397 });
  });
});

const upsertMutate = vi.fn();
let mockAntennas: Array<{ port: number; x: number | null; y: number | null }> = [];

vi.mock('@/hooks/useAntennas', () => ({
  useAntennas: () => ({ data: mockAntennas, isLoading: false }),
  useUpsertAntenna: () => ({ mutateAsync: upsertMutate, isPending: false }),
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

const FIXED_READER = { id: 'd1', name: 'Dock-1', mobility: 'fixed' } as unknown as DeviceResponse;
const MOBILE_READER = { id: 'd2', name: 'Truck-1', mobility: 'mobile' } as unknown as DeviceResponse;

describe('FloorPlacement', () => {
  it('renders the canvas and reader selector when a coord system is set', () => {
    mockAntennas = [];
    render(wrap(<FloorPlacement site={SITE} devices={[FIXED_READER]} />));
    expect(screen.getByTestId('floor-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('floor-reader-select')).toBeInTheDocument();
  });

  it('renders a dot for a placed reader (port-0 with coordinates)', () => {
    mockAntennas = [{ port: 0, x: 100, y: 200 }];
    render(wrap(<FloorPlacement site={SITE} devices={[FIXED_READER]} />));
    expect(screen.getByTestId('floor-reader-d1')).toBeInTheDocument();
  });

  it('does not render a dot for an unplaced reader (no port-0 coords)', () => {
    mockAntennas = [{ port: 0, x: null, y: null }];
    render(wrap(<FloorPlacement site={SITE} devices={[FIXED_READER]} />));
    expect(screen.queryByTestId('floor-reader-d1')).not.toBeInTheDocument();
  });

  it('prompts to define a coord system when absent', () => {
    const geoSite = { ...SITE, coord_system: null } as unknown as SiteResponse;
    render(wrap(<FloorPlacement site={geoSite} devices={[FIXED_READER]} />));
    expect(screen.queryByTestId('floor-canvas')).not.toBeInTheDocument();
    expect(screen.getByText(/Define a floor coordinate system/i)).toBeInTheDocument();
  });

  it('only offers fixed readers for placement', () => {
    mockAntennas = [];
    render(wrap(<FloorPlacement site={SITE} devices={[FIXED_READER, MOBILE_READER]} />));
    // The mobile reader must not be selectable (rendered as an option label).
    expect(screen.queryByText('Truck-1')).not.toBeInTheDocument();
  });
});
