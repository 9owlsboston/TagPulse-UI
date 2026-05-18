import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import AntApp from 'antd/es/app';
import { LabelManagement } from '@/pages/admin/LabelManagement';

const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
let mockRole: 'viewer' | 'editor' | 'admin' = 'admin';

vi.mock('@/hooks/useLabels', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useLabels')>(
    '@/hooks/useLabels',
  );
  return {
    ...actual,
    useLabels: () => ({
      data: [
        {
          id: 'l1',
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
          id: 'l2',
          tenant_id: 't',
          entity_type: 'device',
          key: 'fleet',
          color: null,
          created_by: null,
          updated_by: null,
          created_at: '2026-05-02T00:00:00Z',
          updated_at: '2026-05-02T00:00:00Z',
        },
      ],
      isLoading: false,
    }),
    useCreateLabel: () => ({ mutateAsync: mockCreate, isPending: false }),
    useUpdateLabel: () => ({ mutateAsync: mockUpdate, isPending: false }),
    useDeleteLabel: () => ({ mutateAsync: mockDelete, isPending: false }),
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

describe('LabelManagement', () => {
  beforeEach(() => {
    mockRole = 'admin';
    mockCreate.mockReset();
    mockUpdate.mockReset();
    mockDelete.mockReset();
  });

  it('renders the page title and New Label CTA for admins', () => {
    render(wrap(<LabelManagement />));
    expect(screen.getByText('Labels')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /new label/i }),
    ).toBeInTheDocument();
  });

  it('renders rows with key, friendly entity-type label and colour', () => {
    render(wrap(<LabelManagement />));
    expect(screen.getByText('priority')).toBeInTheDocument();
    expect(screen.getByText('Asset')).toBeInTheDocument();
    expect(screen.getByText('fleet')).toBeInTheDocument();
    expect(screen.getByText('Device')).toBeInTheDocument();
    // The colour cell renders the hex code as <Text code>.
    expect(screen.getByText('#ff4d4f')).toBeInTheDocument();
    expect(screen.getByText('default')).toBeInTheDocument();
  });

  it('opens the edit modal with the entity type rendered disabled (ADR 020)', () => {
    render(wrap(<LabelManagement />));
    fireEvent.click(
      screen.getByRole('button', { name: /edit label priority/i }),
    );
    expect(screen.getByText(/edit label — priority/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /entity type is immutable per adr 020\. to change, delete and recreate\./i,
      ),
    ).toBeInTheDocument();
  });

  it('renders the admin-only guard when the user is not an admin', () => {
    mockRole = 'viewer';
    render(wrap(<LabelManagement />));
    expect(screen.getByText(/label management is admin-only/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /new label/i })).not.toBeInTheDocument();
  });
});
