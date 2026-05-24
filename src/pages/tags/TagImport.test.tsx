import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TagImport } from '@/pages/tags/TagImport';
import type { TagImportResult } from '@/api/generated/models/TagImportResult';

const mutateMock = vi.fn();
const mutationState = { isPending: false };
vi.mock('@/hooks/useImportTags', () => ({
  useImportTags: () => ({
    mutateAsync: mutateMock,
    isPending: mutationState.isPending,
  }),
}));

const canPerformMock = vi.fn(() => true);
vi.mock('@/components/useCanPerform', () => ({
  useCanPerform: () => canPerformMock(),
}));

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TagImport />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function uploadCsv(content = 'epc_hex\nAAAA\nBBBB\n') {
  const file = new File([content], 'tags.csv', { type: 'text/csv' });
  // AntD Upload reads from the file input directly. The Dragger renders
  // an <input type=file> hidden inside the drop area; fireEvent.change
  // on it triggers beforeUpload -> the wizard captures the File.
  const input = document.querySelector('input[type="file"]') as globalThis.HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [file] });
  fireEvent.change(input);
  return file;
}

describe('TagImport', () => {
  it('blocks viewer-role users with a 403 result', () => {
    canPerformMock.mockReturnValueOnce(false);
    render(wrap());
    expect(screen.getByText(/requires editor or admin role/i)).toBeInTheDocument();
  });

  it('renders the wizard and dry-run button starts disabled', () => {
    canPerformMock.mockReturnValue(true);
    render(wrap());
    expect(screen.getByText('Import tags')).toBeInTheDocument();
    expect(screen.getByTestId('tag-import-dryrun-btn')).toBeDisabled();
  });

  it('runs a dry-run on Validate and shows the sample + confirm button', async () => {
    canPerformMock.mockReturnValue(true);
    const previewResult: TagImportResult = {
      dry_run: true,
      rows_total: 2,
      rows_created: 0,
      rows_skipped: 0,
      token: 'tok-123',
      expires_in: 600,
      sample: ['AAAA', 'BBBB'],
      errors: [],
    };
    mutateMock.mockResolvedValueOnce(previewResult);
    render(wrap());
    uploadCsv();
    await waitFor(() => {
      expect(screen.getByTestId('tag-import-dryrun-btn')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('tag-import-dryrun-btn'));
    await waitFor(() => {
      expect(mutateMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ dryRun: true, file: expect.any(File) }),
      );
    });
    expect(await screen.findByText(/2 row\(s\) ready to import/i)).toBeInTheDocument();
    expect(screen.getByTestId('tag-import-confirm-btn')).toBeInTheDocument();
  });

  it('renders row-level errors and offers a Start over button', async () => {
    canPerformMock.mockReturnValue(true);
    const previewResult: TagImportResult = {
      dry_run: true,
      rows_total: 1,
      rows_created: 0,
      rows_skipped: 0,
      token: null,
      errors: [{ row: 2, epc_hex: 'ZZZZ', error: 'epc_hex must be hex' }],
    };
    mutateMock.mockResolvedValueOnce(previewResult);
    render(wrap());
    uploadCsv();
    fireEvent.click(screen.getByTestId('tag-import-dryrun-btn'));
    expect(await screen.findByText(/CSV rejected/i)).toBeInTheDocument();
    expect(screen.getByText('epc_hex must be hex')).toBeInTheDocument();
    expect(screen.queryByTestId('tag-import-confirm-btn')).toBeNull();
    expect(screen.getByRole('button', { name: /start over/i })).toBeInTheDocument();
  });

  it('confirms with the dry-run token and shows the success result', async () => {
    canPerformMock.mockReturnValue(true);
    mutateMock.mockResolvedValueOnce({
      dry_run: true,
      rows_total: 2,
      rows_created: 0,
      rows_skipped: 0,
      token: 'tok-xyz',
      expires_in: 600,
      sample: ['AAAA', 'BBBB'],
      errors: [],
    } satisfies TagImportResult);
    mutateMock.mockResolvedValueOnce({
      dry_run: false,
      rows_total: 2,
      rows_created: 2,
      rows_skipped: 0,
      token: 'tok-xyz',
      errors: [],
    } satisfies TagImportResult);
    render(wrap());
    uploadCsv();
    fireEvent.click(screen.getByTestId('tag-import-dryrun-btn'));
    fireEvent.click(await screen.findByTestId('tag-import-confirm-btn'));
    await waitFor(() => {
      expect(mutateMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ confirm: 'tok-xyz', file: expect.any(File) }),
      );
    });
    expect(await screen.findByText(/2 tag\(s\) imported/i)).toBeInTheDocument();
  });

  it('shows the two-person approval result when the server returns requires_approval', async () => {
    canPerformMock.mockReturnValue(true);
    mutateMock.mockResolvedValueOnce({
      dry_run: true,
      rows_total: 10001,
      rows_created: 0,
      rows_skipped: 0,
      token: 'tok-big',
      expires_in: 600,
      sample: ['AAAA'],
      errors: [],
    } satisfies TagImportResult);
    mutateMock.mockResolvedValueOnce({
      dry_run: false,
      rows_total: 10001,
      rows_created: 0,
      rows_skipped: 0,
      token: 'tok-big',
      requires_approval: true,
      pending_id: 'pending-uuid-1',
      errors: [],
    } satisfies TagImportResult);
    render(wrap());
    uploadCsv();
    fireEvent.click(screen.getByTestId('tag-import-dryrun-btn'));
    fireEvent.click(await screen.findByTestId('tag-import-confirm-btn'));
    expect(await screen.findByText(/queued for second-admin approval/i)).toBeInTheDocument();
    expect(screen.getByText(/pending-uuid-1/)).toBeInTheDocument();
  });
});
