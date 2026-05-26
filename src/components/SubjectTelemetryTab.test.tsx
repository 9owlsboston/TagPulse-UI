import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { SubjectTelemetryTab } from '@/components/SubjectTelemetryTab';

vi.mock('@/hooks/useTenantConfig', () => ({
  useTenantConfig: () => ({
    data: { telemetry_subject_kinds: ['asset'] },
  }),
}));

vi.mock('@/hooks/useTelemetry', () => ({
  useSubjectTelemetry: () => ({
    data: [
      { timestamp: '2026-04-25T10:00:00Z', metric_value: 12.5 },
      { timestamp: '2026-04-25T11:00:00Z', metric_value: 13.0 },
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

const LATEST = [{ metric_name: 'temperature', unit: 'C' }] as never;

describe('SubjectTelemetryTab', () => {
  it('renders chart with export buttons when opted-in', () => {
    render(
      <SubjectTelemetryTab subjectKind="asset" subjectId="asset-1" latest={LATEST} />,
      { wrapper },
    );
    expect(screen.getByTestId('tp-line-chart-export-png')).toBeInTheDocument();
    expect(screen.getByTestId('tp-line-chart-export-csv')).toBeInTheDocument();
  });

  it('warns when subject kind is not opted in', () => {
    render(
      <SubjectTelemetryTab subjectKind="lot" subjectId="lot-1" latest={LATEST} />,
      { wrapper },
    );
    expect(screen.getByText(/not enabled for "lot"/)).toBeInTheDocument();
  });
});
