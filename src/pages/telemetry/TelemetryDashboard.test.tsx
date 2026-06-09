import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TelemetryDashboard } from '@/pages/telemetry/TelemetryDashboard';

vi.mock('@/hooks/useDevices', () => ({
  useDevices: () => ({
    data: [{ id: '1', name: 'Reader-A' }],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useTagReads', () => ({
  useReadsPerHour: () => ({
    data: [
      { bucket: '2026-04-25T10:00:00Z', device_id: '1', read_count: 50 },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/lib/sse', () => ({
  useSSE: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ tenantId: 'test-tenant', setTenantId: vi.fn(), logout: vi.fn() }),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  ReferenceLine: () => <div />,
  Brush: () => <div />,
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('TelemetryDashboard', () => {
  it('renders the title', () => {
    render(<TelemetryDashboard />, { wrapper });
    expect(screen.getByText('Telemetry')).toBeInTheDocument();
  });

  it('renders device selector', () => {
    render(<TelemetryDashboard />, { wrapper });
    expect(screen.getByText('All Devices')).toBeInTheDocument();
  });
});
