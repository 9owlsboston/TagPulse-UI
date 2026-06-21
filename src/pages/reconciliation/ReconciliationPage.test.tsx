import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ReconciliationPage } from '@/pages/reconciliation/ReconciliationPage';

const useReconciliationMock = vi.fn();
vi.mock('@/hooks/useReconciliation', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useReconciliation')>(
    '@/hooks/useReconciliation',
  );
  return {
    ...actual,
    useReconciliation: (params: unknown) => useReconciliationMock(params),
  };
});

const getReconciliationMock = vi.fn();
vi.mock('@/api/generated/services/TagsService', () => ({
  TagsService: {
    getReconciliationViewTagsReconciliationViewGet: (...args: unknown[]) =>
      getReconciliationMock(...args),
  },
}));

function wrap(initialPath: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/tags/reconciliation/:view" element={<ReconciliationPage />} />
          <Route path="/tags/reconciliation/registered-unread" element={<ReconciliationPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  useReconciliationMock.mockReset();
  getReconciliationMock.mockReset();
});

describe('ReconciliationPage', () => {
  it('renders the registered-unread view with rows', () => {
    useReconciliationMock.mockReturnValue({
      data: [
        {
          tag_id: 't1',
          epc_hex: 'AABB',
          status: 'registered',
          source: 'csv_import',
          first_seen_at: null,
          last_seen_at: null,
          created_at: '2026-05-01T00:00:00Z',
        },
      ],
      isLoading: false,
      error: null,
    });
    render(wrap('/tags/reconciliation/registered-unread'));
    expect(screen.getByText('Reconciliation — Registered but unread')).toBeInTheDocument();
    expect(screen.getByText('AABB')).toBeInTheDocument();
    expect(useReconciliationMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ view: 'registered-unread', days: 30 }),
    );
  });

  it('forwards a custom days value', () => {
    useReconciliationMock.mockReturnValue({ data: [], isLoading: false, error: null });
    render(wrap('/tags/reconciliation/registered-unread'));
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '7' } });
    fireEvent.blur(input);
    expect(useReconciliationMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ days: 7 }),
    );
  });

  it('hides the days control on bindings-on-retired', () => {
    useReconciliationMock.mockReturnValue({ data: [], isLoading: false, error: null });
    render(wrap('/tags/reconciliation/bindings-on-retired'));
    expect(screen.queryByTestId('reconciliation-days')).toBeNull();
    expect(
      screen.getByText(/No active bindings reference terminal-status tags/i),
    ).toBeInTheDocument();
  });

  it('shows per-view empty-state copy', () => {
    useReconciliationMock.mockReturnValue({ data: [], isLoading: false, error: null });
    render(wrap('/tags/reconciliation/unregistered-reading'));
    expect(
      screen.getByText(/No unregistered EPCs reading in the last 30 days/i),
    ).toBeInTheDocument();
  });

  it('downloads CSV via the API with format=csv', async () => {
    useReconciliationMock.mockReturnValue({ data: [], isLoading: false, error: null });
    getReconciliationMock.mockResolvedValueOnce('header\nrow\n');
    // jsdom needs URL.createObjectURL/revoke shims.
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    render(wrap('/tags/reconciliation/registered-unread'));
    fireEvent.click(screen.getByTestId('reconciliation-csv-btn'));
    await waitFor(() => {
      expect(getReconciliationMock).toHaveBeenCalledWith(
        'registered-unread',
        30,
        100_000,
        0,
        null,
        'csv',
      );
    });
    expect(createObjectURL).toHaveBeenCalled();
  });

  it('redirects an unknown view to registered-unread', () => {
    useReconciliationMock.mockReturnValue({ data: [], isLoading: false, error: null });
    render(wrap('/tags/reconciliation/bogus-view'));
    // After redirect, header reflects registered-unread.
    expect(screen.getByText('Reconciliation — Registered but unread')).toBeInTheDocument();
  });
});
