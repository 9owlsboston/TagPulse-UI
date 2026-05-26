import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AlertHistory } from '@/pages/rules/AlertHistory';

vi.mock('@/hooks/useAlerts', () => ({
  useAlerts: () => ({
    data: [
      { id: '1', message: 'Threshold exceeded', severity: 'critical', status: 'open', triggered_at: '2026-04-25T10:00:00Z', device_id: null },
    ],
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
});
