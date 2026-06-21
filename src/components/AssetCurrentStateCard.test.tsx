import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AssetCurrentStateCard } from '@/components/AssetCurrentStateCard';

let mockState: unknown = null;
let mockHistory: unknown[] = [];

vi.mock('@/hooks/useAssets', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useAssets')>(
    '@/hooks/useAssets',
  );
  return {
    ...actual,
    useAssetState: () => ({ data: mockState }),
    useAssetStateHistory: () => ({ data: mockHistory }),
    useZones: () => ({ data: [{ id: 'z1', name: 'Cold Room A' }] }),
  };
});

function renderCard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AssetCurrentStateCard assetId="a1" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AssetCurrentStateCard', () => {
  it('shows an empty state when no snapshot exists', () => {
    mockState = null;
    mockHistory = [];
    renderCard();
    expect(screen.getByText('No fused snapshot yet')).toBeInTheDocument();
  });

  it('renders the fused zone + environment for a reader snapshot', () => {
    mockState = {
      asset_id: 'a1',
      time: '2026-06-20T12:00:00Z',
      frame: 'reader',
      zone_id: 'z1',
      site_id: 's1',
      temperature_c: 4.2,
      humidity_pct: 61,
      sample_count: 5,
      tag_count: 3,
      confidence: 0.82,
    };
    mockHistory = [];
    renderCard();
    expect(screen.getByText('Cold Room A')).toBeInTheDocument();
    expect(screen.getByText('4.2 °C')).toBeInTheDocument();
    expect(screen.getByText('61 %')).toBeInTheDocument();
    expect(screen.getByText('0.82')).toBeInTheDocument();
  });

  it('labels a zoneless geo snapshot as In transit', () => {
    mockState = {
      asset_id: 'a1',
      time: '2026-06-20T12:00:00Z',
      frame: 'geo',
      zone_id: null,
      site_id: null,
      temperature_c: null,
      humidity_pct: null,
      sample_count: 2,
      tag_count: 2,
      confidence: 0.4,
    };
    mockHistory = [];
    renderCard();
    expect(screen.getByText('In transit')).toBeInTheDocument();
  });

  it('renders a custody transition from the history', () => {
    mockState = {
      asset_id: 'a1',
      time: '2026-06-20T12:05:00Z',
      frame: 'geo',
      zone_id: null,
      site_id: null,
      temperature_c: null,
      humidity_pct: null,
      sample_count: 1,
      tag_count: 1,
      confidence: 0.3,
    };
    // newest-first: geo (now), reader (earlier) → one reader→geo transition.
    mockHistory = [
      { asset_id: 'a1', time: '2026-06-20T12:05:00Z', frame: 'geo', zone_id: null,
        site_id: null, temperature_c: null, humidity_pct: null, sample_count: 1,
        tag_count: 1, confidence: 0.3 },
      { asset_id: 'a1', time: '2026-06-20T12:00:00Z', frame: 'reader', zone_id: 'z1',
        site_id: 's1', temperature_c: 4, humidity_pct: 60, sample_count: 4,
        tag_count: 2, confidence: 0.8 },
    ];
    renderCard();
    expect(screen.getByText('Custody')).toBeInTheDocument();
  });
});
