import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuditLog } from '@/pages/admin/AuditLog';

const listMock = vi.fn();

vi.mock('@/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/api/client')>('@/api/client');
  return {
    ...actual,
    auditLogsApi: {
      list: (...args: unknown[]) => listMock(...args),
    },
  };
});

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const sampleEntries = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    user_id: '11111111-1111-1111-1111-111111111111',
    action: 'device.token_rotated',
    resource_type: 'device',
    resource_id: '22222222-2222-2222-2222-222222222222',
    changes: { reason: 'scheduled' },
    created_at: '2026-05-01T12:00:00Z',
  },
];

describe('AuditLog', () => {
  beforeEach(() => {
    listMock.mockReset();
    listMock.mockResolvedValue(sampleEntries);
  });

  it('renders title and default preset (all)', async () => {
    render(<AuditLog />, { wrapper });
    expect(screen.getByText('Audit Log')).toBeInTheDocument();
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    // Default preset 'all' should NOT pass an actions filter.
    const firstCall = listMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(firstCall?.actions).toBeUndefined();
  });

  it('switching to "Device security events" filters via comma-separated actions', async () => {
    render(<AuditLog />, { wrapper });
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByText('Device security events'));

    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));
    const lastCall = listMock.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(lastCall?.actions).toBe(
      'device.token_rotated,device.cert_attached,device.approved,device.rejected',
    );
  });

  it('renders the action tag for a returned entry', async () => {
    render(<AuditLog />, { wrapper });
    await waitFor(() =>
      expect(screen.getByText('device.token_rotated')).toBeInTheDocument(),
    );
  });
});
