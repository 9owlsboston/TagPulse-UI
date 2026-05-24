import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AntApp from 'antd/es/app';
import { PendingBulkOperations } from '@/pages/admin/PendingBulkOperations';
import type { PendingBulkOperationResponse } from '@/api/generated/models/PendingBulkOperationResponse';

let mockRole = 'admin';
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ role: mockRole }),
}));

const listMock = vi.fn();
const approveMutate = vi.fn();
const rejectMutate = vi.fn();

vi.mock('@/hooks/usePendingBulkOperations', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/usePendingBulkOperations')>(
    '@/hooks/usePendingBulkOperations',
  );
  return {
    ...actual,
    usePendingBulkOperations: (params: unknown) => listMock(params),
    useApprovePendingBulkOperation: () => ({ mutateAsync: approveMutate, isPending: false }),
    useRejectPendingBulkOperation: () => ({ mutateAsync: rejectMutate, isPending: false }),
  };
});

function row(overrides: Partial<PendingBulkOperationResponse> = {}): PendingBulkOperationResponse {
  return {
    id: 'pending-1111-2222-3333-4444',
    tenant_id: 'tenant-a',
    operation: 'tag_import',
    status: 'pending',
    request_id: 'req-abc',
    requested_by: 'user-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    row_count: 42,
    sample: ['AABBCC01', 'AABBCC02', 'AABBCC03'],
    content_hash: 'sha256:deadbeef',
    created_at: '2026-06-01T12:00:00Z',
    decided_at: null,
    decided_by: null,
    executed_at: null,
    expires_at: '2026-06-02T12:00:00Z',
    ...overrides,
  };
}

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <AntApp>
        <PendingBulkOperations />
      </AntApp>
    </QueryClientProvider>
  );
}

describe('PendingBulkOperations', () => {
  beforeEach(() => {
    mockRole = 'admin';
    listMock.mockReset();
    approveMutate.mockReset();
    rejectMutate.mockReset();
    listMock.mockReturnValue({ data: [row()], isLoading: false, isError: false, error: null });
    approveMutate.mockResolvedValue(row({ status: 'executed' }));
    rejectMutate.mockResolvedValue(row({ status: 'rejected' }));
  });

  it('renders the inbox with one pending row by default', () => {
    render(wrap());
    expect(screen.getByText('Pending bulk operations')).toBeInTheDocument();
    expect(screen.getByText('tag_import')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    // Default status filter is "pending".
    expect(listMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'pending', operation: undefined, offset: 0, limit: 50 }),
    );
  });

  it('changing the operation filter re-queries with the new value', async () => {
    render(wrap());
    const input = screen.getByTestId('operation-filter')
    fireEvent.change(input, { target: { value: 'tag_status_change' } });
    await waitFor(() =>
      expect(listMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ operation: 'tag_status_change' }),
      ),
    );
  });

  it('opens the review drawer with sample EPCs when "Review" is clicked', async () => {
    render(wrap());
    fireEvent.click(screen.getByText('Review'));
    await waitFor(() => expect(screen.getByText('Review bulk operation')).toBeInTheDocument());
    const sample = screen.getByTestId('sample-epcs');
    expect(sample.textContent).toContain('AABBCC01');
    expect(sample.textContent).toContain('AABBCC03');
    expect(screen.getByText('Approve & execute')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });

  it('approve flow confirms then calls the mutation with the row id', async () => {
    render(wrap());
    fireEvent.click(screen.getByText('Review'));
    await waitFor(() => screen.getByText('Approve & execute'));
    fireEvent.click(screen.getByText('Approve & execute'));
    // Modal.confirm renders a confirmation dialog containing the title text.
    const confirmTitles = await screen.findAllByText('Approve this bulk operation?');
    const dialog = confirmTitles[0]!.closest('.ant-modal-confirm') as HTMLElement;
    expect(dialog).not.toBeNull();
    fireEvent.click(within(dialog).getByText('Approve & execute'));
    await waitFor(() =>
      expect(approveMutate).toHaveBeenCalledWith('pending-1111-2222-3333-4444'),
    );
  });

  it('reject flow confirms then calls the mutation with the row id', async () => {
    render(wrap());
    fireEvent.click(screen.getByText('Review'));
    await waitFor(() => screen.getByText('Reject'));
    fireEvent.click(screen.getByText('Reject'));
    const confirmTitles = await screen.findAllByText('Reject this bulk operation?');
    const dialog = confirmTitles[0]!.closest('.ant-modal-confirm') as HTMLElement;
    expect(dialog).not.toBeNull();
    fireEvent.click(within(dialog).getByText('Reject'));
    await waitFor(() =>
      expect(rejectMutate).toHaveBeenCalledWith('pending-1111-2222-3333-4444'),
    );
  });

  it('hides approve/reject buttons when the selected row is not pending', async () => {
    listMock.mockReturnValue({
      data: [row({ status: 'executed', decided_by: 'user-x', decided_at: '2026-06-01T13:00:00Z', executed_at: '2026-06-01T13:00:01Z' })],
      isLoading: false,
      isError: false,
      error: null,
    });
    render(wrap());
    fireEvent.click(screen.getByText('Review'));
    await waitFor(() => screen.getByText('Review bulk operation'));
    expect(screen.queryByText('Approve & execute')).not.toBeInTheDocument();
    expect(screen.queryByText('Reject')).not.toBeInTheDocument();
    expect(screen.getByText('This operation is no longer pending')).toBeInTheDocument();
  });

  it('renders nothing for non-admin role (RoleGuard)', () => {
    mockRole = 'editor';
    render(wrap());
    expect(screen.queryByText('Pending bulk operations')).not.toBeInTheDocument();
  });
});
