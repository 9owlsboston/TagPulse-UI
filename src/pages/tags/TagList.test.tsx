import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TagList } from '@/pages/tags/TagList';
import { TagResponse } from '@/api/generated/models/TagResponse';

const navigateSpy = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateSpy };
});

const tagsMock = vi.fn();
vi.mock('@/hooks/useTags', () => ({
  useTags: (params: unknown) => tagsMock(params),
  TAGS_QUERY_KEY: 'tags',
}));

function makeRow(overrides: Partial<TagResponse> = {}): TagResponse {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    tenant_id: 't',
    epc_hex: 'AABBCCDDEEFF00112233445566778899',
    gs1_uri: null,
    status: TagResponse.status.ACTIVE,
    source: TagResponse.source.CSV_IMPORT,
    metadata_: null,
    first_seen_at: '2026-05-01T00:00:00Z',
    last_seen_at: '2026-05-22T12:00:00Z',
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-22T12:00:00Z',
    ...overrides,
  };
}

function wrap(node: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('TagList', () => {
  it('renders the page title and the registry helper copy', () => {
    tagsMock.mockReturnValue({ data: [], isLoading: false, isFetching: false });
    render(wrap(<TagList />));
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText(/Tag registry \(ADR 028\)/i)).toBeInTheDocument();
    // The `tag_known=NULL` design-doc decision is reflected in the helper copy.
    expect(screen.getByText(/Reads pending classification do not appear here/i)).toBeInTheDocument();
  });

  it('renders rows with EPC, status colour and source label', () => {
    tagsMock.mockReturnValue({
      data: [
        makeRow({ epc_hex: 'AAAA0000', status: TagResponse.status.ACTIVE }),
        makeRow({
          id: '22222222-2222-2222-2222-222222222222',
          epc_hex: 'BBBB0000',
          status: TagResponse.status.RETIRED,
          source: TagResponse.source.API,
        }),
      ],
      isLoading: false,
      isFetching: false,
    });
    render(wrap(<TagList />));
    expect(screen.getByText('AAAA0000')).toBeInTheDocument();
    expect(screen.getByText('BBBB0000')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('retired')).toBeInTheDocument();
    expect(screen.getByText('CSV import')).toBeInTheDocument();
    expect(screen.getByText('API')).toBeInTheDocument();
  });

  it('navigates to the detail page when an EPC cell is clicked', () => {
    tagsMock.mockReturnValue({
      data: [makeRow({ epc_hex: 'CAFEBABE' })],
      isLoading: false,
      isFetching: false,
    });
    render(wrap(<TagList />));
    fireEvent.click(screen.getByText('CAFEBABE'));
    expect(navigateSpy).toHaveBeenCalledWith('/tags/CAFEBABE');
  });

  it('forwards binding filter changes into the query params and resets paging', () => {
    tagsMock.mockReturnValue({ data: [], isLoading: false, isFetching: false });
    render(wrap(<TagList />));
    // Initial call carries no bound filter, offset=0.
    const firstCall = tagsMock.mock.calls.at(-1)?.[0] as { bound?: boolean; offset?: number };
    expect(firstCall.bound).toBeUndefined();
    expect(firstCall.offset).toBe(0);

    // Segmented control renders real <label>/<input> elements that are
    // easy to click \u2014 unlike the AntD Select dropdown which lazy-mounts
    // its options outside the test container.
    fireEvent.click(screen.getByText('Unbound'));
    const lastCall = tagsMock.mock.calls.at(-1)?.[0] as { bound?: boolean; offset?: number };
    expect(lastCall.bound).toBe(false);
    expect(lastCall.offset).toBe(0);
  });

  it('shows an empty-state hint when no filter is active', () => {
    tagsMock.mockReturnValue({ data: [], isLoading: false, isFetching: false });
    render(wrap(<TagList />));
    expect(screen.getByText(/No tags registered yet/i)).toBeInTheDocument();
  });
});
