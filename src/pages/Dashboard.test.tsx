import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from '@/pages/Dashboard';
import type { DashboardSummary } from '@/types';

const FIXTURE: DashboardSummary = {
  devices_online: 12,
  devices_total: 20,
  alerts_open_24h: 3,
  reads_per_hour_now: 451,
  assets_active: 87,
  tag_transfers_in_flight: 5,
  tag_recon_backlog: 2,
  low_stock_count: 1,
  generated_at: '2026-06-01T12:00:00Z',
};

vi.mock('@/hooks/useDashboardSummary', () => ({
  useDashboardSummary: () => ({ data: FIXTURE, isLoading: false, error: null }),
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

  it('renders the page title and an updated-at footer driven by generated_at', () => {
    render(<Dashboard />, { wrapper });
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-updated-at')).toBeInTheDocument();
  });

  it('renders all 8 KPI tiles with values from /dashboard/summary', () => {
    render(<Dashboard />, { wrapper });
    expect(screen.getByTestId('tile-devices-online')).toBeInTheDocument();
    expect(screen.getByTestId('tile-devices-total')).toBeInTheDocument();
    expect(screen.getByTestId('tile-alerts-open')).toBeInTheDocument();
    expect(screen.getByTestId('tile-reads-per-hour')).toBeInTheDocument();
    expect(screen.getByTestId('tile-assets-active')).toBeInTheDocument();
    expect(screen.getByTestId('tile-transfers-in-flight')).toBeInTheDocument();
    expect(screen.getByTestId('tile-recon-backlog')).toBeInTheDocument();
    expect(screen.getByTestId('tile-low-stock')).toBeInTheDocument();

    // Devices-online tile shows the bare KPI value and a /total suffix.
    const devicesOnline = screen.getByTestId('tile-devices-online');
    expect(within(devicesOnline).getByText('12')).toBeInTheDocument();
    expect(within(devicesOnline).getByText(/\/\s*20/)).toBeInTheDocument();
    expect(within(screen.getByTestId('tile-reads-per-hour')).getByText('451')).toBeInTheDocument();
    expect(within(screen.getByTestId('tile-assets-active')).getByText('87')).toBeInTheDocument();
  });

  it('wraps each tile in a link that deep-links to its pre-filtered list page', () => {
    render(<Dashboard />, { wrapper });
    expect(screen.getByTestId('tile-devices-online').getAttribute('href')).toBe(
      '/devices?connection=online',
    );
    expect(screen.getByTestId('tile-alerts-open').getAttribute('href')).toBe(
      '/alerts?status=open&since=24h',
    );
    expect(screen.getByTestId('tile-transfers-in-flight').getAttribute('href')).toBe(
      '/tag-transfers?status=requested',
    );
    expect(screen.getByTestId('tile-low-stock').getAttribute('href')).toBe(
      '/inventory/stock-levels?low=1',
    );
  });

  it('persists hide + reorder across remount via LocalStorage', () => {
    const { unmount } = render(<Dashboard />, { wrapper });

    // Enter edit mode.
    fireEvent.click(screen.getByRole('button', { name: /customize/i }));

    // Hide the low-stock tile.
    fireEvent.click(within(screen.getByTestId('tile-low-stock')).getByRole('button', { name: /hide/i }));

    // Move alerts-open down once.
    fireEvent.click(within(screen.getByTestId('tile-alerts-open')).getByRole('button', { name: /down/i }));

    // Exit edit mode.
    fireEvent.click(screen.getByRole('button', { name: /done/i }));

    // Verify LocalStorage state.
    const order = JSON.parse(window.localStorage.getItem('tagpulse.dashboard.tileOrder') ?? '[]');
    const hidden = JSON.parse(window.localStorage.getItem('tagpulse.dashboard.tileHidden') ?? '[]');
    expect(hidden).toContain('low-stock');
    expect(order).toHaveLength(8);
    // alerts-open should now sit after reads-per-hour rather than before it.
    const idxAlerts = order.indexOf('alerts-open');
    const idxReads = order.indexOf('reads-per-hour');
    expect(idxAlerts).toBeGreaterThan(idxReads);

    unmount();

    // Remount: hidden tile is gone (outside edit mode) and order is preserved.
    render(<Dashboard />, { wrapper });
    expect(screen.queryByTestId('tile-low-stock')).not.toBeInTheDocument();
    expect(screen.getByTestId('tile-alerts-open')).toBeInTheDocument();
  });
});
