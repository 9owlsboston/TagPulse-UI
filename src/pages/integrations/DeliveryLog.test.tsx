import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DeliveryLog } from '@/pages/integrations/DeliveryLog';

vi.mock('@/hooks/useIntegrations', () => ({
  useDeliveries: () => ({
    data: [
      { id: 'd1', integration_id: 'i1', event_type: 'tag_read.created', status: 'success', attempts: 1, response_code: 200, error_message: null, created_at: '2026-04-25T10:00:00Z' },
    ],
    isLoading: false,
  }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/integrations/i1/deliveries']}>
        <Routes>
          <Route path="/integrations/:id/deliveries" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DeliveryLog', () => {
  it('renders the title', () => {
    render(<DeliveryLog />, { wrapper });
    expect(screen.getByText('Delivery Log')).toBeInTheDocument();
  });

  it('renders delivery data', () => {
    render(<DeliveryLog />, { wrapper });
    expect(screen.getByText('tag_read.created')).toBeInTheDocument();
  });
});
