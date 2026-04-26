import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { DeviceList } from '@/pages/devices/DeviceList';

vi.mock('@/hooks/useDevices', () => ({
  useDevices: () => ({
    data: [
      { id: '1', name: 'Reader-A', device_type: 'rfid_reader', status: 'active', connection_state: 'online', last_seen: '2026-04-25T10:00:00Z' },
    ],
    isLoading: false,
  }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DeviceList', () => {
  it('renders the title', () => {
    render(<DeviceList />, { wrapper });
    expect(screen.getByText('Devices')).toBeInTheDocument();
  });

  it('renders device name in table', () => {
    render(<DeviceList />, { wrapper });
    expect(screen.getByText('Reader-A')).toBeInTheDocument();
  });
});
