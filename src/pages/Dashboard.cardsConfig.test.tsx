/**
 * Sprint 60 (ADR-032 §4 `cards`) — Dashboard card config layering.
 *
 * Proves the reconciliation contract: the resolved `cards.dashboard` leaf is
 * the *default* layer, and the existing device-local localStorage choice
 * overrides it when present. Kept in a dedicated file so the bespoke
 * config↔localStorage layering is mocked in isolation without disturbing the
 * broader Dashboard.test.tsx behavioural suite.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from '@/pages/Dashboard';
import type { DashboardSummary } from '@/types';
import type { ResolvedCardGroup } from '@/lib/uiConfig';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="rc-responsive">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => <svg>{children}</svg>,
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
vi.mock('@/hooks/useDashboardSparklines', () => ({
  useDashboardSparklines: () => ({ data: undefined, isLoading: false, error: null }),
}));

// Control the resolved card-group leaf per test.
let cardGroup: ResolvedCardGroup = { hidden: [], order: [] };
vi.mock('@/lib/uiConfig', () => ({
  useCardGroup: () => cardGroup,
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Dashboard card config layering', () => {
  beforeEach(() => {
    window.localStorage.clear();
    cardGroup = { hidden: [], order: [] };
  });

  it('hides a tile by default when the config hides it (no local choice)', () => {
    cardGroup = { hidden: ['low-stock'], order: [] };
    render(<Dashboard />, { wrapper });
    expect(screen.getByText('Devices')).toBeInTheDocument();
    expect(screen.queryByText('Low-stock products')).not.toBeInTheDocument();
  });

  it('shows all tiles when config hides none', () => {
    cardGroup = { hidden: [], order: [] };
    render(<Dashboard />, { wrapper });
    expect(screen.getByText('Low-stock products')).toBeInTheDocument();
  });

  it('lets a device-local choice override the config default', () => {
    // The operator explicitly un-hid everything on this device (empty but
    // *present* localStorage), which must win over a config that hides a tile.
    window.localStorage.setItem('tagpulse.dashboard.tileHidden', JSON.stringify([]));
    cardGroup = { hidden: ['low-stock'], order: [] };
    render(<Dashboard />, { wrapper });
    expect(screen.getByText('Low-stock products')).toBeInTheDocument();
  });
});
