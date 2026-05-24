import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TagDetail } from '@/pages/tags/TagDetail';
import { TagResponse } from '@/api/generated/models/TagResponse';

const tagMock = vi.fn();
const updateMutateMock = vi.fn();
const updateState = { isPending: false };

vi.mock('@/hooks/useTags', () => ({
  useTag: (epc: string) => tagMock(epc),
  useUpdateTag: () => ({ mutateAsync: updateMutateMock, isPending: updateState.isPending }),
  TAGS_QUERY_KEY: 'tags',
}));

const canPerformMock = vi.fn(() => true);
vi.mock('@/components/useCanPerform', () => ({
  useCanPerform: () => canPerformMock(),
}));

function makeTag(overrides: Partial<TagResponse> = {}): TagResponse {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    tenant_id: 't',
    epc_hex: 'AABBCCDDEEFF00112233445566778899',
    gs1_uri: 'https://id.example/01/12345',
    status: TagResponse.status.ACTIVE,
    source: TagResponse.source.CSV_IMPORT,
    metadata_: { lot: 'reel-008rT' },
    first_seen_at: '2026-05-01T00:00:00Z',
    last_seen_at: '2026-05-22T12:00:00Z',
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-22T12:00:00Z',
    ...overrides,
  };
}

function wrap(epc: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/tags/${epc}`]}>
        <Routes>
          <Route path="/tags/:epcHex" element={<TagDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('TagDetail', () => {
  it('renders the EPC header, status tag, and metadata block', () => {
    tagMock.mockReturnValue({ data: makeTag(), isLoading: false, error: null });
    render(wrap('AABBCCDDEEFF00112233445566778899'));
    expect(
      screen.getAllByText('AABBCCDDEEFF00112233445566778899').length,
    ).toBeGreaterThan(0);
    // Status tag rendered in both the header and the descriptions block.
    expect(screen.getAllByText('active').length).toBeGreaterThan(0);
    // Metadata pretty-printed.
    expect(screen.getByText(/"lot": "reel-008rT"/)).toBeInTheDocument();
  });

  it('shows a not-found alert when the tag is missing', () => {
    tagMock.mockReturnValue({ data: undefined, isLoading: false, error: new Error('404') });
    render(wrap('UNKNOWN'));
    expect(screen.getByText(/Tag not found/i)).toBeInTheDocument();
    expect(screen.getByText(/No tag with EPC UNKNOWN/i)).toBeInTheDocument();
  });

  it('hides the Change status CTA for terminal-state tags', () => {
    tagMock.mockReturnValue({
      data: makeTag({ status: TagResponse.status.RETIRED }),
      isLoading: false,
      error: null,
    });
    render(wrap('AAAA'));
    expect(screen.queryByRole('button', { name: /change status/i })).toBeNull();
  });

  it('hides the Change status CTA for viewer role', () => {
    canPerformMock.mockReturnValueOnce(false);
    tagMock.mockReturnValue({ data: makeTag(), isLoading: false, error: null });
    render(wrap('AAAA'));
    expect(screen.queryByRole('button', { name: /change status/i })).toBeNull();
  });

  it('opens the change-status modal with operator-allowed options', () => {
    canPerformMock.mockReturnValue(true);
    tagMock.mockReturnValue({ data: makeTag(), isLoading: false, error: null });
    render(wrap('AAAA'));
    fireEvent.click(screen.getByRole('button', { name: /change status/i }));
    // The modal renders an info alert explaining the server-validated edges.
    expect(
      screen.getByText(/Status transitions are server-validated/i),
    ).toBeInTheDocument();
    // Apply is disabled until the operator picks a status.
    const applyBtn = screen.getByRole('button', { name: /apply change/i });
    expect(applyBtn).toBeDisabled();
  });

  it('submits PATCH with the picked status', async () => {
    canPerformMock.mockReturnValue(true);
    tagMock.mockReturnValue({ data: makeTag(), isLoading: false, error: null });
    updateMutateMock.mockResolvedValueOnce(makeTag({ status: TagResponse.status.RETIRED }));
    render(wrap('AAAA'));
    fireEvent.click(screen.getByRole('button', { name: /change status/i }));
    // Drive the AntD Select via its combobox role \u2014 jsdom doesn't render
    // the lazy dropdown portal reliably, but the combobox input accepts
    // change events that the Select hooks up to its onChange.
    const combobox = screen.getByRole('combobox');
    fireEvent.mouseDown(combobox);
    // The dropdown options render into a portal; wait for them.
    const option = await screen.findByText('Retired');
    fireEvent.click(option);
    fireEvent.click(screen.getByRole('button', { name: /apply change/i }));
    await waitFor(() => {
      expect(updateMutateMock).toHaveBeenCalledWith({
        tagId: '11111111-1111-1111-1111-111111111111',
        body: { status: 'retired' },
      });
    });
  });
});
