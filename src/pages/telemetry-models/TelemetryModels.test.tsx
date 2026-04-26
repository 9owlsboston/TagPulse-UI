import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TelemetryModels } from '@/pages/telemetry-models/TelemetryModels';

vi.mock('@/hooks/useTelemetryModels', () => ({
  useTelemetryModels: () => ({
    data: [
      { id: '1', device_type: 'rfid_reader', metrics: [{ name: 'signal', unit: 'dBm' }], created_at: '2026-04-25T10:00:00Z', updated_at: '2026-04-25T10:00:00Z' },
    ],
    isLoading: false,
  }),
  useCreateTelemetryModel: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteTelemetryModel: () => ({ mutateAsync: vi.fn() }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('TelemetryModels', () => {
  it('renders the title', () => {
    render(<TelemetryModels />, { wrapper });
    expect(screen.getByText('Telemetry Models')).toBeInTheDocument();
  });

  it('renders device type in table', () => {
    render(<TelemetryModels />, { wrapper });
    expect(screen.getByText('rfid_reader')).toBeInTheDocument();
  });
});
