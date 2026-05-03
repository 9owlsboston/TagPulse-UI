import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { MapPage } from '@/pages/map/MapPage';

vi.mock('@/hooks/useAssets', () => ({
  useAssets: () => ({ data: [], isLoading: false }),
  useZones: () => ({ data: [], isLoading: false }),
  useAssetCurrentLocation: () => ({ data: null }),
  useAssetPath: () => ({ data: [] }),
}));

vi.mock('@/hooks/useMapConfig', () => ({
  useMapConfig: () => ({ data: null }),
  OSM_FALLBACK: {
    kind: 'osm',
    tile_url_template: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    max_zoom: 19,
    subdomains: ['a', 'b', 'c'],
  },
}));

// react-leaflet pulls in DOM-heavy code that jsdom can't render; stub it out.
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: () => null,
  Polygon: () => null,
  Popup: () => null,
  CircleMarker: () => null,
  useMapEvents: () => null,
}));

vi.mock('leaflet', () => ({
  default: { Icon: { Default: { prototype: {}, mergeOptions: vi.fn() } } },
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MapPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('MapPage', () => {
  it('renders the title and OSM dev attribution footer', () => {
    renderPage();
    expect(screen.getByText('Map')).toBeInTheDocument();
    expect(screen.getByText(/Default tiles intended for development/)).toBeInTheDocument();
  });

  it('renders the time-replay slider with Live marker', () => {
    renderPage();
    expect(screen.getByText('Time replay')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
  });
});
