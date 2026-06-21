import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from '@/pages/Dashboard';
import { UiConfigProvider } from '@/lib/uiConfig';
import type { DashboardSummary } from '@/types';

// For the config-gate test: a config query that never resolves keeps the
// resolved UI config in its loading state (`ready === false`). Existing tests
// don't render <UiConfigProvider>, so they use the default context
// (`ready: true`) and never hit this mock.
vi.mock('@/api/generated/services/UiConfigService', () => ({
  UiConfigService: { getUiConfigUiConfigGet: vi.fn(() => new Promise(() => {})) },
}));

// Card hide/order now persist server-side via `usePatchMyUiConfig`. Mock just
// that hook (keep the rest of the module real so <UiConfigProvider>'s
// `useUiConfig` still works for the gate test) and capture the PATCH bodies.
const { patchMock } = vi.hoisted(() => ({ patchMock: vi.fn() }));
vi.mock('@/hooks/useUiConfig', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useUiConfig')>();
  return { ...actual, usePatchMyUiConfig: () => ({ mutate: patchMock }) };
});

// Stub recharts — see KpiTile.test.tsx for context (ResizeObserver missing
// in jsdom; we only assert on chip presence here, not the SVG line). Sprint
// 58 round 1 switched <TpSparkline> from LineChart → AreaChart for the
// gradient fill, so the stub mirrors KpiTile.test.tsx exactly.
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="rc-responsive">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <svg data-testid="rc-svg">{children}</svg>
  ),
  Area: () => <g />,
}));

const FIXTURE: DashboardSummary = {
  devices_online: 12,
  devices_total: 20,
  alerts_open_24h: 3,
  reads_per_hour_now: 451,
  assets_active: 87,
  tag_transfers_in_flight: 5,
  tag_recon_backlog: 2,
  low_stock_count: 1,
  tags_total: 128,
  sites_total: 5,
  zones_total: 11,
  generated_at: '2026-06-01T12:00:00Z',
};

vi.mock('@/hooks/useDashboardSummary', () => ({
  useDashboardSummary: () => ({ data: FIXTURE, isLoading: false, error: null }),
}));

// Sprint 57 Phase F — Dashboard now also calls useDashboardSparklines.
// Default mock returns no data so existing assertions are unaffected;
// the dedicated Phase-F test overrides via vi.mocked(...).mockReturnValue.
import { useDashboardSparklines } from '@/hooks/useDashboardSparklines';
vi.mock('@/hooks/useDashboardSparklines', () => ({
  useDashboardSparklines: vi.fn(() => ({ data: undefined, isLoading: false, error: null })),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Dashboard (Sprint 54.4)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('gates the cards behind the UI config so they do not flash before it loads', () => {
    // No device-local override → the grid relies on the (still-loading) server
    // config, so it must show a spinner rather than every card.
    window.localStorage.clear();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <UiConfigProvider>
            <Dashboard />
          </UiConfigProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByTestId('dashboard-cards-loading')).toBeInTheDocument();
  });

  it('renders the page title and an updated-at footer driven by generated_at', () => {
    render(<Dashboard />, { wrapper });
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-updated-at')).toBeInTheDocument();
  });

  it('renders all 9 KPI tiles with values from /dashboard/summary', () => {
    render(<Dashboard />, { wrapper });
    expect(screen.getByTestId('tile-devices')).toBeInTheDocument();
    expect(screen.queryByTestId('tile-devices-total')).not.toBeInTheDocument();
    expect(screen.getByTestId('tile-alerts-open')).toBeInTheDocument();
    expect(screen.getByTestId('tile-reads-per-hour')).toBeInTheDocument();
    expect(screen.getByTestId('tile-assets-active')).toBeInTheDocument();
    expect(screen.getByTestId('tile-tags')).toBeInTheDocument();
    expect(screen.getByTestId('tile-locations')).toBeInTheDocument();
    expect(screen.getByTestId('tile-transfers-in-flight')).toBeInTheDocument();
    expect(screen.getByTestId('tile-recon-backlog')).toBeInTheDocument();
    expect(screen.getByTestId('tile-low-stock')).toBeInTheDocument();

    // Merged Devices tile shows the online value as headline and `/ total` as suffix.
    const devices = screen.getByTestId('tile-devices');
    expect(within(devices).getByText('Devices')).toBeInTheDocument();
    expect(within(devices).getByText('12')).toBeInTheDocument();
    expect(within(devices).getByText(/\/\s*20/)).toBeInTheDocument();
    expect(within(screen.getByTestId('tile-reads-per-hour')).getByText('451')).toBeInTheDocument();
    expect(within(screen.getByTestId('tile-assets-active')).getByText('87')).toBeInTheDocument();
    expect(within(screen.getByTestId('tile-tags')).getByText('128')).toBeInTheDocument();
    expect(within(screen.getByTestId('tile-locations')).getByText('5')).toBeInTheDocument();
    expect(within(screen.getByTestId('tile-locations')).getByText(/11 zones/)).toBeInTheDocument();

    // Renamed labels track sidebar wording.
    expect(within(screen.getByTestId('tile-assets-active')).getByText('Assets')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('tile-transfers-in-flight')).getByText('Tag Transfers'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('tile-recon-backlog')).getByText('Tag Reconciliation'),
    ).toBeInTheDocument();
  });

  it('wraps each tile in a link that deep-links to its pre-filtered list page', () => {
    render(<Dashboard />, { wrapper });
    expect(screen.getByTestId('tile-devices').getAttribute('href')).toBe('/devices');
    expect(screen.getByTestId('tile-alerts-open').getAttribute('href')).toBe(
      '/alerts?status=open&since=24h',
    );
    expect(screen.getByTestId('tile-tags').getAttribute('href')).toBe('/tags');
    expect(screen.getByTestId('tile-locations').getAttribute('href')).toBe('/sites');
    expect(screen.getByTestId('tile-transfers-in-flight').getAttribute('href')).toBe(
      '/tag-transfers?status=requested',
    );
    expect(screen.getByTestId('tile-low-stock').getAttribute('href')).toBe(
      '/inventory/stock-levels?low=1',
    );
  });

  it('writes hide + reorder to the server (cards.dashboard via PATCH /ui-config/me)', () => {
    patchMock.mockClear();
    render(<Dashboard />, { wrapper });

    // Enter edit mode.
    fireEvent.click(screen.getByRole('button', { name: /customize/i }));

    // Hide the low-stock tile.
    fireEvent.click(within(screen.getByTestId('tile-low-stock')).getByRole('button', { name: /hide/i }));

    // Move alerts-open down once.
    fireEvent.click(within(screen.getByTestId('tile-alerts-open')).getByRole('button', { name: /down/i }));

    // Exit edit mode.
    fireEvent.click(screen.getByRole('button', { name: /done/i }));

    const bodies = patchMock.mock.calls.map((c) => c[0] as { cards?: { dashboard?: { hidden?: string[]; order?: string[] } } });
    const hideCall = bodies.find((b) => b?.cards?.dashboard?.hidden);
    expect(hideCall?.cards?.dashboard?.hidden).toContain('low-stock');

    const orderCall = bodies.find((b) => b?.cards?.dashboard?.order);
    const order = orderCall?.cards?.dashboard?.order ?? [];
    expect(order).toHaveLength(9);
    // alerts-open should now sit after reads-per-hour rather than before it.
    expect(order.indexOf('alerts-open')).toBeGreaterThan(order.indexOf('reads-per-hour'));
  });

  it('renders inline sparkline chips on tiles that have sparkline data (Phase F)', () => {
    vi.mocked(useDashboardSparklines).mockReturnValueOnce({
      data: {
        generated_at: '2026-06-01T12:00:00Z',
        bucket_hours: 6,
        days: 7,
        tiles: {
          devices: {
            series: [
              { t: '2026-05-25T00:00:00Z', v: 10 },
              { t: '2026-05-26T00:00:00Z', v: 12 },
              { t: '2026-05-27T00:00:00Z', v: 14 },
            ],
            trend: 'up',
          },
          'reads-per-hour': {
            series: [
              { t: '2026-05-25T00:00:00Z', v: 400 },
              { t: '2026-05-26T00:00:00Z', v: 451 },
            ],
            trend: 'flat',
          },
          // Intentionally empty — must NOT render a chip.
          'alerts-open': { series: [], trend: 'flat' },
        },
      },
      isLoading: false,
      error: null,
      // Vitest's strict typing on useQuery result; cast is fine for the mock.
    } as unknown as ReturnType<typeof useDashboardSparklines>);

    render(<Dashboard />, { wrapper });

    expect(
      within(screen.getByTestId('tile-devices')).getByTestId('kpi-tile-sparkline'),
    ).toHaveAttribute('data-trend', 'up');
    expect(
      within(screen.getByTestId('tile-reads-per-hour')).getByTestId('kpi-tile-sparkline'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('tile-alerts-open')).queryByTestId('kpi-tile-sparkline'),
    ).not.toBeInTheDocument();
    // Tile without an entry in the dict also skips the chip.
    expect(
      within(screen.getByTestId('tile-low-stock')).queryByTestId('kpi-tile-sparkline'),
    ).not.toBeInTheDocument();
  });
});
