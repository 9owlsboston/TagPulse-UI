import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { RuleList } from '@/pages/rules/RuleList';

vi.mock('@/hooks/useRules', () => ({
  useRules: () => ({
    data: [
      { id: '1', name: 'High Signal', condition_type: 'threshold', action_type: 'webhook', enabled: true },
    ],
    isLoading: false,
  }),
  useUpdateRule: () => ({ mutate: vi.fn() }),
  useDeleteRule: () => ({ mutate: vi.fn() }),
  // Sprint 41 Phase F2 — RuleList now mounts SignalingRuleModal which
  // pulls useCreateRule + useCategories + useIntegrations.
  useCreateRule: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useCategories', () => ({
  useCategories: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useIntegrations', () => ({
  useIntegrations: () => ({ data: [], isLoading: false }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('RuleList', () => {
  it('renders the title', () => {
    render(<RuleList />, { wrapper });
    expect(screen.getByText('Rules')).toBeInTheDocument();
  });

  it('renders rule name in table', () => {
    render(<RuleList />, { wrapper });
    expect(screen.getByText('High Signal')).toBeInTheDocument();
  });
});
