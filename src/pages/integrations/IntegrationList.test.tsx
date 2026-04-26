import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { IntegrationList } from '@/pages/integrations/IntegrationList';

vi.mock('@/hooks/useIntegrations', () => ({
  useIntegrations: () => ({
    data: [
      { id: '1', name: 'My Webhook', type: 'webhook', events: ['tag_read.created'], health_status: 'healthy', enabled: true, last_triggered: null },
    ],
    isLoading: false,
  }),
  useCreateIntegration: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateIntegration: () => ({ mutate: vi.fn() }),
  useDeleteIntegration: () => ({ mutateAsync: vi.fn() }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('IntegrationList', () => {
  it('renders the title', () => {
    render(<IntegrationList />, { wrapper });
    expect(screen.getByText('Integrations')).toBeInTheDocument();
  });

  it('renders integration name', () => {
    render(<IntegrationList />, { wrapper });
    expect(screen.getByText('My Webhook')).toBeInTheDocument();
  });
});
