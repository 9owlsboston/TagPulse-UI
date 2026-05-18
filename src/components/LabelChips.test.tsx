import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import AntApp from 'antd/es/app';
import { LabelChips } from '@/components/LabelChips';

const mockAssociate = vi.fn();
const mockDisassociate = vi.fn();
let mockRole: 'viewer' | 'editor' | 'admin' = 'editor';

vi.mock('@/hooks/useLabels', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useLabels')>(
    '@/hooks/useLabels',
  );
  return {
    ...actual,
    useEntityLabels: () => ({
      data: [
        {
          label_id: 'l1',
          entity_id: 'a1',
          entity_type: 'asset',
          key: 'priority',
          value: 'high',
          color: '#ff4d4f',
          created_by: null,
          created_at: '2026-05-01T00:00:00Z',
        },
        {
          label_id: 'l2',
          entity_id: 'a1',
          entity_type: 'asset',
          key: 'team',
          value: 'logistics',
          color: null,
          created_by: null,
          created_at: '2026-05-01T00:00:00Z',
        },
      ],
      isLoading: false,
    }),
    useLabels: () => ({
      data: [
        {
          id: 'cat-1',
          tenant_id: 't',
          entity_type: 'asset',
          key: 'priority',
          color: '#ff4d4f',
          created_by: null,
          updated_by: null,
          created_at: '2026-05-01T00:00:00Z',
          updated_at: '2026-05-01T00:00:00Z',
        },
        {
          id: 'cat-2',
          tenant_id: 't',
          entity_type: 'asset',
          key: 'team',
          color: null,
          created_by: null,
          updated_by: null,
          created_at: '2026-05-01T00:00:00Z',
          updated_at: '2026-05-01T00:00:00Z',
        },
      ],
      isLoading: false,
    }),
    useAssociateLabel: () => ({ mutateAsync: mockAssociate, isPending: false }),
    useDisassociateLabel: () => ({
      mutateAsync: mockDisassociate,
      isPending: false,
    }),
  };
});

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ role: mockRole, tenantId: 't' }),
}));

function wrap(node: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AntApp>{node}</AntApp>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('LabelChips', () => {
  beforeEach(() => {
    mockRole = 'editor';
    mockAssociate.mockReset();
    mockDisassociate.mockReset();
  });

  it('renders existing associations as chips with key:value', () => {
    render(wrap(<LabelChips entityType="asset" entityId="a1" />));
    expect(screen.getByTestId('label-chips')).toBeInTheDocument();
    // Two chips, formatted as "<strong>key</strong>: value".
    expect(screen.getByTestId('label-chip-priority')).toHaveTextContent('priority: high');
    expect(screen.getByTestId('label-chip-team')).toHaveTextContent('team: logistics');
  });

  it('shows the + Add label button for editor and admin', () => {
    render(wrap(<LabelChips entityType="asset" entityId="a1" />));
    expect(screen.getByTestId('label-chip-add')).toBeInTheDocument();
  });

  it('hides the + Add label button and removes close icons for viewers', () => {
    mockRole = 'viewer';
    render(wrap(<LabelChips entityType="asset" entityId="a1" />));
    expect(screen.queryByTestId('label-chip-add')).not.toBeInTheDocument();
    // Closable chips render their X as a span with aria-label="close"; absent
    // for viewers.
    expect(screen.queryByLabelText('close')).not.toBeInTheDocument();
  });

  it('calls associate.mutateAsync with the submitted key/value pair', async () => {
    mockAssociate.mockResolvedValue({});
    render(wrap(<LabelChips entityType="asset" entityId="a1" />));
    fireEvent.click(screen.getByTestId('label-chip-add'));
    // Popover form mounts asynchronously. AntD `<AutoComplete>` renders
    // a wrapper around the actual <input>, so the testid lands on the
    // wrapper — grab the inner <input> to fire change on.
    const keyWrapper = await screen.findByTestId('label-key-input');
    const keyInput = keyWrapper.querySelector('input') ?? keyWrapper;
    fireEvent.change(keyInput, { target: { value: 'priority' } });
    const valueWrapper = screen.getByTestId('label-value-input');
    const valueInput = valueWrapper.querySelector('input') ?? valueWrapper;
    fireEvent.change(valueInput, { target: { value: 'low' } });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));
    await waitFor(() =>
      expect(mockAssociate).toHaveBeenCalledWith({ key: 'priority', value: 'low' }),
    );
  });

  it('calls disassociate.mutateAsync when a chip is closed', async () => {
    mockDisassociate.mockResolvedValue(undefined);
    render(wrap(<LabelChips entityType="asset" entityId="a1" />));
    // Click the X on the priority chip — AntD renders it as a tag-close
    // span with the role="img" + aria-label="close" semantics.
    const chip = screen.getByTestId('label-chip-priority');
    const closeBtn = chip.querySelector('.ant-tag-close-icon');
    expect(closeBtn).not.toBeNull();
    fireEvent.click(closeBtn!);
    await waitFor(() => expect(mockDisassociate).toHaveBeenCalledWith('l1'));
  });
});
