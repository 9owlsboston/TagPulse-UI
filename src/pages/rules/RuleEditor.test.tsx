import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { RuleEditor } from '@/pages/rules/RuleEditor';

vi.mock('@/hooks/useRules', () => ({
  useRule: () => ({ data: null, isLoading: false }),
  useCreateRule: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateRule: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRuleTemplates: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useTenantConfig', () => ({
  useTenantConfig: () => ({ data: { tracking_modes: ['asset'], telemetry_subject_kinds: ['device'] } }),
  useUpdateTenantConfig: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useDevices', () => ({
  useDevices: () => ({
    data: [{ id: '1', name: 'Reader-A' }],
    isLoading: false,
  }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('RuleEditor', () => {
  it('renders the create title', () => {
    render(<RuleEditor />, { wrapper });
    expect(screen.getByText('Create Rule')).toBeInTheDocument();
  });

  it('renders step navigation', () => {
    render(<RuleEditor />, { wrapper });
    expect(screen.getByText('Condition')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Scope')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  it('renders Next button on first step', () => {
    render(<RuleEditor />, { wrapper });
    expect(screen.getByText('Next')).toBeInTheDocument();
  });
});
