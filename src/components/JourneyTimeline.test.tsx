import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { JourneyTimeline } from '@/components/JourneyTimeline';

let mockLegs: unknown[] = [];

vi.mock('@/hooks/useAssets', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useAssets')>('@/hooks/useAssets');
  return {
    ...actual,
    useAssetLegs: () => ({ data: mockLegs }),
    useZones: () => ({
      data: [
        { id: 'z-origin', name: 'Origin DC' },
        { id: 'z-dc', name: 'SuperMart DC' },
      ],
    }),
  };
});

function renderTimeline(onSelect?: (id: string | null) => void) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <JourneyTimeline assetId="a1" onSelectLeg={onSelect} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('JourneyTimeline', () => {
  it('shows empty state when no legs', () => {
    mockLegs = [];
    renderTimeline();
    expect(screen.getByText('No journey yet')).toBeInTheDocument();
  });

  it('renders a closed leg with origin -> dest and SLA badge', () => {
    mockLegs = [
      {
        id: 'leg-1',
        asset_id: 'a1',
        status: 'closed',
        origin_zone_id: 'z-origin',
        dest_zone_id: 'z-dc',
        departed_at: '2026-06-20T08:00:00Z',
        arrived_at: '2026-06-20T11:30:00Z',
        temp_min_c: 3.5,
        temp_max_c: 9.1,
        in_range_pct: 88,
        excursion_s: 720,
        sla_breached: true,
      },
    ];
    renderTimeline();
    expect(screen.getByText(/Origin DC/)).toBeInTheDocument();
    expect(screen.getByText(/SuperMart DC/)).toBeInTheDocument();
    expect(screen.getByText('SLA breach')).toBeInTheDocument();
    expect(screen.getByText(/88% in range/)).toBeInTheDocument();
  });

  it('renders an open leg as in transit and fires selection', () => {
    mockLegs = [
      {
        id: 'leg-open',
        asset_id: 'a1',
        status: 'open',
        origin_zone_id: 'z-dc',
        departed_at: '2026-06-20T12:00:00Z',
        sla_breached: null,
      },
    ];
    const onSelect = vi.fn();
    renderTimeline(onSelect);
    expect(screen.getByText('in transit')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/SuperMart DC/));
    expect(onSelect).toHaveBeenCalledWith('leg-open');
  });
});
