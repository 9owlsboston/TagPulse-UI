import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CoordSystem } from '@/api/generated/models/CoordSystem';
import { CoordSystemEditor } from '@/components/floor/CoordSystemEditor';
import type { SiteResponse } from '@/api/generated/models/SiteResponse';

const updateMutate = vi.fn();

vi.mock('@/hooks/useAssets', () => ({
  useUpdateSite: () => ({ mutateAsync: updateMutate, isPending: false }),
}));

function wrap(node: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{node}</QueryClientProvider>;
}

const NW = CoordSystem.origin_anchor.NW_CORNER;

const SITE_GEO = { id: 's1', name: 'DC-1', coord_system: null } as unknown as SiteResponse;
const SITE_FLOOR = {
  id: 's1',
  name: 'DC-1',
  coord_system: { extent_x: 600, extent_y: 400, origin_anchor: NW, units: 'meters', rotation_deg: 0 },
} as unknown as SiteResponse;
const SITE_WITH_IMAGE = {
  id: 's1',
  name: 'DC-1',
  coord_system: {
    extent_x: 600,
    extent_y: 400,
    origin_anchor: NW,
    units: 'meters',
    rotation_deg: 0,
    floorplan_image: 'data:image/png;base64,AAAA',
  },
} as unknown as SiteResponse;

describe('CoordSystemEditor', () => {
  beforeEach(() => {
    updateMutate.mockReset();
    updateMutate.mockResolvedValue({});
  });

  it('renders the editor form with a Save action', () => {
    render(wrap(<CoordSystemEditor site={SITE_GEO} />));
    expect(screen.getByTestId('coord-system-editor')).toBeInTheDocument();
    expect(screen.getByTestId('coord-system-save')).toBeInTheDocument();
  });

  it('hides the "make geographic-only" action when the site has no frame', () => {
    render(wrap(<CoordSystemEditor site={SITE_GEO} />));
    expect(screen.queryByTestId('coord-system-clear')).not.toBeInTheDocument();
  });

  it('offers the "make geographic-only" action when a frame exists', () => {
    render(wrap(<CoordSystemEditor site={SITE_FLOOR} />));
    expect(screen.getByTestId('coord-system-clear')).toBeInTheDocument();
  });

  it('offers a floorplan-image upload control', () => {
    render(wrap(<CoordSystemEditor site={SITE_GEO} />));
    expect(screen.getByTestId('coord-system-upload')).toBeInTheDocument();
    // No image yet → no Remove affordance.
    expect(screen.queryByTestId('coord-system-remove-image')).not.toBeInTheDocument();
  });

  it('shows a Remove action when the site already has a floorplan image', () => {
    render(wrap(<CoordSystemEditor site={SITE_WITH_IMAGE} />));
    expect(screen.getByTestId('coord-system-remove-image')).toBeInTheDocument();
  });
});
