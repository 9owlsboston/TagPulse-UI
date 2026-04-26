import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UsageDashboard } from '@/pages/admin/UsageDashboard';

vi.mock('@/hooks/useUsage', () => ({
  useUsage: () => ({
    data: [
      { tenant_id: 't1', usage_date: '2026-04-25T00:00:00Z', dimension: 'api_read', quantity: 500, unit: 'requests' },
    ],
    isLoading: false,
  }),
  useUsageSummary: () => ({
    data: [
      { tenant_id: 't1', dimension: 'api_read', total_quantity: 5000, unit: 'requests' },
    ],
    isLoading: false,
  }),
}));

// Mock recharts to avoid canvas rendering issues in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('UsageDashboard', () => {
  it('renders the title', () => {
    render(<UsageDashboard />, { wrapper });
    expect(screen.getByText('Usage & Billing')).toBeInTheDocument();
  });

  it('renders summary table', () => {
    render(<UsageDashboard />, { wrapper });
    expect(screen.getByText('api_read')).toBeInTheDocument();
  });
});
