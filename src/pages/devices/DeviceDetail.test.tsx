import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DeviceDetail } from '@/pages/devices/DeviceDetail';

vi.mock('@/hooks/useDevices', () => ({
  useDevice: () => ({
    data: {
      id: '1',
      name: 'Reader-A',
      device_type: 'rfid_reader',
      status: 'active',
      connection_state: 'online',
      firmware_version: '1.2.0',
      last_seen: '2026-04-25T10:00:00Z',
      metadata: { location: 'warehouse' },
      configuration: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-04-25T10:00:00Z',
    },
    isLoading: false,
  }),
  useDecommissionDevice: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRotateDeviceToken: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAttachDeviceCert: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateDevice: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const { mockReads } = vi.hoisted(() => ({ mockReads: { current: [] as unknown[] } }));

vi.mock('@/hooks/useTagReads', () => ({
  useRecentReads: () => ({ data: mockReads.current, isLoading: false }),
}));

vi.mock('@/hooks/useDeviceHealth', () => ({
  useDeviceHealth: () => ({
    data: { device_id: '1', name: 'Reader-A', status: 'active', connection_state: 'online', last_seen: '2026-04-25T10:00:00Z', reads_last_hour: 42, error_rate: 0.01 },
    isLoading: false,
  }),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
}));

// Sprint 13 added a RoleGuard around the Decommission button. Provide an admin
// auth context so the button renders in tests.
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    role: 'admin',
    user: { id: 'u1', email: 'a@example.com', name: 'A', role: 'admin', tenant_id: 't1', tenant_name: 't' },
    tenantId: 't1',
    accessToken: 'tok',
    isAuthenticated: true,
    loginWithApiKey: vi.fn(),
    loginWithTenantId: vi.fn(),
    logout: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/devices/1']}>
        <Routes>
          <Route path="/devices/:id" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DeviceDetail', () => {
  it('renders the device name', () => {
    render(<DeviceDetail />, { wrapper });
    expect(screen.getAllByText('Reader-A').length).toBeGreaterThan(0);
  });

  it('renders tab labels', () => {
    render(<DeviceDetail />, { wrapper });
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Telemetry')).toBeInTheDocument();
    expect(screen.getByText('Health')).toBeInTheDocument();
    expect(screen.getByText('Heartbeat')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
  });

  it('renders decommission button for active device', () => {
    render(<DeviceDetail />, { wrapper });
    expect(screen.getByText('Decommission')).toBeInTheDocument();
  });

  it('renders rotate token button on Security tab', () => {
    render(<DeviceDetail />, { wrapper });
    fireEvent.click(screen.getByText('Security'));
    expect(screen.getByText('Rotate token')).toBeInTheDocument();
  });

  it('renders recent reads with a bound-asset link (Sprint 74)', () => {
    mockReads.current = [
      {
        id: 'r1',
        device_id: '1',
        tag_id: 'TAG-1',
        timestamp: '2026-04-25T10:00:00Z',
        signal_strength: -50,
        sensor_data: null,
        created_at: '2026-04-25T10:00:00Z',
        epc: 'urn:epc:sim:0006',
        reader_antenna: 0,
        asset: { id: 'a1', name: 'Pallet-7' },
      },
    ];
    render(<DeviceDetail />, { wrapper });
    expect(screen.getByText('Recent Reads')).toBeInTheDocument();
    expect(screen.getByText('Pallet-7')).toBeInTheDocument();
    mockReads.current = [];
  });
});
