import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { DeviceRegister } from '@/pages/devices/DeviceRegister';

vi.mock('@/hooks/useDevices', () => ({
  useCreateDevice: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DeviceRegister', () => {
  it('renders the form', () => {
    render(<DeviceRegister />, { wrapper });
    expect(screen.getByText('Register Device')).toBeInTheDocument();
    expect(screen.getByText('Register')).toBeInTheDocument();
  });
});
