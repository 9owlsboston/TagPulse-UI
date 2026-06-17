import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TagReads } from '@/pages/telemetry/TagReads';
import type { TagReadResponse } from '@/types';

const SINGLE_ROW: TagReadResponse[] = [
  {
    id: 'r1',
    device_id: '1',
    tag_id: 'TAG-001',
    timestamp: '2026-04-25T10:00:00Z',
    signal_strength: -50,
    sensor_data: null,
    created_at: '2026-04-25T10:00:00Z',
  } as unknown as TagReadResponse,
];

// 600 synthetic rows — triggers VIRTUAL_ROW_THRESHOLD (500) in the page.
const LARGE_ROWS: TagReadResponse[] = Array.from({ length: 600 }, (_, i) => ({
  id: `r${i}`,
  device_id: '1',
  tag_id: `TAG-${String(i).padStart(4, '0')}`,
  timestamp: '2026-04-25T10:00:00Z',
  signal_strength: -50,
  sensor_data: null,
  created_at: '2026-04-25T10:00:00Z',
}) as unknown as TagReadResponse);

// 30 rows — paginated (≤ 500) but more than the default page size of 20, so
// the page-size changer is exercised.
const MID_ROWS: TagReadResponse[] = Array.from({ length: 30 }, (_, i) => ({
  id: `m${i}`,
  device_id: '1',
  tag_id: `TAG-${String(i).padStart(4, '0')}`,
  timestamp: '2026-04-25T10:00:00Z',
  signal_strength: -50,
  sensor_data: null,
  created_at: '2026-04-25T10:00:00Z',
}) as unknown as TagReadResponse);

let currentRows: TagReadResponse[] = SINGLE_ROW;

vi.mock('@/hooks/useDevices', () => ({
  useDevices: () => ({
    data: [{ id: '1', name: 'Reader-A' }],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useTagReads', () => ({
  useTagReads: () => ({
    data: currentRows,
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

describe('TagReads', () => {
  beforeEach(() => {
    currentRows = SINGLE_ROW;
  });

  it('renders the title', () => {
    render(<TagReads />, { wrapper });
    expect(screen.getByText('Tag Reads')).toBeInTheDocument();
  });

  it('renders tag read data in table', () => {
    render(<TagReads />, { wrapper });
    expect(screen.getByText('TAG-001')).toBeInTheDocument();
  });

  it('renders export rows CSV button in table view', () => {
    render(<TagReads />, { wrapper });
    expect(screen.getByTestId('tag-reads-export-rows-csv')).toBeInTheDocument();
  });

  it('renders view mode toggle', () => {
    render(<TagReads />, { wrapper });
    expect(screen.getByText('Table')).toBeInTheDocument();
    expect(screen.getByText('Chart')).toBeInTheDocument();
  });

  it('renders the has-location filter and EPC scheme selector', () => {
    render(<TagReads />, { wrapper });
    expect(screen.getByText('Has location')).toBeInTheDocument();
    expect(screen.getByText('EPC Scheme')).toBeInTheDocument();
  });

  it('offers an EPC (hex) column (config-driven visibility)', () => {
    // The raw-hex EPC column is addressable so tenants/users that prefer the
    // hex over the decoded URI can reveal it (and hide the URI) via config or
    // the column chooser. With no config in the test, it renders.
    render(<TagReads />, { wrapper });
    expect(screen.getByText('EPC (hex)')).toBeInTheDocument();
  });

  it('uses paginated table when rows ≤ 500', () => {
    render(<TagReads />, { wrapper });
    expect(screen.getByTestId('tag-reads-table-paginated')).toBeInTheDocument();
    expect(screen.queryByTestId('tag-reads-table-virtual')).not.toBeInTheDocument();
  });

  it('lets the page-size changer take effect (not controlled-locked at 20)', async () => {
    currentRows = MID_ROWS; // 30 rows → page 1 of 20 by default
    render(<TagReads />, { wrapper });
    // Default page size 20 → the 26th row (TAG-0025) is on page 2, not shown.
    expect(screen.getByText('TAG-0000')).toBeInTheDocument();
    expect(screen.queryByText('TAG-0025')).not.toBeInTheDocument();
    // Open the size changer and pick "100 / page".
    fireEvent.mouseDown(screen.getByText('20 / page'));
    fireEvent.click(await screen.findByText('100 / page'));
    // With 100/page all 30 rows render → TAG-0025 is now visible. A controlled
    // `pageSize` prop would have reverted the selection back to 20 (the bug).
    expect(await screen.findByText('TAG-0025')).toBeInTheDocument();
  });

  it('switches to virtual table when rows > 500', () => {
    currentRows = LARGE_ROWS;
    render(<TagReads />, { wrapper });
    expect(screen.getByTestId('tag-reads-table-virtual')).toBeInTheDocument();
    expect(screen.queryByTestId('tag-reads-table-paginated')).not.toBeInTheDocument();
  });

  it('exposes the chart wrapper export buttons in chart view', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    render(<TagReads />, { wrapper });
    // Toggle to Chart view via the Segmented control.
    await user.click(screen.getByText('Chart'));
    expect(screen.getByTestId('tp-line-chart-export-png')).toBeInTheDocument();
    expect(screen.getByTestId('tp-line-chart-export-csv')).toBeInTheDocument();
    // Table-mode CSV button must not be present in chart view.
    expect(screen.queryByTestId('tag-reads-export-rows-csv')).not.toBeInTheDocument();
  });

  // Sprint 60 (ADR-032 §6.3) — TID + User Memory are advanced (default-OFF).
  it('hides the TID and User Memory columns by default', () => {
    render(<TagReads />, { wrapper });
    expect(screen.queryByText('TID')).not.toBeInTheDocument();
    expect(screen.queryByText('User Memory')).not.toBeInTheDocument();
    // Non-plumbing columns stay visible.
    expect(screen.getByText('EPC')).toBeInTheDocument();
  });

  it('offers an Advanced columns toggle that reveals the plumbing columns', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    render(<TagReads />, { wrapper });
    const toggle = screen.getByTestId('tag-reads-advanced-columns-toggle');
    expect(toggle).toBeInTheDocument();
    await user.click(toggle);
    expect(screen.getByText('TID')).toBeInTheDocument();
    expect(screen.getByText('User Memory')).toBeInTheDocument();
  });

  it('hides the Advanced columns toggle in chart view', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    render(<TagReads />, { wrapper });
    await user.click(screen.getByText('Chart'));
    expect(
      screen.queryByTestId('tag-reads-advanced-columns-toggle'),
    ).not.toBeInTheDocument();
  });
});
