import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { DeviceTelemetryTab } from '@/pages/devices/DeviceTelemetryTab';

vi.mock('@/hooks/useTelemetryModels', () => ({
  useTelemetryModels: () => ({
    data: [
      {
        device_type: 'rfid-reader',
        metrics: [{ name: 'temperature', unit: 'C' }],
      },
    ],
  }),
}));

vi.mock('@/hooks/useTelemetry', () => ({
  useDeviceTelemetry: () => ({
    data: [
      { timestamp: '2026-04-25T10:00:00Z', metric_value: 21.5, unit: 'C', metadata: {} },
      { timestamp: '2026-04-25T11:00:00Z', metric_value: 22.1, unit: 'C', metadata: {} },
    ],
    isLoading: false,
  }),
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
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DeviceTelemetryTab', () => {
  it('renders chart with export buttons wired', () => {
    render(<DeviceTelemetryTab deviceId="dev-1" deviceType="rfid-reader" />, { wrapper });
    expect(screen.getByTestId('tp-line-chart-export-png')).toBeInTheDocument();
    expect(screen.getByTestId('tp-line-chart-export-csv')).toBeInTheDocument();
  });

  it('renders empty state when model is missing', () => {
    render(<DeviceTelemetryTab deviceId="dev-1" deviceType="unknown-type" />, { wrapper });
    expect(screen.getByText(/No telemetry model defined/i)).toBeInTheDocument();
  });
});
