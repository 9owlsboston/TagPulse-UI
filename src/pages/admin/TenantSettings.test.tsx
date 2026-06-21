import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TenantSettings } from '@/pages/admin/TenantSettings';

const mutateAsync = vi.fn().mockResolvedValue({});
let mockConfig: Record<string, unknown> = {};

vi.mock('@/hooks/useTenantConfig', () => ({
  useTenantConfig: () => ({ data: mockConfig, isLoading: false }),
  useUpdateTenantConfig: () => ({ mutateAsync, isPending: false }),
}));
vi.mock('@/components/useCanPerform', () => ({ useCanPerform: () => false }));

function renderSettings() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TenantSettings />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const BASE = {
  id: 't1',
  name: 'Acme',
  slug: 'acme',
  plan: 'standard',
  tracking_modes: ['asset'],
  telemetry_subject_kinds: ['device'],
  dashboard_tags_count_mode: 'live',
};

describe('TenantSettings — Consolidation tab', () => {
  beforeEach(() => mutateAsync.mockClear());

  it('shows the consolidation controls and clears when disabled', async () => {
    mockConfig = { ...BASE, fusion_strategy: null };
    renderSettings();
    fireEvent.click(screen.getByRole('tab', { name: 'Consolidation' }));
    expect(
      await screen.findByText('Asset state consolidation', undefined, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Enable consolidation')).toBeInTheDocument();
    // disabled by default → Save sends explicit null (opt out).
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ fusion_strategy: null }));
  });

  it('prefills τ from an existing strategy and saves the knobs', async () => {
    mockConfig = {
      ...BASE,
      fusion_strategy: {
        half_life_s: 8,
        recompute_interval_s: 10,
        lookback_s: 90,
        rssi_floor_dbm: null,
        min_reads: 1,
        sla: { temp_min_c: 2, temp_max_c: 8, humidity_max: 85, excursion_tolerance_s: 30 },
      },
    };
    renderSettings();
    fireEvent.click(screen.getByRole('tab', { name: 'Consolidation' }));
    // Tab mounts + useEffect prefills state from the existing strategy.
    expect(
      await screen.findByText('Asset state consolidation', undefined, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Cold-chain SLA')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    const arg = mutateAsync.mock.calls[0]?.[0] as
      | { fusion_strategy: Record<string, unknown> }
      | undefined;
    expect(arg?.fusion_strategy.half_life_s).toBe(8);
    expect(arg?.fusion_strategy.lookback_s).toBe(90);
    expect((arg?.fusion_strategy.sla as Record<string, unknown>).temp_max_c).toBe(8);
  });
});
