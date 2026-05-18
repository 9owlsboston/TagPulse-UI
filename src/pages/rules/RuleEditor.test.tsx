import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

// Sprint 41 Phase F2 — SignalingRuleModal is rendered (closed) inside
// RuleEditor's tab pane. Mock its data-fetching hooks so the component
// mounts without hitting the network.
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

describe('RuleEditor', () => {
  it('renders the create title', () => {
    render(<RuleEditor />, { wrapper });
    expect(screen.getByText('Create Rule')).toBeInTheDocument();
  });

  it('defaults to the Alert rule tab on new creation (Sprint 41 Phase F3)', () => {
    render(<RuleEditor />, { wrapper });
    // The Alert rule pane surfaces a CTA that opens the SignalingRuleModal,
    // so the data-testid is the clearest signal the tab is active.
    expect(screen.getByTestId('open-signaling-modal-button')).toBeInTheDocument();
  });

  it('renders the legacy wizard step navigation under the Legacy rule tab', async () => {
    const user = userEvent.setup();
    render(<RuleEditor />, { wrapper });
    await user.click(screen.getByRole('tab', { name: 'Legacy rule' }));
    expect(screen.getByText('Condition')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Scope')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  it('renders Next button on first step of the legacy wizard', async () => {
    const user = userEvent.setup();
    render(<RuleEditor />, { wrapper });
    await user.click(screen.getByRole('tab', { name: 'Legacy rule' }));
    expect(screen.getByText('Next')).toBeInTheDocument();
  });
});
