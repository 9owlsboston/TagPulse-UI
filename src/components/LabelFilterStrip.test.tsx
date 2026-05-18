import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AntApp from 'antd/es/app';
import { LabelFilterStrip } from '@/components/LabelFilterStrip';
import type { LabelFilter } from '@/lib/labelFilter';

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
        {
          id: 'cat-2',
          tenant_id: 't',
          entity_type: 'asset',
          key: 'team',
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

function Harness({ initial = {} }: { initial?: LabelFilter }) {
  const [value, setValue] = useState<LabelFilter>(initial);
  return (
    <>
      <LabelFilterStrip entityType="asset" value={value} onChange={setValue} />
      <div data-testid="json">{JSON.stringify(value)}</div>
    </>
  );
}

function renderHarness(initial: LabelFilter = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AntApp>
        <Harness initial={initial} />
      </AntApp>
    </QueryClientProvider>,
  );
}

describe('LabelFilterStrip', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the dashed "+ Filter by label" tag when empty', () => {
    renderHarness({});
    expect(screen.getByTestId('label-filter-add-tag')).toBeInTheDocument();
    expect(screen.queryByTestId('label-filter-clear')).not.toBeInTheDocument();
  });

  it('opens popover and adds a filter', async () => {
    renderHarness({});
    fireEvent.click(screen.getByTestId('label-filter-add-tag'));
    await waitFor(() => screen.getByTestId('label-filter-popover'));

    const keyWrapper = screen.getByTestId('label-filter-key-input');
    const keyInput = keyWrapper.querySelector('input') ?? keyWrapper;
    fireEvent.change(keyInput, { target: { value: 'priority' } });

    const valueInput = screen.getByTestId('label-filter-value-input');
    fireEvent.change(valueInput, { target: { value: 'high' } });

    fireEvent.click(screen.getByTestId('label-filter-add-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('json').textContent).toContain('"priority":["high"]');
    });
    expect(screen.getByTestId('label-filter-chip-priority-high')).toBeInTheDocument();
    expect(screen.getByTestId('label-filter-clear')).toBeInTheDocument();
  });

  it('renders existing filters as chips grouped by key', () => {
    renderHarness({ priority: ['high', 'low'], team: ['logistics'] });
    expect(screen.getByTestId('label-filter-chip-priority-high')).toBeInTheDocument();
    expect(screen.getByTestId('label-filter-chip-priority-low')).toBeInTheDocument();
    expect(screen.getByTestId('label-filter-chip-team-logistics')).toBeInTheDocument();
  });

  it('removing the last value of a key removes the key group', () => {
    renderHarness({ priority: ['high'] });
    const chip = screen.getByTestId('label-filter-chip-priority-high');
    const closeIcon = chip.querySelector('.ant-tag-close-icon') as HTMLElement;
    expect(closeIcon).toBeTruthy();
    fireEvent.click(closeIcon);
    expect(screen.queryByTestId('label-filter-group-priority')).not.toBeInTheDocument();
    expect(screen.getByTestId('json').textContent).toBe('{}');
  });

  it('"Remove key" X drops the whole key group', () => {
    renderHarness({ priority: ['high', 'low'] });
    fireEvent.click(screen.getByTestId('label-filter-remove-key-priority'));
    expect(screen.queryByTestId('label-filter-group-priority')).not.toBeInTheDocument();
    expect(screen.getByTestId('json').textContent).toBe('{}');
  });

  it('Clear wipes everything', () => {
    renderHarness({ priority: ['high'], team: ['logistics'] });
    fireEvent.click(screen.getByTestId('label-filter-clear'));
    expect(screen.getByTestId('json').textContent).toBe('{}');
  });

  it('rejects invalid value characters', async () => {
    renderHarness({});
    fireEvent.click(screen.getByTestId('label-filter-add-tag'));
    await waitFor(() => screen.getByTestId('label-filter-popover'));

    const keyWrapper = screen.getByTestId('label-filter-key-input');
    const keyInput = keyWrapper.querySelector('input') ?? keyWrapper;
    fireEvent.change(keyInput, { target: { value: 'priority' } });

    const valueInput = screen.getByTestId('label-filter-value-input');
    fireEvent.change(valueInput, { target: { value: 'has space' } });

    fireEvent.click(screen.getByTestId('label-filter-add-btn'));

    // Nothing committed
    expect(screen.getByTestId('json').textContent).toBe('{}');
  });

  it('prevents duplicate key/value combinations', async () => {
    renderHarness({ priority: ['high'] });
    fireEvent.click(screen.getByTestId('label-filter-add-tag'));
    await waitFor(() => screen.getByTestId('label-filter-popover'));

    const keyWrapper = screen.getByTestId('label-filter-key-input');
    const keyInput = keyWrapper.querySelector('input') ?? keyWrapper;
    fireEvent.change(keyInput, { target: { value: 'priority' } });

    const valueInput = screen.getByTestId('label-filter-value-input');
    fireEvent.change(valueInput, { target: { value: 'high' } });

    fireEvent.click(screen.getByTestId('label-filter-add-btn'));

    // Still a single high entry
    expect(screen.getByTestId('json').textContent).toBe('{"priority":["high"]}');
  });
});
