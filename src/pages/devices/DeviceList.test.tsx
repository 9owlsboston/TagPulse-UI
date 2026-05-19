import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import AntApp from 'antd/es/app';
import { DeviceList } from '@/pages/devices/DeviceList';

const useDevicesMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useDevices', () => ({
  useDevices: useDevicesMock,
}));

// Sprint 38 / #40 — populate the label catalog so `<LabelFilterStrip/>`
// renders the dashed "Filter by label" tag (otherwise the strip self-hides
// when the catalog query resolves empty).
vi.mock('@/hooks/useLabels', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useLabels')>(
    '@/hooks/useLabels',
  );
  return {
    ...actual,
    useLabels: () => ({
      data: [
        {
          id: 'cat-1',
          tenant_id: 't',
          entity_type: 'device',
          key: 'site',
          color: null,
          created_by: null,
          updated_by: null,
          created_at: '2026-05-01T00:00:00Z',
          updated_at: '2026-05-01T00:00:00Z',
        },
      ],
    }),
  };
});

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AntApp>{children}</AntApp>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DeviceList', () => {
  beforeEach(() => {
    useDevicesMock.mockReset();
    useDevicesMock.mockReturnValue({
      data: [
        { id: '1', name: 'Reader-A', device_type: 'rfid_reader', status: 'active', connection_state: 'online', last_seen: '2026-04-25T10:00:00Z' },
      ],
      isLoading: false,
    });
  });

  it('renders the title', () => {
    render(<DeviceList />, { wrapper });
    expect(screen.getByText('Devices')).toBeInTheDocument();
  });

  it('renders device name in table', () => {
    render(<DeviceList />, { wrapper });
    expect(screen.getByText('Reader-A')).toBeInTheDocument();
  });

  // Sprint 38 / #40 — page-level integration coverage for the label
  // filter; Sprint 43 — the strip moved into the side <FilterPanel/>,
  // so the test now opens the panel, adds the chip into pending state,
  // and commits via Apply before asserting the next useDevices call.
  it('adding a label chip via the filter panel re-calls useDevices with labels param', async () => {
    render(<DeviceList />, { wrapper });

    // Initial call: no labels.
    expect(useDevicesMock).toHaveBeenCalledWith(
      expect.objectContaining({ labels: {} }),
    );

    fireEvent.click(screen.getByTestId('device-list-filters-toggle'));
    await waitFor(() => screen.getByTestId('device-list-filter-panel'));

    fireEvent.click(screen.getByTestId('label-filter-add-tag'));
    await waitFor(() => screen.getByTestId('label-filter-popover'));

    const keyWrapper = screen.getByTestId('label-filter-key-input');
    const keyInput = keyWrapper.querySelector('input') ?? keyWrapper;
    fireEvent.change(keyInput, { target: { value: 'site' } });

    const valueInput = screen.getByTestId('label-filter-value-input');
    fireEvent.change(valueInput, { target: { value: 'east' } });

    fireEvent.click(screen.getByTestId('label-filter-add-btn'));

    // Deferred-apply UX: clicking Add wires the chip into pending state,
    // but useDevices isn't re-called until Apply commits it up.
    fireEvent.click(screen.getByTestId('device-list-filter-panel-apply'));

    await waitFor(() => {
      expect(useDevicesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ labels: { site: ['east'] } }),
      );
    });
  });

  // Sprint 43 — the device label filter card has no Categories section
  // (showCategories={false}), since devices don't carry categories.
  it('filter panel hides the Categories card for devices', async () => {
    render(<DeviceList />, { wrapper });
    fireEvent.click(screen.getByTestId('device-list-filters-toggle'));
    await waitFor(() => screen.getByTestId('device-list-filter-panel'));
    expect(screen.queryByTestId('device-list-filter-panel-categories')).toBeNull();
    expect(screen.getByTestId('device-list-filter-panel-labels')).toBeInTheDocument();
  });
});
