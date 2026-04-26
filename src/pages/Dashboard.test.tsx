import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Dashboard } from '@/pages/Dashboard';

vi.mock('@/hooks/useDevices', () => ({
  useDevices: () => ({ data: [{ id: '1', name: 'Reader-1' }], isLoading: false }),
}));

vi.mock('@/hooks/useTagReads', () => ({
  useTagReads: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useAlerts', () => ({
  useAlerts: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useDeviceHealth', () => ({
  useDeviceHealthList: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useAnalytics', () => ({
  useReadFrequency: () => ({ data: [], isLoading: false }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('Dashboard', () => {
  it('renders the title', () => {
    render(<Dashboard />, { wrapper });
    expect(screen.getByText('TagPulse Dashboard')).toBeInTheDocument();
  });

  it('renders KPI tiles', () => {
    render(<Dashboard />, { wrapper });
    expect(screen.getByText('Total Devices')).toBeInTheDocument();
    expect(screen.getByText('Reads Today')).toBeInTheDocument();
    expect(screen.getByText('Open Alerts')).toBeInTheDocument();
    expect(screen.getByText('Anomalies')).toBeInTheDocument();
  });

  it('renders recent alerts section', () => {
    render(<Dashboard />, { wrapper });
    expect(screen.getByText('Recent Alerts')).toBeInTheDocument();
  });

  it('renders device health section', () => {
    render(<Dashboard />, { wrapper });
    expect(screen.getByText('Device Health')).toBeInTheDocument();
  });
});
