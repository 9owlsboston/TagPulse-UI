import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { DataExplorer } from '@/pages/telemetry/DataExplorer';

vi.mock('@/hooks/useDevices', () => ({
  useDevices: () => ({
    data: [{ id: '1', name: 'Reader-A' }],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useTagReads', () => ({
  useTagReads: () => ({
    data: [
      { id: 'r1', device_id: '1', tag_id: 'TAG-001', timestamp: '2026-04-25T10:00:00Z', signal_strength: -50, sensor_data: null, created_at: '2026-04-25T10:00:00Z' },
    ],
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

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DataExplorer', () => {
  it('renders the title', () => {
    render(<DataExplorer />, { wrapper });
    expect(screen.getByText('Data Explorer')).toBeInTheDocument();
  });

  it('renders tag read data in table', () => {
    render(<DataExplorer />, { wrapper });
    expect(screen.getByText('TAG-001')).toBeInTheDocument();
  });

  it('renders export CSV button', () => {
    render(<DataExplorer />, { wrapper });
    expect(screen.getByText('Export CSV')).toBeInTheDocument();
  });

  it('renders view mode toggle', () => {
    render(<DataExplorer />, { wrapper });
    expect(screen.getByText('Table')).toBeInTheDocument();
    expect(screen.getByText('Chart')).toBeInTheDocument();
  });
});
