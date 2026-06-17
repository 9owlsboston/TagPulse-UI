import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AlertHistory } from '@/pages/rules/AlertHistory';

const SINGLE_ALERT = [
  { id: '1', message: 'Threshold exceeded', severity: 'critical', status: 'open', triggered_at: '2026-04-25T10:00:00Z', device_id: null },
];

// 30 alerts — more than the default page size (20) so the size changer matters.
const MID_ALERTS = Array.from({ length: 30 }, (_, i) => ({
  id: `a${i}`,
  message: `Alert-${String(i).padStart(4, '0')}`,
  severity: 'critical',
  status: 'open',
  triggered_at: '2026-04-25T10:00:00Z',
  device_id: null,
}));

let currentAlerts: unknown[] = SINGLE_ALERT;

vi.mock('@/hooks/useAlerts', () => ({
  useAlerts: () => ({
    data: currentAlerts,
    isLoading: false,
  }),
  useAcknowledgeAlert: () => ({ mutate: vi.fn(), isPending: false }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('AlertHistory', () => {
  beforeEach(() => {
    currentAlerts = SINGLE_ALERT;
  });

  it('renders the title', () => {
    render(<AlertHistory />, { wrapper });
    expect(screen.getByText('Alerts')).toBeInTheDocument();
  });

  it('renders alert message', () => {
    render(<AlertHistory />, { wrapper });
    expect(screen.getByText('Threshold exceeded')).toBeInTheDocument();
  });

  it('shows the row count badge next to the title', () => {
    render(<AlertHistory />, { wrapper });
    const badge = screen.getByTestId('alert-history-title-count');
    expect(badge).toHaveTextContent('1');
  });

  it('lets the page-size changer take effect (not controlled-locked at 20)', async () => {
    currentAlerts = MID_ALERTS; // 30 rows → page 1 of 20 by default
    render(<AlertHistory />, { wrapper });
    expect(screen.getByText('Alert-0000')).toBeInTheDocument();
    expect(screen.queryByText('Alert-0025')).not.toBeInTheDocument();
    fireEvent.mouseDown(screen.getByText('20 / page'));
    fireEvent.click(await screen.findByText('100 / page'));
    expect(await screen.findByText('Alert-0025')).toBeInTheDocument();
  });
});
