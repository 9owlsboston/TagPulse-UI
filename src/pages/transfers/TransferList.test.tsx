import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TransferList } from '@/pages/transfers/TransferList';
import type { TagTransferResponse } from '@/api/generated/models/TagTransferResponse';

const useTransfersMock = vi.fn();
const createMutateMock = vi.fn();
vi.mock('@/hooks/useTransfers', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useTransfers')>(
    '@/hooks/useTransfers',
  );
  return {
    ...actual,
    useTransfers: (params: unknown) => useTransfersMock(params),
    useCreateTransfer: () => ({ mutateAsync: createMutateMock, isPending: false }),
  };
});

const canPerformMock = vi.fn(() => true);
vi.mock('@/components/useCanPerform', () => ({
  useCanPerform: () => canPerformMock(),
}));

function row(overrides: Partial<TagTransferResponse> = {}): TagTransferResponse {
  return {
    id: 'tr-1',
    request_id: 'req-deadbeef1234',
    epc_hex: 'AABBCCDD',
    from_tenant_id: 'tenant-a',
    to_tenant_id: 'tenant-b',
    status: 'requested' as TagTransferResponse.status,
    requested_at: '2026-05-24T10:00:00Z',
    requested_by: 'user-1',
    completed_at: null,
    failure_reason: null,
    ...overrides,
  };
}

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TransferList />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('TransferList', () => {
  it('renders the outbound queue with one row by default', () => {
    canPerformMock.mockReturnValue(true);
    useTransfersMock.mockReturnValue({
      data: [row()],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(wrap());
    expect(screen.getByText('Tag transfers')).toBeInTheDocument();
    expect(screen.getByText('AABBCCDD')).toBeInTheDocument();
    expect(screen.getByText('requested')).toBeInTheDocument();
    // Outbound default → To-tenant column populated.
    expect(screen.getByText('tenant-b')).toBeInTheDocument();
    // Direction-default forwarded.
    expect(useTransfersMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ direction: 'outbound', status: undefined, offset: 0 }),
    );
  });

  it('switches to inbound and re-queries', () => {
    canPerformMock.mockReturnValue(true);
    useTransfersMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(wrap());
    fireEvent.click(screen.getByText('Inbound'));
    expect(useTransfersMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ direction: 'inbound' }),
    );
    expect(screen.getByText(/No inbound transfers yet/i)).toBeInTheDocument();
  });

  it('hides the New transfer button for viewer-role users', () => {
    canPerformMock.mockReturnValue(false);
    useTransfersMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(wrap());
    expect(screen.queryByTestId('transfer-list-new-btn')).toBeNull();
  });

  it('opens the New transfer modal and submits a request', async () => {
    canPerformMock.mockReturnValue(true);
    useTransfersMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    createMutateMock.mockResolvedValueOnce([row()]);
    render(wrap());
    fireEvent.click(screen.getByTestId('transfer-list-new-btn'));
    fireEvent.change(screen.getByTestId('new-transfer-epcs'), {
      target: { value: 'AABBCCDD\nEEFF0011' },
    });
    fireEvent.change(screen.getByTestId('new-transfer-tenant'), {
      target: { value: 'acme-corp' },
    });
    fireEvent.click(screen.getByTestId('new-transfer-submit'));
    await waitFor(() => {
      expect(createMutateMock).toHaveBeenCalledWith({
        epcs: ['AABBCCDD', 'EEFF0011'],
        to_tenant_slug: 'acme-corp',
      });
    });
  });

  it('shows failure reason for failed rows', () => {
    canPerformMock.mockReturnValue(true);
    useTransfersMock.mockReturnValue({
      data: [
        row({
          id: 'tr-2',
          status: 'failed' as TagTransferResponse.status,
          failure_reason: 'target tenant suspended',
          completed_at: '2026-05-24T10:05:00Z',
        }),
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(wrap());
    expect(screen.getByText('failed')).toBeInTheDocument();
    expect(screen.getByText('target tenant suspended')).toBeInTheDocument();
  });
});
