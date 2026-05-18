import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import AntApp from 'antd/es/app';
import { useState } from 'react';
import {
  PendingLabelPicker,
  attachPendingLabels,
  type PendingLabel,
} from '@/components/PendingLabelPicker';

let mockRole: 'viewer' | 'editor' | 'admin' = 'editor';

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
          entity_type: 'asset',
          key: 'priority',
          color: '#ff4d4f',
          created_by: null,
          updated_by: null,
          created_at: '2026-05-01T00:00:00Z',
          updated_at: '2026-05-01T00:00:00Z',
        },
      ],
      isLoading: false,
    }),
  };
});

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ role: mockRole, tenantId: 't' }),
}));

const mockAssociate = vi.fn();
vi.mock('@/api/generated/services/LabelsService', () => ({
  LabelsService: {
    associateLabelEntitySegmentEntityIdLabelsPost: (...args: unknown[]) =>
      mockAssociate(...args),
  },
}));

function Harness({ initial = [] as PendingLabel[] }) {
  const [value, setValue] = useState<PendingLabel[]>(initial);
  return (
    <>
      <PendingLabelPicker entityType="asset" value={value} onChange={setValue} />
      <div data-testid="json">{JSON.stringify(value)}</div>
    </>
  );
}

function wrap(node: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <AntApp>{node}</AntApp>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('PendingLabelPicker', () => {
  beforeEach(() => {
    mockRole = 'editor';
    mockAssociate.mockReset();
  });

  it('renders the Add chip for editors', () => {
    wrap(<Harness />);
    expect(screen.getByTestId('pending-label-chip-add')).toBeInTheDocument();
  });

  it('hides itself for viewers', () => {
    mockRole = 'viewer';
    wrap(<Harness />);
    expect(screen.queryByTestId('pending-label-picker')).toBeNull();
  });

  it('queues a label and renders it as a chip', async () => {
    wrap(<Harness />);
    fireEvent.click(screen.getByTestId('pending-label-chip-add'));
    const keyWrapper = await screen.findByTestId('pending-label-key-input');
    const keyInput = keyWrapper.querySelector('input') ?? keyWrapper;
    fireEvent.change(keyInput, { target: { value: 'priority' } });
    const valueWrapper = screen.getByTestId('pending-label-value-input');
    const valueInput = valueWrapper.querySelector('input') ?? valueWrapper;
    fireEvent.change(valueInput, { target: { value: 'high' } });
    fireEvent.click(screen.getByRole('button', { name: /queue/i }));
    await waitFor(() =>
      expect(screen.getByTestId('pending-label-chip-priority')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('json').textContent).toContain('"priority"');
    expect(screen.getByTestId('json').textContent).toContain('"high"');
  });

  it('removes a queued label when the close X is clicked', async () => {
    wrap(<Harness initial={[{ key: 'priority', value: 'high' }]} />);
    expect(screen.getByTestId('pending-label-chip-priority')).toBeInTheDocument();
    const chip = screen.getByTestId('pending-label-chip-priority');
    const closeBtn = chip.querySelector('.ant-tag-close-icon');
    expect(closeBtn).not.toBeNull();
    fireEvent.click(closeBtn!);
    await waitFor(() =>
      expect(screen.queryByTestId('pending-label-chip-priority')).toBeNull(),
    );
  });

  it('rejects a duplicate (key, value) pair', async () => {
    wrap(<Harness initial={[{ key: 'priority', value: 'high' }]} />);
    fireEvent.click(screen.getByTestId('pending-label-chip-add'));
    const keyWrapper = await screen.findByTestId('pending-label-key-input');
    const keyInput = keyWrapper.querySelector('input') ?? keyWrapper;
    fireEvent.change(keyInput, { target: { value: 'priority' } });
    const valueWrapper = screen.getByTestId('pending-label-value-input');
    const valueInput = valueWrapper.querySelector('input') ?? valueWrapper;
    fireEvent.change(valueInput, { target: { value: 'high' } });
    fireEvent.click(screen.getByRole('button', { name: /queue/i }));
    // No second chip added; the JSON should still have exactly one entry.
    await waitFor(() => {
      const parsed = JSON.parse(screen.getByTestId('json').textContent ?? '[]');
      expect(parsed).toHaveLength(1);
    });
  });
});

describe('attachPendingLabels', () => {
  beforeEach(() => mockAssociate.mockReset());

  it('POSTs each pending label and returns ok count', async () => {
    mockAssociate.mockResolvedValue({});
    const result = await attachPendingLabels('asset', 'asset-1', [
      { key: 'priority', value: 'high' },
      { key: 'team', value: 'ops' },
    ]);
    expect(result.ok).toBe(2);
    expect(result.failed).toHaveLength(0);
    expect(mockAssociate).toHaveBeenCalledTimes(2);
    expect(mockAssociate).toHaveBeenNthCalledWith(1, 'assets', 'asset-1', {
      key: 'priority',
      value: 'high',
    });
    expect(mockAssociate).toHaveBeenNthCalledWith(2, 'assets', 'asset-1', {
      key: 'team',
      value: 'ops',
    });
  });

  it('separates successes from failures', async () => {
    mockAssociate
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('catalog miss'));
    const result = await attachPendingLabels('asset', 'asset-1', [
      { key: 'priority', value: 'high' },
      { key: 'unknown', value: 'x' },
    ]);
    expect(result.ok).toBe(1);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]?.label).toEqual({ key: 'unknown', value: 'x' });
  });

  it('translates entity_type to URL segment correctly', async () => {
    mockAssociate.mockResolvedValue({});
    await attachPendingLabels('category', 'cat-1', [{ key: 'k', value: 'v' }]);
    expect(mockAssociate).toHaveBeenCalledWith('categories', 'cat-1', {
      key: 'k',
      value: 'v',
    });
  });

  it('returns ok=0 on empty input without calling the API', async () => {
    const result = await attachPendingLabels('asset', 'asset-1', []);
    expect(result.ok).toBe(0);
    expect(result.failed).toHaveLength(0);
    expect(mockAssociate).not.toHaveBeenCalled();
  });
});
